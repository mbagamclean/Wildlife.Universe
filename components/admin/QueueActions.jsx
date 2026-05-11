'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Wand2, Play } from 'lucide-react';

/**
 * Two action panels for /admin/content/queue:
 *   Seed — pick a (category, label) and ask Claude for N topics
 *   Run  — kick the cron worker manually with N=1..4
 */
export function QueueActions({ allLabels }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // ── Seed state ──
  const grouped = allLabels.reduce((acc, l) => {
    if (!acc[l.category]) acc[l.category] = { name: l.categoryName, labels: [] };
    acc[l.category].labels.push(l.label);
    return acc;
  }, {});
  const firstCat = Object.keys(grouped)[0] || '';
  const [seedCategory, setSeedCategory] = useState(firstCat);
  const [seedLabel, setSeedLabel] = useState(grouped[firstCat]?.labels[0] || '');
  const [seedCount, setSeedCount] = useState(20);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState(null);

  const labelOptions = grouped[seedCategory]?.labels || [];

  // ── Run state ──
  const [runN, setRunN] = useState(1);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState(null);

  async function handleSeed(e) {
    e.preventDefault();
    setSeeding(true);
    setSeedResult(null);
    try {
      const res = await fetch('/api/admin/queue/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: seedCategory, label: seedLabel, count: Number(seedCount) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSeedResult({ error: data.error || `HTTP ${res.status}`, detail: data.detail || data });
      } else {
        setSeedResult({
          message: `Queued ${data.queued} of ${data.proposed} topics (${data.duplicates} duplicates skipped).`,
        });
        startTransition(() => router.refresh());
      }
    } catch (err) {
      setSeedResult({ error: err.message });
    } finally {
      setSeeding(false);
    }
  }

  async function handleRun() {
    setRunning(true);
    setRunResult(null);
    try {
      const res = await fetch(`/api/admin/cron/generate-batch?n=${runN}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setRunResult({ error: data.reason || data.error || `HTTP ${res.status}`, raw: data });
      } else {
        setRunResult({
          message:
            data.processed === 0
              ? data.reason || 'no work to do'
              : `Processed ${data.processed} (${data.succeeded} succeeded).`,
          results: data.results,
        });
        startTransition(() => router.refresh());
      }
    } catch (err) {
      setRunResult({ error: err.message });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* ── Seed panel ── */}
      <form
        onSubmit={handleSeed}
        className="flex flex-col gap-4 rounded-2xl border border-[var(--glass-border)] bg-[var(--color-bg-deep)] p-6"
      >
        <div className="flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-[var(--color-primary)]" aria-hidden />
          <h3 className="font-display text-lg font-bold">Seed topics</h3>
        </div>
        <p className="text-sm text-[var(--color-fg-soft)]">
          Asks Claude for N high-quality species/topic titles for the selected label, filters
          duplicates, queues the rest as <span className="font-semibold">pending</span>.
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-[var(--color-fg-soft)]">Category</span>
            <select
              value={seedCategory}
              onChange={(e) => {
                setSeedCategory(e.target.value);
                setSeedLabel(grouped[e.target.value]?.labels[0] || '');
              }}
              className="rounded-lg border border-[var(--glass-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
            >
              {Object.entries(grouped).map(([slug, g]) => (
                <option key={slug} value={slug}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-[var(--color-fg-soft)]">Label</span>
            <select
              value={seedLabel}
              onChange={(e) => setSeedLabel(e.target.value)}
              className="rounded-lg border border-[var(--glass-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
            >
              {labelOptions.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-[var(--color-fg-soft)]">Count (1–30)</span>
            <input
              type="number"
              min={1}
              max={30}
              value={seedCount}
              onChange={(e) => setSeedCount(e.target.value)}
              className="rounded-lg border border-[var(--glass-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={seeding}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary)]/90 disabled:opacity-60"
        >
          {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          {seeding ? 'Seeding…' : 'Seed topics'}
        </button>

        {seedResult?.message && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
            {seedResult.message}
          </div>
        )}
        {seedResult?.error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            <div className="font-semibold">{seedResult.error}</div>
            {seedResult.detail && (
              <div className="mt-1 text-xs text-red-200/80 whitespace-pre-wrap break-words">
                {typeof seedResult.detail === 'string' ? seedResult.detail : JSON.stringify(seedResult.detail, null, 2)}
              </div>
            )}
          </div>
        )}
      </form>

      {/* ── Run panel ── */}
      <div className="flex flex-col gap-4 rounded-2xl border border-[var(--glass-border)] bg-[var(--color-bg-deep)] p-6">
        <div className="flex items-center gap-2">
          <Play className="h-5 w-5 text-[var(--color-primary)]" aria-hidden />
          <h3 className="font-display text-lg font-bold">Run batch now</h3>
        </div>
        <p className="text-sm text-[var(--color-fg-soft)]">
          Pulls up to N pending rows and runs the full pipeline (≈60–90 seconds per article,
          ≈$0.18 each). Daily cap still applies.
        </p>

        <label className="flex flex-col gap-1 text-xs">
          <span className="text-[var(--color-fg-soft)]">N (1–4)</span>
          <select
            value={runN}
            onChange={(e) => setRunN(Number(e.target.value))}
            className="rounded-lg border border-[var(--glass-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={4}>4</option>
          </select>
        </label>

        <button
          type="button"
          onClick={handleRun}
          disabled={running}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#008000] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#008000]/90 disabled:opacity-60"
        >
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {running ? 'Running…' : `Generate ${runN} now`}
        </button>

        {runResult?.message && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
            {runResult.message}
          </div>
        )}
        {runResult?.error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            <div className="font-semibold">{runResult.error}</div>
            {runResult.raw && (
              <pre className="mt-1 max-h-40 overflow-auto text-[10px] text-red-200/70 whitespace-pre-wrap break-words">
                {JSON.stringify(runResult.raw, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
