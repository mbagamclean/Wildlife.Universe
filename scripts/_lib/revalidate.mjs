/**
 * Fire-and-forget on-demand revalidation ping.
 *
 * Called from publish paths (cron-batch, recover-orphan-drafts, future
 * admin-side scripts) right after a new post lands as 'published'. Hits
 * /api/revalidate on the deployed site, which calls revalidatePath('/',
 * 'layout') to purge every cached route — Vercel's edge CDN included.
 *
 * Designed to NEVER block or fail the caller: any error here is logged
 * and swallowed, because a successful publish should still register even
 * if cache invalidation hiccups (the page will just stay stale until its
 * s-maxage window passes, ~30s with the current next.config).
 *
 * Required env:
 *   REVALIDATE_SECRET   — must match the one in the deployed Vercel env
 * Optional:
 *   REVALIDATE_URL      — defaults to https://www.wildlifeuniverse.org/api/revalidate
 */

const DEFAULT_URL = 'https://www.wildlifeuniverse.org/api/revalidate';

export async function pingRevalidate({ path, tag } = {}) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    console.warn('[revalidate] REVALIDATE_SECRET not set — skipping cache invalidation (page will be stale up to 30s)');
    return { ok: false, skipped: true, reason: 'no-secret' };
  }
  const base = process.env.REVALIDATE_URL || DEFAULT_URL;
  const u = new URL(base);
  if (path) u.searchParams.set('path', path);
  if (tag) u.searchParams.set('tag', tag);

  try {
    const res = await fetch(u.toString(), {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}` },
      // Keep this snappy — we don't want a slow revalidate endpoint to
      // hold the cron worker. The actual revalidatePath() call is
      // near-instant; if the server takes >10s something else is wrong.
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const text = (await res.text()).slice(0, 200);
      console.warn(`[revalidate] ping failed HTTP ${res.status}: ${text}`);
      return { ok: false, status: res.status };
    }
    console.log(`[revalidate] ✓ cache purged${path ? ` (path=${path})` : tag ? ` (tag=${tag})` : ' (full site)'}`);
    return { ok: true };
  } catch (err) {
    console.warn(`[revalidate] ping error: ${err.message}`);
    return { ok: false, error: err.message };
  }
}
