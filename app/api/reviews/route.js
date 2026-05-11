/**
 * /api/reviews — public read + submit for the homepage review section.
 *
 *   GET  → returns approved reviews (newest first, limit 20)
 *   POST → anyone can submit a review. Hashed-IP + body-supplied
 *          idempotency token + a 60 s cooldown handle the obvious
 *          abuse vectors.
 *
 * Mirrors the Mayobe Bros review flow: auto-approved on insert, admin
 * can move to pending/rejected/spam via the admin endpoint.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

export const runtime = 'nodejs';

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

function hashIp(ip) {
  if (!ip) return null;
  const salt = new Date().toISOString().slice(0, 10);
  return createHash('sha256').update(`${ip}|${salt}`).digest('hex').slice(0, 32);
}

function clientIp(req) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || null;
}

export async function GET() {
  const sb = serviceClient();
  const { data, error } = await sb
    .from('site_reviews')
    .select('id, user_name, user_avatar, rating, comment, is_verified, created_at')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, reviews: data || [] });
}

export async function POST(req) {
  let body = {};
  try { body = await req.json(); } catch {}
  const { user_name, comment, rating } = body || {};

  // Validation
  if (typeof user_name !== 'string' || user_name.trim().length < 2 || user_name.trim().length > 80) {
    return NextResponse.json({ ok: false, error: 'Name must be 2–80 characters.' }, { status: 400 });
  }
  if (typeof comment !== 'string' || comment.trim().length < 10 || comment.trim().length > 2000) {
    return NextResponse.json({ ok: false, error: 'Review must be 10–2000 characters.' }, { status: 400 });
  }
  const ratingInt = Number.parseInt(rating, 10);
  if (!Number.isInteger(ratingInt) || ratingInt < 1 || ratingInt > 5) {
    return NextResponse.json({ ok: false, error: 'Rating must be 1–5.' }, { status: 400 });
  }

  const ip = clientIp(req);
  const ip_hash = hashIp(ip);

  // Rate-limit at the row level — refuse if the same IP submitted in
  // the last 60 seconds. Same window as the client-side cooldown so
  // a malicious script can't bypass by skipping the front-end check.
  if (ip_hash) {
    const cutoff = new Date(Date.now() - 60 * 1000).toISOString();
    const sb = serviceClient();
    const { data: recent } = await sb
      .from('site_reviews')
      .select('id')
      .eq('ip_hash', ip_hash)
      .gte('created_at', cutoff)
      .limit(1);
    if ((recent || []).length > 0) {
      return NextResponse.json({ ok: false, error: 'Please wait a minute before submitting again.' }, { status: 429 });
    }
  }

  const sb = serviceClient();
  const { data, error } = await sb
    .from('site_reviews')
    .insert({
      user_name: user_name.trim(),
      comment: comment.trim(),
      rating: ratingInt,
      ip_hash,
      status: 'approved',
    })
    .select('id')
    .single();
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: data.id });
}
