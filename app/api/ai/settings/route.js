import { createClient } from '@supabase/supabase-js';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

export const runtime = 'nodejs';

const ENC_KEY = scryptSync(
  process.env.AI_ENCRYPTION_KEY || 'wildlife-universe-default-key',
  'wusi-salt-v1',
  32
);

function encrypt(text) {
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', ENC_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decrypt(data) {
  try {
    const [ivHex, tagHex, encHex] = data.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const encrypted = Buffer.from(encHex, 'hex');
    const decipher = createDecipheriv('aes-256-gcm', ENC_KEY, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function ensureTable(admin) {
  await admin.rpc('run_sql', {
    sql: `CREATE TABLE IF NOT EXISTS ai_provider_settings (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      provider TEXT NOT NULL UNIQUE,
      api_key_encrypted TEXT,
      enabled BOOLEAN DEFAULT true,
      is_preferred BOOLEAN DEFAULT false,
      preferred_model TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );`
  }).catch(() => {});
}

export async function GET() {
  try {
    const admin = getAdmin();
    const { data, error } = await admin
      .from('ai_provider_settings')
      .select('provider, enabled, is_preferred, preferred_model, updated_at')
      .order('provider');
    if (error) throw error;

    const providers = ['claude', 'openai', 'gemini'];
    const result = providers.map((p) => {
      const found = data?.find((r) => r.provider === p);
      return {
        provider: p,
        enabled: found?.enabled ?? false,
        isPreferred: found?.is_preferred ?? false,
        preferredModel: found?.preferred_model ?? '',
        hasKey: !!found?.api_key_encrypted,
        updatedAt: found?.updated_at ?? null,
      };
    });
    return Response.json({ success: true, providers: result });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { provider, apiKey, enabled, isPreferred, preferredModel } = await req.json();
    if (!provider) return Response.json({ error: 'provider required' }, { status: 400 });

    const admin = getAdmin();

    const patch = {
      provider,
      enabled: enabled ?? true,
      is_preferred: isPreferred ?? false,
      preferred_model: preferredModel ?? '',
      updated_at: new Date().toISOString(),
    };
    if (apiKey) patch.api_key_encrypted = encrypt(apiKey);

    const { error } = await admin
      .from('ai_provider_settings')
      .upsert(patch, { onConflict: 'provider' });
    if (error) throw error;

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// Test connection
export async function PUT(req) {
  try {
    const { provider } = await req.json();
    const admin = getAdmin();
    const { data } = await admin
      .from('ai_provider_settings')
      .select('api_key_encrypted, preferred_model')
      .eq('provider', provider)
      .single();

    const key = data?.api_key_encrypted ? decrypt(data.api_key_encrypted) : null;
    if (!key) return Response.json({ success: false, error: 'No API key saved' });

    if (provider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (!res.ok) throw new Error(`OpenAI: ${res.status}`);
    } else if (provider === 'claude') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hi' }],
        }),
      });
      if (!res.ok && res.status !== 200) throw new Error(`Anthropic: ${res.status}`);
    }

    return Response.json({ success: true, message: 'Connection successful' });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 200 });
  }
}
