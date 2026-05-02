import { createBrowserClient } from '@supabase/ssr';

// Browser-only singleton — prevents multiple instances competing for the
// IndexedDB auth lock ("Lock was released because another request stole it").
// On the server (SSR pre-render) we skip the singleton so Node.js module
// cache doesn't leak one user's session into another request.
let _client = null;

export function createClient() {
  if (typeof window === 'undefined') {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );
  }
  if (!_client) {
    _client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );
  }
  return _client;
}
