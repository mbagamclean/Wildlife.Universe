'use client';
import { useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, Loader2, CheckCircle, AlertCircle, Sparkles,
  FileText, Hash, ImageIcon, Link2, Type, ListChecks,
} from 'lucide-react';
import { useAIStore } from '@/lib/stores/aiStore';

const GREEN = '#059669';
const AMBER = '#d97706';
const RED = '#dc2626';
const GREEN_LIGHT = 'rgba(5,150,105,0.10)';
const GREEN_BORDER = 'rgba(5,150,105,0.28)';

function statusFor(value, { ok, warn }) {
  if (ok(value)) return { color: GREEN, label: 'Good', tone: 'good' };
  if (warn(value)) return { color: AMBER, label: 'OK', tone: 'warn' };
  return { color: RED, label: 'Fix', tone: 'bad' };
}

function htmlToText(html) {
  return (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function countTag(html, tag) {
  if (!html) return 0;
  const re = new RegExp(`<${tag}[\\s>]`, 'gi');
  return (html.match(re) || []).length;
}

function ScoreRing({ score, size = 72 }) {
  const r = size / 2 - 6;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const tone = score >= 85 ? GREEN : score >= 60 ? AMBER : RED;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--adm-border)" strokeWidth={6} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={tone} strokeWidth={6} fill="none"
          strokeDasharray={c} strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.7s ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column',
      }}>
        <span style={{ fontSize: 18, fontWeight: 800, color: tone }}>{score}</span>
        <span style={{ fontSize: 9, color: 'var(--adm-text-subtle)', marginTop: -2 }}>/ 100</span>
      </div>
    </div>
  );
}

function MetricRow({ Icon, label, value, hint, status }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 9,
      padding: '7px 9px', borderRadius: 7,
      border: '1px solid var(--adm-border)', background: 'var(--adm-surface)',
    }}>
      <Icon size={13} color={status.color} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--adm-text)' }}>{label}</div>
        <div style={{ fontSize: 10, color: 'var(--adm-text-subtle)', marginTop: 1 }}>{hint}</div>
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: status.color, flexShrink: 0 }}>
        {value}
      </span>
      <span style={{
        fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
        background: `${status.color}1a`, color: status.color, textTransform: 'uppercase', letterSpacing: '0.05em',
        flexShrink: 0,
      }}>
        {status.label}
      </span>
    </div>
  );
}

export function SEOScorePanel({ title = '', body = '', metaTitle = '', metaDescription = '', metaKeywords = '' }) {
  const store = useAIStore();
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);

  const metrics = useMemo(() => {
    const text = htmlToText(body);
    const words = text ? text.split(/\s+/).filter(Boolean) : [];
    const wordCount = words.length;

    const titleLen = (metaTitle || title || '').length;
    const descLen = (metaDescription || '').length;
    const h2Count = countTag(body, 'h2');
    const imgCount = countTag(body, 'img');
    const linkCount = countTag(body, 'a');

    // Keyword density on first metaKeyword
    const primary = (metaKeywords || '').split(',')[0]?.trim().toLowerCase() || '';
    let density = 0;
    if (primary && wordCount > 0) {
      const re = new RegExp(`\\b${primary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      const occurrences = (text.match(re) || []).length;
      density = (occurrences / wordCount) * 100;
    }

    return {
      titleLen, descLen, wordCount, h2Count, imgCount, linkCount,
      density, primary,
    };
  }, [title, body, metaTitle, metaDescription, metaKeywords]);

  const titleStatus = statusFor(metrics.titleLen, {
    ok: v => v >= 50 && v <= 60,
    warn: v => v >= 30 && v <= 70,
  });
  const descStatus = statusFor(metrics.descLen, {
    ok: v => v >= 150 && v <= 160,
    warn: v => v >= 100 && v <= 170,
  });
  const wordStatus = statusFor(metrics.wordCount, {
    ok: v => v >= 1500,
    warn: v => v >= 600,
  });
  const h2Status = statusFor(metrics.h2Count, {
    ok: v => v >= 6,
    warn: v => v >= 3,
  });
  const imgStatus = statusFor(metrics.imgCount, {
    ok: v => v >= 4,
    warn: v => v >= 1,
  });
  const linkStatus = statusFor(metrics.linkCount, {
    ok: v => v >= 5,
    warn: v => v >= 2,
  });
  const densityStatus = statusFor(metrics.density, {
    ok: v => v >= 0.8 && v <= 2.5,
    warn: v => v >= 0.3 && v <= 4,
  });

  const score = useMemo(() => {
    const all = [titleStatus, descStatus, wordStatus, h2Status, imgStatus, linkStatus, densityStatus];
    const total = all.reduce((sum, s) => sum + (s.tone === 'good' ? 100 : s.tone === 'warn' ? 60 : 25), 0);
    return Math.round(total / all.length);
  }, [titleStatus, descStatus, wordStatus, h2Status, imgStatus, linkStatus, densityStatus]);

  const runAIAnalysis = useCallback(async () => {
    setAnalyzing(true); setError(null);
    try {
      const res = await fetch('/api/ai/seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, provider: store.provider, task: 'analyze' }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'AI analysis failed');
      setAnalysis(json.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setAnalyzing(false);
    }
  }, [title, body, store.provider]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9, flexShrink: 0,
          background: `linear-gradient(135deg, ${GREEN}, #34d399)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <TrendingUp size={16} color="#fff" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--adm-text)' }}>SEO Score</div>
          <div style={{ fontSize: 10, color: 'var(--adm-text-subtle)' }}>
            Live heuristics + optional AI deep-dive
          </div>
        </div>
      </div>

      {/* Score ring + summary */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 13,
        padding: '11px 13px', borderRadius: 10,
        border: `1px solid ${GREEN_BORDER}`, background: GREEN_LIGHT,
      }}>
        <ScoreRing score={score} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--adm-text)' }}>
            {score >= 85 ? 'Excellent' : score >= 60 ? 'Solid foundation' : 'Needs attention'}
          </div>
          <div style={{ fontSize: 10, color: 'var(--adm-text-subtle)', marginTop: 2, lineHeight: 1.5 }}>
            {score >= 85 ? 'Article is well-optimized for search.'
              : score >= 60 ? 'A few targeted fixes will lift the score.'
              : 'Multiple SEO basics need attention before publishing.'}
          </div>
        </div>
      </div>

      {/* Metric rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <MetricRow
          Icon={Type}
          label="Title length"
          value={`${metrics.titleLen} chars`}
          hint="50–60 chars ideal"
          status={titleStatus}
        />
        <MetricRow
          Icon={FileText}
          label="Meta description"
          value={`${metrics.descLen} chars`}
          hint="150–160 chars ideal"
          status={descStatus}
        />
        <MetricRow
          Icon={ListChecks}
          label="Word count"
          value={metrics.wordCount.toLocaleString()}
          hint="1,500+ words for AdSense"
          status={wordStatus}
        />
        <MetricRow
          Icon={Hash}
          label="H2 sections"
          value={metrics.h2Count}
          hint="6+ for full articles"
          status={h2Status}
        />
        <MetricRow
          Icon={ImageIcon}
          label="Images"
          value={metrics.imgCount}
          hint="4+ for visual richness"
          status={imgStatus}
        />
        <MetricRow
          Icon={Link2}
          label="Internal/external links"
          value={metrics.linkCount}
          hint="5+ for SEO authority"
          status={linkStatus}
        />
        <MetricRow
          Icon={TrendingUp}
          label="Keyword density"
          value={metrics.primary ? `${metrics.density.toFixed(2)}%` : '—'}
          hint={metrics.primary ? `"${metrics.primary}" — 0.8–2.5% ideal` : 'Set a primary keyword'}
          status={densityStatus}
        />
      </div>

      {/* AI deeper analysis trigger */}
      <button
        onClick={runAIAnalysis}
        disabled={analyzing}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          padding: '10px', borderRadius: 9, fontSize: 12, fontWeight: 700,
          background: analyzing ? 'var(--adm-hover-bg)' : GREEN, color: analyzing ? 'var(--adm-text-muted)' : '#fff',
          border: 'none', cursor: analyzing ? 'wait' : 'pointer',
        }}
      >
        {analyzing ? <Loader2 size={12} className="ssspin" /> : <Sparkles size={12} />}
        {analyzing ? 'Running deep AI analysis…' : 'Run AI SEO Analysis'}
      </button>

      {error && (
        <div style={{ fontSize: 11, color: '#ef4444', padding: '7px 10px', borderRadius: 7, border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.08)' }}>
          {error}
        </div>
      )}

      <AnimatePresence>
        {analysis && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              padding: '11px 12px', borderRadius: 9,
              border: '1px solid var(--adm-border)', background: 'var(--adm-surface)',
              display: 'flex', flexDirection: 'column', gap: 8,
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--adm-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              AI Analysis
            </div>
            {[
              ['Primary keyword', analysis.primaryKeyword],
              ['Readability', analysis.readabilityScore != null ? `${analysis.readabilityScore}/100` : null],
              ['EEAT score', analysis.eeatScore != null ? `${analysis.eeatScore}/100` : null],
              ['Heading structure', analysis.headingStructure],
            ].filter(([, v]) => v).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                <span style={{ color: 'var(--adm-text-muted)' }}>{k}</span>
                <span style={{ fontWeight: 700, color: 'var(--adm-text)' }}>{v}</span>
              </div>
            ))}
            {analysis.recommendations?.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--adm-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>
                  Recommendations
                </div>
                {analysis.recommendations.map((r, i) => (
                  <div key={i} style={{ display: 'flex', gap: 5, fontSize: 11, color: 'var(--adm-text)', lineHeight: 1.55, marginBottom: 4 }}>
                    <CheckCircle size={11} color={GREEN} style={{ marginTop: 3, flexShrink: 0 }} />
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            )}
            {analysis.lsiKeywords?.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--adm-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>
                  LSI Keywords
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {analysis.lsiKeywords.map((k, i) => (
                    <span key={i} style={{
                      fontSize: 10, padding: '3px 7px', borderRadius: 5,
                      background: GREEN_LIGHT, color: GREEN, border: `1px solid ${GREEN_BORDER}`,
                    }}>
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .ssspin { animation: ssspin 1s linear infinite; }
        @keyframes ssspin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

export default SEOScorePanel;
