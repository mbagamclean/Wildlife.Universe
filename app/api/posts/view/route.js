import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

export const runtime = 'nodejs';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

function todaySalt() {
  return new Date().toISOString().slice(0, 10);
}

function hashIp(ip) {
  if (!ip) return null;
  return createHash('sha256').update(`${ip}|${todaySalt()}`).digest('hex').slice(0, 32);
}

export async function POST(req) {
  let body = {};
  try { body = await req.json(); } catch {}
  const { slug, postId, sessionId } = body || {};
  if (!slug && !postId) {
    return NextResponse.json({ success: false, error: 'slug or postId required' }, { status: 400 });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || null;
  const userAgent = req.headers.get('user-agent') || null;
  const referrer = req.headers.get('referer') || null;

  const supabase = getServiceClient();

  // Resolve post_id from slug if needed (best-effort, don't block on failure)
  let resolvedId = postId || null;
  if (!resolvedId && slug) {
    const { data } = await supabase
      .from('posts')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    resolvedId = data?.id || null;
  }

  // Insert into post_views — gracefully no-op if table missing
  try {
    await supabase.from('post_views').insert({
      post_id: resolvedId,
      post_slug: slug || null,
      ip_hash: hashIp(ip),
      user_agent: userAgent ? userAgent.slice(0, 300) : null,
      referrer: referrer ? referrer.slice(0, 500) : null,
      session_id: sessionId || null,
    });
  } catch {
    // Migration not run yet — fall through to legacy counter bump only
  }

  // Best-effort legacy counter bump (existing posts.views integer).
  // If the table or function doesn't exist, ignore.
  if (resolvedId) {
    try {
      await supabase.rpc('increment_post_views', { p_id: resolvedId });
    } catch {
      // RPC not present — skip silently
    }
  }

  return NextResponse.json({ success: true });
}
