# Wildlife Universe — Remaining setup

> **Vercel plan note for media uploads:** the upload route (`app/api/upload/route.js`) sets `export const maxDuration = 300` to give ffmpeg enough time to transcode video to WebM. **This requires the Vercel Pro plan.** On the Hobby plan, `maxDuration` is capped at 60s and large videos will time out — the route gracefully falls back to storing the original file when ffmpeg fails or the input is over 120 MB.



This file tracks the **manual** configuration left after the Mayobe Bros → Wildlife Universe feature port. Code-side everything is in place; these steps are environment / Supabase / external-service work that the assistant cannot do for you.

## 1. Run Supabase migrations `004_seo_extensions.sql` AND `005_post_editor_fields.sql`

Adds:
- `posts.updated_at` column + auto-update trigger (sitemap/RSS lastModified accuracy)
- `post_views` event table (real per-day traffic in `/admin/configuration/traffic-growth`)
- `post_translations` table (real save in `/admin/configuration/translate`)

**How:**
1. Supabase Dashboard → SQL Editor → New query
2. Paste the contents of `supabase/migrations/004_seo_extensions.sql`, run
3. New query, paste `supabase/migrations/005_post_editor_fields.sql`, run

Both are idempotent — safe to re-run if you've partially applied them.

**005** adds the columns the PostEditor sidebar sends with every save (excerpt, meta_title, meta_description, meta_keywords, publish_date). The app is self-healing — even without 005 the post still saves, the SEO/scheduling fields just don't persist. With 005, everything persists.

After running, refresh the Traffic Growth dashboard — the chart title will switch from "Views attributed to creation date" to "Real page views per day" and the disclaimer banner will turn green.

## 2. Set `NEXT_PUBLIC_SITE_URL` in Vercel

Already set locally in `.env.local`. Add it to Vercel for production:

1. Vercel Dashboard → Wildlife.Universe project → Settings → Environment Variables
2. Add:
   - **Key:** `NEXT_PUBLIC_SITE_URL`
   - **Value:** `https://www.wildlifeuniverse.org`
   - **Environments:** Production, Preview, Development

If you skip this, the fallback in `lib/seo.js` is the same value, so things still work — but explicit env config is preferred.

## 3. Allow public reads on the Supabase `media` bucket `audio/` paths

Required for TTS / voiceover playback in the editor's Media tab.

1. Supabase Dashboard → Storage → `media` bucket → Policies
2. Add a new SELECT (read) policy:
   - **Name:** `Public read for audio`
   - **Roles:** `anon, authenticated`
   - **Policy:** `bucket_id = 'media' AND (name LIKE 'audio/%' OR name LIKE 'audio/voiceover/%' OR name LIKE 'ai/%')`

Or simpler if your bucket is already public for `ai/` images: extend the same policy to include `audio/`.

## 4. Optional — wire `Organization.sameAs` social URLs

Once you have official accounts, edit `lib/seo.js → buildOrganizationJsonLd` and replace the empty `sameAs: []` with:

```js
sameAs: [
  'https://x.com/wildlifeuniverse',
  'https://instagram.com/wildlifeuniverse',
  'https://youtube.com/@wildlifeuniverse',
  'https://facebook.com/wildlifeuniverse',
  // …whatever applies
],
```

Improves Google's Knowledge Graph linkage.

## 5. Optional — Google Search Console

Submit your sitemap for accurate indexing data:

1. Go to <https://search.google.com/search-console>
2. Add property `www.wildlifeuniverse.org`
3. Sitemaps → Add new sitemap → enter `sitemap.xml`
4. Also add `news-sitemap.xml` (auto-detected as Google News once your site qualifies)

The Indexing Monitor at `/admin/configuration/indexing-monitor` will keep working as a manual check, but Search Console gives you batch real-time data.

## 6. Optional — submit RSS feeds

- Main: `https://www.wildlifeuniverse.org/rss.xml`
- Per-category: `/animals/rss.xml`, `/birds/rss.xml`, `/plants/rss.xml`, `/insects/rss.xml`, `/posts/rss.xml`
- Per-author: `/author/<slug>/rss.xml`
- Google News: `/news-sitemap.xml`

Submit the main feed to Feedly's Search-Engine submission, FeedBurner-equivalents, etc.

---

When all six are done, the deployment is fully production-ready. Until then, individual features degrade gracefully (charts fall back to cumulative integers, translate falls back to clipboard, etc.).
