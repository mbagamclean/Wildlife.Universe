import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const STAFF_ROLES = new Set(['ceo', 'editor', 'writer', 'admin']);

const LANG_CODES = {
  English: 'en',
  Spanish: 'es',
  French: 'fr',
  German: 'de',
  Portuguese: 'pt',
  Italian: 'it',
  Dutch: 'nl',
  Swahili: 'sw',
  Arabic: 'ar',
  'Chinese (Simplified)': 'zh-Hans',
  Japanese: 'ja',
  Korean: 'ko',
  Hindi: 'hi',
  Russian: 'ru',
  Turkish: 'tr',
};

function noStore(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

async function authStaff() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized', status: 401 };
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (!profile || !STAFF_ROLES.has(profile.role)) {
    return { error: 'Forbidden', status: 403 };
  }
  return { supabase, user };
}

// GET /api/admin/translations?postId=...  → list translations for a post
export async function GET(req) {
  const auth = await authStaff();
  if (auth.error) return noStore({ success: false, error: auth.error }, auth.status);

  const postId = new URL(req.url).searchParams.get('postId');
  if (!postId) return noStore({ success: false, error: 'postId required' }, 400);

  try {
    const { data, error } = await auth.supabase
      .from('post_translations')
      .select('id, target_language, translated_title, notes, provider, preserve_tone, created_at, updated_at')
      .eq('post_id', postId)
      .order('updated_at', { ascending: false });

    if (error) {
      // Table missing or RLS-blocked
      return noStore({
        success: false,
        error: 'translations_table_missing',
        message: 'Run migration 004_seo_extensions.sql to enable translation persistence.',
      }, 200);
    }

    return noStore({ success: true, translations: data || [] });
  } catch {
    return noStore({ success: false, error: 'translations_table_missing' }, 200);
  }
}

// POST /api/admin/translations
// body: { postId, targetLanguage, translatedTitle, translatedBody, notes, provider, preserveTone }
export async function POST(req) {
  const auth = await authStaff();
  if (auth.error) return noStore({ success: false, error: auth.error }, auth.status);

  let body = {};
  try { body = await req.json(); } catch {}
  const {
    postId,
    targetLanguage,
    translatedTitle = null,
    translatedBody,
    notes = null,
    provider = 'claude',
    preserveTone = true,
    sourceLanguage = 'English',
  } = body || {};

  if (!postId || !targetLanguage || !translatedBody) {
    return noStore({ success: false, error: 'postId, targetLanguage, translatedBody required' }, 400);
  }

  const targetCode = LANG_CODES[targetLanguage] || targetLanguage.toLowerCase().slice(0, 8);
  const sourceCode = LANG_CODES[sourceLanguage] || 'en';

  try {
    const { data, error } = await auth.supabase
      .from('post_translations')
      .upsert(
        {
          post_id: postId,
          source_language: sourceCode,
          target_language: targetCode,
          translated_title: translatedTitle,
          translated_body: translatedBody,
          notes,
          provider,
          preserve_tone: preserveTone,
          created_by: auth.user.id,
        },
        { onConflict: 'post_id,target_language' }
      )
      .select()
      .single();

    if (error) {
      return noStore({
        success: false,
        error: 'translations_table_missing',
        message: 'Run migration 004_seo_extensions.sql to enable translation persistence.',
        detail: error.message,
      }, 200);
    }

    return noStore({ success: true, translation: data });
  } catch (e) {
    return noStore({ success: false, error: e?.message || 'Save failed' }, 500);
  }
}
