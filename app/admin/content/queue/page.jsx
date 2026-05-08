import { createClient } from '@supabase/supabase-js';
import { categories } from '@/lib/mock/categories';
import { QueueActions } from '@/components/admin/QueueActions';

export const metadata = { title: 'Content queue · Admin' };
export const dynamic = 'force-dynamic';

const STATUSES = ['pending', 'generating', 'generated', 'failed', 'paused'];

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

async function fetchQueueOverview() {
  const sb = adminClient();
  // One pull, group in JS — content_queue stays small (a few hundred rows).
  const { data, error } = await sb
    .from('content_queue')
    .select('id, category, label, status, attempts, last_error, generated_post_id, created_at, updated_at, generated_at')
    .order('updated_at', { ascending: false });
  if (error) {
    return { error: error.message, rows: [], byLabel: new Map(), recent: [] };
  }
  const rows = data || [];
  const byLabel = new Map();
  for (const r of rows) {
    const key = `${r.category}/${r.label}`;
    if (!byLabel.has(key)) {
      byLabel.set(key, {
        category: r.category,
        label: r.label,
        counts: Object.fromEntries(STATUSES.map((s) => [s, 0])),
      });
    }
    const bucket = byLabel.get(key);
    if (r.status in bucket.counts) bucket.counts[r.status] += 1;
  }
  const recent = rows.slice(0, 25);
  return { rows, byLabel, recent };
}

export default async function ContentQueuePage() {
  const { error, byLabel, recent } = await fetchQueueOverview();

  const allLabels = categories.flatMap((c) =>
    c.labels.map((l) => ({ category: c.slug, categoryName: c.name, label: l })),
  );

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-3xl font-black sm:text-4xl">Content queue</h1>
        <p className="mt-2 text-sm text-[var(--color-fg-soft)]">
          Topics queued for the batch generator. The GitHub Actions cron picks pending rows
          every 4 hours; the buttons below let you seed new topics or trigger a run on demand.
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-200">
          Failed to load queue: {error}
        </div>
      )}

      <QueueActions allLabels={allLabels} />

      {/* ── Per-label progress ── */}
      <section>
        <h2 className="mb-4 font-display text-xl font-bold">Progress by label</h2>
        <div className="overflow-hidden rounded-2xl border border-[var(--glass-border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-bg-deep)] text-left text-xs uppercase tracking-wider text-[var(--color-fg-soft)]">
              <tr>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Label</th>
                <th className="px-4 py-3 text-right">Pending</th>
                <th className="px-4 py-3 text-right">Generating</th>
                <th className="px-4 py-3 text-right">Generated</th>
                <th className="px-4 py-3 text-right">Failed</th>
              </tr>
            </thead>
            <tbody>
              {allLabels.map(({ category, categoryName, label }) => {
                const key = `${category}/${label}`;
                const b = byLabel.get(key) || { counts: { pending: 0, generating: 0, generated: 0, failed: 0 } };
                const has = b.counts.pending + b.counts.generating + b.counts.generated + b.counts.failed > 0;
                return (
                  <tr
                    key={key}
                    className={`border-t border-[var(--glass-border)] ${has ? '' : 'opacity-50'}`}
                  >
                    <td className="px-4 py-3 text-[var(--color-fg-soft)]">{categoryName}</td>
                    <td className="px-4 py-3 font-medium">{label}</td>
                    <td className="px-4 py-3 text-right">{b.counts.pending}</td>
                    <td className="px-4 py-3 text-right">{b.counts.generating}</td>
                    <td className="px-4 py-3 text-right text-emerald-400">{b.counts.generated}</td>
                    <td className="px-4 py-3 text-right text-red-300">{b.counts.failed}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Recent activity ── */}
      <section>
        <h2 className="mb-4 font-display text-xl font-bold">Recent activity</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-[var(--color-fg-soft)]">No queue rows yet. Seed some topics above.</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[var(--glass-border)]">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-bg-deep)] text-left text-xs uppercase tracking-wider text-[var(--color-fg-soft)]">
                <tr>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Category / Label</th>
                  <th className="px-4 py-3">Topic</th>
                  <th className="px-4 py-3 text-right">Attempts</th>
                  <th className="px-4 py-3">Updated</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id} className="border-t border-[var(--glass-border)] align-top">
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-[var(--color-fg-soft)]">
                      {r.category} / {r.label}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{r.topic}</div>
                      {r.last_error && (
                        <div className="mt-1 text-xs text-red-300/80">{r.last_error}</div>
                      )}
                      {r.generated_post_id && (
                        <div className="mt-1 text-xs text-emerald-400/80">
                          → post {r.generated_post_id}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">{r.attempts}</td>
                    <td className="px-4 py-3 text-xs text-[var(--color-fg-soft)]">
                      {new Date(r.updated_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    pending: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30',
    generating: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
    generated: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    failed: 'bg-red-500/10 text-red-300 border-red-500/30',
    paused: 'bg-zinc-500/10 text-zinc-300 border-zinc-500/30',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
        styles[status] || styles.paused
      }`}
    >
      {status}
    </span>
  );
}
