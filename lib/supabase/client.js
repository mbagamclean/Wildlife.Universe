import { createBrowserClient } from '@supabase/ssr';

// Module-level singleton — one client instance for the whole browser session.
// Multiple instances compete for the same IndexedDB auth lock and cause
// "Lock was released because another request stole it" errors.
let _client = null;

export function createClient() {
  if (!_client) {
    _client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );
  }
  return _client;
}
