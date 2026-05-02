import { createClient } from '@supabase/supabase-js';

const CEO_EMAIL     = 'mclean@wildlifeuniverse.org';
const TEMP_PASSWORD = '1234567890';

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function run() {
  console.log('Connecting to:', process.env.NEXT_PUBLIC_SUPABASE_URL);

  // 1. Try to create the user fresh
  console.log('\n→ Attempting to create CEO user…');
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: CEO_EMAIL,
    password: TEMP_PASSWORD,
    email_confirm: true,
    user_metadata: { role: 'ceo' },
  });

  let userId;

  if (!createErr) {
    userId = created.user.id;
    console.log('✓ CEO user created. ID:', userId);
  } else {
    console.log('  Create failed:', createErr.message);
    console.log('→ User likely exists — searching for existing account…');

    // Paginate through all users to find the CEO
    let found = null;
    let page  = 1;
    while (!found) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error || !data?.users?.length) break;
      found = data.users.find((u) => u.email === CEO_EMAIL);
      if (data.users.length < 1000) break;
      page++;
    }

    if (!found) {
      console.error('✗ Could not find or create CEO user. Check your service role key and Supabase URL.');
      process.exit(1);
    }

    userId = found.id;
    console.log('✓ Found existing CEO. ID:', userId);

    // Reset password
    console.log('→ Resetting password to temp value…');
    const { error: pwErr } = await admin.auth.admin.updateUserById(userId, {
      password: TEMP_PASSWORD,
      email_confirm: true,
    });
    if (pwErr) {
      console.error('✗ Password reset failed:', pwErr.message);
      process.exit(1);
    }
    console.log('✓ Password reset to', TEMP_PASSWORD);
  }

  // 2. Upsert profile row
  console.log('→ Upserting profile row…');
  const { error: profileErr } = await admin.from('profiles').upsert({
    id:                     userId,
    email:                  CEO_EMAIL,
    name:                   'Mclean',
    role:                   'ceo',
    password_reset_required: true,
  }, { onConflict: 'id' });

  if (profileErr) {
    console.warn('  Profile upsert warning:', profileErr.message);
    console.warn('  (If column missing, run 003_password_reset.sql in Supabase SQL Editor)');
  } else {
    console.log('✓ Profile row upserted with role=ceo');
  }

  console.log('\n✅ Done. Login with:');
  console.log('   Email   :', CEO_EMAIL);
  console.log('   Password:', TEMP_PASSWORD);
  console.log('   You will be asked to set a new password on first sign-in.\n');
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
