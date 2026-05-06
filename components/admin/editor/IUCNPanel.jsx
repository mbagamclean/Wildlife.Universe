'use client';

import { useState, useCallback } from 'react';
import { Shield, Sparkles, ShieldCheck, X, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { IUCN_CONFIG } from '@/components/iucn/iucnConfig';
import { useAIStore } from '@/lib/stores/aiStore';

const PURPLE = '#7c3aed';

const TREND_ICON = {
  increasing: TrendingUp,
  decreasing: TrendingDown,
  stable: Minus,
  unknown: Minus,
};

const TREND_COLOR = {
  increasing: '#22c55e',
  decreasing: '#ef4444',
  stable: '#f59e0b',
  unknown: 'var(--adm-text-subtle)',
};

const IN_SCOPE_CATEGORIES = new Set(['animals', 'birds', 'insects']);

/**
 * Sidebar panel for setting the IUCN Red List status on a post.
 * Renders only when `category` is animals / birds / insects.
 *
 * Props:
 *   category, label, title, body                           — from PostEditor
 *   iucnStatus, scientificName, iucnVerified, iucnVerifiedAt
 *   onChange({iucnStatus?, scientificName?, iucnVerified?, iucnVerifiedAt?})
 */
export function IUCNPanel({
  category,
  label,
  title,
  body,
  iucnStatus,
  scientificName,
  iucnVerified,
  iucnVerifiedAt,
  onChange,
}) {
  const store = useAIStore();
  const [detecting, setDetecting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [populationTrend, setPopulationTrend] = useState('unknown');
  const [confidence, setConfidence] = useState(null);
  const [reasoning, setReasoning] = useState('');
  const [verifyReason, setVerifyReason] = useState(null);

  const inScope = IN_SCOPE_CATEGORIES.has((category || '').toLowerCase());

  const runDetect = useCallback(async () => {
    if (detecting) return;
    setDetecting(true);
    setVerifyReason(null);
    try {
      const res = await fetch('/api/ai/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: 'iucn_detect',
          provider: store.provider,
          model: store.getCurrentTextModel(),
          context: { title, body, category, label },
        }),
      });
      if (!res.ok) throw new Error(`detect failed: ${res.status}`);
      const data = await res.json();
      setPopulationTrend(data.populationTrend || 'unknown');
      setConfidence(data.confidence || null);
      setReasoning(data.reasoning || '');
      onChange({
        iucnStatus: data.iucnStatus || null,
        scientificName: data.scientificName || null,
        iucnVerified: false,
        iucnVerifiedAt: null,
      });
    } catch (err) {
      console.error('[IUCNPanel] detect failed', err);
    } finally {
      setDetecting(false);
    }
  }, [detecting, title, body, category, label, store, onChange]);

  const runVerify = useCallback(async () => {
    if (verifying || !scientificName) return;
    setVerifying(true);
    try {
      const res = await fetch('/api/iucn/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scientificName }),
      });
      const data = await res.json();
      if (data.verified) {
        onChange({
          iucnStatus: data.officialStatus,
          iucnVerified: true,
          iucnVerifiedAt: new Date().toISOString(),
        });
        setPopulationTrend(data.populationTrend || 'unknown');
        setVerifyReason(null);
      } else {
        setVerifyReason(data.reason || 'unknown');
      }
    } catch (err) {
      console.error('[IUCNPanel] verify failed', err);
      setVerifyReason('api-error');
    } finally {
      setVerifying(false);
    }
  }, [verifying, scientificName, onChange]);

  const clear = useCallback(() => {
    setPopulationTrend('unknown');
    setConfidence(null);
    setReasoning('');
    setVerifyReason(null);
    onChange({
      iucnStatus: null,
      scientificName: null,
      iucnVerified: false,
      iucnVerifiedAt: null,
    });
  }, [onChange]);

  if (!inScope) return null;

  const cfg = iucnStatus ? IUCN_CONFIG[iucnStatus] : null;
  const TrendIcon = TREND_ICON[populationTrend] || Minus;
  const trendColor = TREND_COLOR[populationTrend] || 'var(--adm-text-subtle)';

  return (
    <div
      style={{
        background: 'var(--adm-surface)',
        border: '1px solid var(--adm-border)',
        borderRadius: 12,
        padding: 16,
        boxShadow: 'var(--adm-shadow)',
      }}
    >
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{
          width: 26, height: 26, borderRadius: 7,
          background: `${PURPLE}1a`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: PURPLE, flexShrink: 0,
        }}>
          <Shield size={14} />
        </span>
        <h3 style={{ flex: 1, margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--adm-text)' }}>
          IUCN Red List
        </h3>
        {iucnVerified && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            fontSize: 9, fontWeight: 800, color: '#22c55e',
            background: 'rgba(34,197,94,0.12)', padding: '2px 7px',
            borderRadius: 5, textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            <ShieldCheck size={9} /> Verified
          </span>
        )}
      </div>

      {/* ── Body ── */}
      {iucnStatus ? (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 10,
            background: cfg?.badgeBg || 'rgba(20,20,28,0.92)',
            border: `1.5px solid ${cfg?.color || '#888'}80`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            boxShadow: cfg ? `0 0 14px ${cfg.glow}` : 'none',
          }}>
            <span style={{
              fontSize: 16, fontWeight: 900, letterSpacing: '0.08em',
              color: cfg?.textColor || '#fff',
              textShadow: cfg ? `0 0 10px ${cfg.color}80` : 'none',
            }}>{iucnStatus}</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--adm-text)' }}>
              {cfg?.label || 'Unknown'}
            </div>
            {scientificName && (
              <div style={{ fontSize: 11, fontStyle: 'italic', color: 'var(--adm-text-muted)', marginTop: 2 }}>
                {scientificName}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5, fontSize: 10, color: trendColor }}>
              <TrendIcon size={11} />
              <span style={{ textTransform: 'capitalize' }}>{populationTrend}</span>
              {confidence && (
                <>
                  <span style={{ color: 'var(--adm-text-subtle)' }}>•</span>
                  <span style={{ color: 'var(--adm-text-subtle)', textTransform: 'capitalize' }}>
                    {confidence} confidence
                  </span>
                </>
              )}
            </div>
            {iucnVerifiedAt && (
              <div style={{ fontSize: 9, color: 'var(--adm-text-subtle)', marginTop: 3 }}>
                Verified {new Date(iucnVerifiedAt).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{
          padding: '10px 12px', borderRadius: 8,
          border: '1px dashed var(--adm-border)',
          fontSize: 11, color: 'var(--adm-text-subtle)', marginBottom: 12,
          lineHeight: 1.5,
        }}>
          No status detected yet. Click <strong>Detect from species</strong> to autofill.
        </div>
      )}

      {reasoning && (
        <div style={{
          fontSize: 10, color: 'var(--adm-text-muted)', marginBottom: 10,
          padding: '7px 9px', background: 'var(--adm-bg)', borderRadius: 6,
          border: '1px solid var(--adm-border)', lineHeight: 1.5,
        }}>
          {reasoning}
        </div>
      )}

      {verifyReason === 'no-token' && (
        <div style={{ fontSize: 10, color: 'var(--adm-text-subtle)', marginBottom: 8 }}>
          Set <code>IUCN_API_TOKEN</code> in env to enable verification.
        </div>
      )}
      {verifyReason && verifyReason !== 'no-token' && (
        <div style={{ fontSize: 10, color: '#ef4444', marginBottom: 8 }}>
          Verification failed: {verifyReason}
        </div>
      )}

      {/* ── Buttons ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button
          type="button"
          onClick={runDetect}
          disabled={detecting || !title}
          style={{
            padding: '8px 11px', borderRadius: 8, fontSize: 11, fontWeight: 700,
            background: detecting ? 'var(--adm-hover-bg)' : `linear-gradient(135deg, ${PURPLE}, #a855f7)`,
            color: detecting ? 'var(--adm-text-muted)' : '#fff',
            border: 'none',
            cursor: detecting || !title ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            opacity: !title && !detecting ? 0.5 : 1,
          }}
        >
          <Sparkles size={12} />
          {detecting ? 'Detecting…' : 'Detect from species'}
        </button>

        {iucnStatus && scientificName && !iucnVerified && (
          <button
            type="button"
            onClick={runVerify}
            disabled={verifying}
            style={{
              padding: '7px 11px', borderRadius: 8, fontSize: 11, fontWeight: 600,
              background: 'transparent',
              color: '#22c55e',
              border: '1px solid rgba(34,197,94,0.4)',
              cursor: verifying ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <ShieldCheck size={11} />
            {verifying ? 'Verifying…' : 'Verify against IUCN'}
          </button>
        )}

        {iucnStatus && (
          <button
            type="button"
            onClick={clear}
            style={{
              padding: '6px 11px', borderRadius: 8, fontSize: 10, fontWeight: 600,
              background: 'transparent',
              color: 'var(--adm-text-subtle)',
              border: '1px solid var(--adm-border)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            }}
          >
            <X size={10} /> Clear
          </button>
        )}
      </div>
    </div>
  );
}
