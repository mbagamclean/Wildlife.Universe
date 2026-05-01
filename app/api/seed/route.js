import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SEED_POSTS, SEED_HEROES } from '@/lib/storage/seed';
import { categories as SEED_CATS } from '@/lib/mock/categories';

export const runtime = 'nodejs';

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req) {
  const { secret } = await req.json().catch(() => ({}));
  if (!secret || secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = {};

  // ── CEO user ────────────────────────────────────────────────────────────────
  try {
    const existing = await adminClient.auth.admin.listUsers();
    const ceoExists = existing.data?.users?.some((u) => u.email === 'ceo@wildlife.local');

    if (!ceoExists) {
      const { data: ceoUser, error } = await adminClient.auth.admin.createUser({
        email: 'ceo@wildlife.local',
        password: 'wildlife',
        email_confirm: true,
        user_metadata: { role: 'ceo' },
      });
      if (error) throw error;

      await adminClient.from('profiles').upsert({
        id: ceoUser.user.id,
        email: 'ceo@wildlife.local',
        name: 'CEO',
        role: 'ceo',
      });
      results.ceo = 'created';
    } else {
      // Ensure CEO profile has correct role
      const ceoAuth = existing.data.users.find((u) => u.email === 'ceo@wildlife.local');
      await adminClient.from('profiles').upsert({
        id: ceoAuth.id,
        email: 'ceo@wildlife.local',
        name: 'CEO',
        role: 'ceo',
      });
      results.ceo = 'already_exists';
    }
  } catch (err) {
    results.ceo = `error: ${err.message}`;
  }

  // ── Posts ────────────────────────────────────────────────────────────────────
  try {
    const dbPosts = SEED_POSTS.map(({ coverPalette, iucnStatus, createdAt, ...rest }) => ({
      ...rest,
      cover_palette: coverPalette || { from: '#0c4a1a', via: '#3aa15a', to: '#d4af37' },
      iucn_status: iucnStatus || null,
      created_at: createdAt || new Date().toISOString(),
    }));
    const { error } = await adminClient.from('posts').upsert(dbPosts, { onConflict: 'slug' });
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
    const { error } = await adminClient.from('heroes').upsert(dbHeroes, { onConflict: 'id' });
    if (error) throw error;
    results.heroes = `${dbHeroes.length} upserted`;
  } catch (err) {
    results.heroes = `error: ${err.message}`;
  }

  // ── Categories ───────────────────────────────────────────────────────────────
  try {
    const { error } = await adminClient.from('categories').upsert(
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
