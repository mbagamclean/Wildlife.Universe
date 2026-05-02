import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SEED_POSTS, SEED_HEROES } from '@/lib/storage/seed';
import { categories as SEED_CATS } from '@/lib/mock/categories';

export const runtime = 'nodejs';

const CEO_EMAIL    = 'mclean@wildlifeuniverse.org';
const TEMP_PASSWORD = '1234567890'; // first-login only — must be changed on first sign-in

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(req) {
  const { secret } = await req.json().catch(() => ({}));
  if (!secret || secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = getAdminClient();
  const results = {};

  // ── CEO user ────────────────────────────────────────────────────────────────
  try {
    const { data: existing } = await admin.auth.admin.listUsers();
    const ceoAuth = existing?.users?.find((u) => u.email === CEO_EMAIL);

    if (!ceoAuth) {
      const { data: created, error } = await admin.auth.admin.createUser({
        email: CEO_EMAIL,
        password: TEMP_PASSWORD,
        email_confirm: true,
        user_metadata: { role: 'ceo' },
      });
      if (error) throw error;

      await admin.from('profiles').upsert({
        id: created.user.id,
        email: CEO_EMAIL,
        name: 'Mclean',
        role: 'ceo',
        password_reset_required: true,
      });

      results.ceo = 'created';
    } else {
      // Reset to known temp password and require change on next login
      const { error: pwErr } = await admin.auth.admin.updateUserById(ceoAuth.id, {
        password: TEMP_PASSWORD,
      });
      if (pwErr) throw pwErr;

      await admin.from('profiles').upsert({
        id: ceoAuth.id,
        email: CEO_EMAIL,
        name: 'Mclean',
        role: 'ceo',
        password_reset_required: true,
      });

      results.ceo = 'reset';
    }
  } catch (err) {
    results.ceo = `error: ${err.message}`;
  }

  // ── Posts ────────────────────────────────────────────────────────────────────
  try {
    const dbPosts = SEED_POSTS.map(({ coverPalette, iucnStatus, createdAt, authorId, ...rest }) => ({
      ...rest,
      cover_palette: coverPalette || { from: '#0c4a1a', via: '#3aa15a', to: '#d4af37' },
      iucn_status:   iucnStatus   || null,
      created_at:    createdAt    || new Date().toISOString(),
      author_id:     authorId     || null,
    }));
    const { error } = await admin.from('posts').upsert(dbPosts, { onConflict: 'slug' });
    if (error) throw error;
    results.posts = `${dbPosts.length} upserted`;
  } catch (err) {
    results.posts = `error: ${err.message}`;
  }

  // ── Heroes ───────────────────────────────────────────────────────────────────
  try {
    const dbHeroes = SEED_HEROES.map(({ createdAt, ...rest }) => ({
      ...rest,
      created_at: createdAt || new Date().toISOString(),
    }));
    const { error } = await admin.from('heroes').upsert(dbHeroes, { onConflict: 'id' });
    if (error) throw error;
    results.heroes = `${dbHeroes.length} upserted`;
  } catch (err) {
    results.heroes = `error: ${err.message}`;
  }

  // ── Categories ───────────────────────────────────────────────────────────────
  try {
    const { error } = await admin.from('categories').upsert(
      SEED_CATS.map(({ slug, name, labels }) => ({ slug, name, labels })),
      { onConflict: 'slug' }
    );
    if (error) throw error;
    results.categories = `${SEED_CATS.length} upserted`;
  } catch (err) {
    results.categories = `error: ${err.message}`;
  }

  return NextResponse.json({ success: true, results });
}
