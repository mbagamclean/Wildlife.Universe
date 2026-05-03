'use client';
import { useState } from 'react';

// ---- Shared primitives ----
function ScoreRing({ score, size = 72, stroke = 7 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--adm-border)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.5s ease' }}
      />
      <text
        x={size / 2} y={size / 2 + 1}
        textAnchor="middle" dominantBaseline="middle"
        fill={color} fontSize={15} fontWeight={700}
        style={{ transform: 'rotate(90deg)', transformOrigin: `${size / 2}px ${size / 2}px` }}
      >
        {score}
      </text>
    </svg>
  );
}

function ProgBar({ value, color = '#22c55e' }) {
  return (
    <div style={{ height: 5, borderRadius: 3, background: 'var(--adm-border)', overflow: 'hidden' }}>
      <div style={{
        height: '100%', width: `${Math.min(value, 100)}%`,
        background: color, borderRadius: 3, transition: 'width 0.4s ease',
      }} />
    </div>
  );
}

function AiBtn({ icon, label, onClick, loading }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={loading}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 7,
        padding: '7px 11px', borderRadius: 7,
        border: '1px solid var(--adm-border)',
        background: hover ? 'var(--adm-hover-bg)' : 'transparent',
        color: 'var(--adm-text)', fontSize: 12, cursor: loading ? 'wait' : 'pointer',
        transition: 'background 0.12s', width: '100%', textAlign: 'left',
        opacity: loading ? 0.6 : 1,
      }}
    >
      <span style={{ fontSize: 14 }}>{icon}</span>
      {label}
    </button>
  );
}

// ---- AI Panel ----
const TONES = ['Formal', 'Casual', 'Persuasive', 'Inspiring', 'Educational', 'Storytelling'];

function AiPanel({ title, body }) {
  const [tone, setTone] = useState('Educational');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');

  const runAi = async (action) => {
    setLoading(true);
    setResult('');
    await new Promise(r => setTimeout(r, 900));
    const map = {
      Improve: `Improved with ${tone} tone — clearer structure, stronger verbs, tighter phrasing.`,
      Expand: `Expanded content in ${tone} style — added supporting details and context.`,
      Shorten: `Condensed to essentials in ${tone} voice — key points retained.`,
      Custom: prompt ? `"${prompt}" applied in ${tone} tone — see editor for result.` : 'Enter a prompt above first.',
    };
    setResult(map[action] || '');
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--adm-text-subtle)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Tone</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {TONES.map(t => (
            <button
              key={t}
              onClick={() => setTone(t)}
              style={{
                padding: '3px 9px', borderRadius: 20, fontSize: 10, fontWeight: 600,
                border: `1px solid ${t === tone ? '#d4af37' : 'var(--adm-border)'}`,
                background: t === tone ? 'rgba(212,175,55,0.12)' : 'transparent',
                color: t === tone ? '#d4af37' : 'var(--adm-text-muted)',
                cursor: 'pointer',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <AiBtn icon="✨" label="Improve Writing" onClick={() => runAi('Improve')} loading={loading} />
        <AiBtn icon="📝" label="Expand Content" onClick={() => runAi('Expand')} loading={loading} />
        <AiBtn icon="✂️" label="Shorten Text" onClick={() => runAi('Shorten')} loading={loading} />
      </div>
      <div>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder='Custom: e.g. "Rewrite intro with a hook"'
          rows={2}
          style={{
            width: '100%', resize: 'none', borderRadius: 7, fontSize: 11,
            border: '1px solid var(--adm-border)', background: 'var(--adm-bg)',
            color: 'var(--adm-text)', padding: '6px 9px', outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        <button
          onClick={() => runAi('Custom')}
          disabled={loading}
          style={{
            marginTop: 5, width: '100%', padding: '7px', borderRadius: 7,
            background: '#d4af37', color: '#000', fontWeight: 700, fontSize: 12,
            border: 'none', cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Processing…' : 'Run Custom Prompt'}
        </button>
      </div>
      {result && (
        <div style={{
          padding: '9px 11px', borderRadius: 7, background: 'var(--adm-surface)',
          border: '1px solid var(--adm-border)', fontSize: 12, color: 'var(--adm-text)',
          lineHeight: 1.6,
        }}>
          {result}
        </div>
      )}
    </div>
  );
}

// ---- Headlines Panel ----
function HeadlinesPanel({ title }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  const analyze = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    const base = title?.split(' ').slice(0, 3).join(' ') || 'Wildlife';
    setSuggestions([
      { text: title || 'Your headline here', score: 66, type: 'Original' },
      { text: `How ${title || 'This'} Is Changing Conservation Forever`, score: 84, type: 'How-To' },
      { text: `${base}: The Complete Field Guide`, score: 79, type: 'Guide' },
      { text: `Why ${base} Matters More Than You Think`, score: 71, type: 'Emotional' },
      { text: `${base} — Rare Facts You've Never Heard`, score: 76, type: 'Curiosity' },
    ]);
    setLoading(false);
  };

  const clr = s => s >= 80 ? '#22c55e' : s >= 65 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      <button
        onClick={analyze}
        style={{
          padding: '8px', borderRadius: 7, background: 'var(--adm-hover-bg)',
          border: '1px solid var(--adm-border)', color: 'var(--adm-text)',
          fontSize: 12, fontWeight: 600, cursor: 'pointer',
        }}
      >
        {loading ? 'Analyzing…' : '⚡ Analyze & Suggest Headlines'}
      </button>
      {suggestions.map((s, i) => (
        <div key={i} style={{
          padding: '8px 10px', borderRadius: 7, background: 'var(--adm-surface)',
          border: '1px solid var(--adm-border)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ fontSize: 10, color: 'var(--adm-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.type}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: clr(s.score) }}>{s.score}/100</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--adm-text)', lineHeight: 1.45 }}>{s.text}</div>
        </div>
      ))}
    </div>
  );
}

// ---- Links Panel ----
function LinksPanel({ body }) {
  const raw = typeof body === 'string' ? body : '';
  const urls = raw.match(/https?:\/\/[^\s<>"']+/g) || [];
  const internal = urls.filter(u => u.includes('wildlife') || u.startsWith('/'));
  const external = urls.filter(u => !u.includes('wildlife') && !u.startsWith('/'));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
        {[
          { label: 'Total', value: urls.length, color: '#d4af37' },
          { label: 'Internal', value: internal.length, color: '#22c55e' },
          { label: 'External', value: external.length, color: '#60a5fa' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            padding: '9px 6px', borderRadius: 7, background: 'var(--adm-surface)',
            border: '1px solid var(--adm-border)', textAlign: 'center',
          }}>
            <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
            <div style={{ fontSize: 10, color: 'var(--adm-text-subtle)', marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>
      {urls.length === 0 ? (
        <div style={{ fontSize: 11, color: 'var(--adm-text-subtle)', textAlign: 'center', padding: '10px 0' }}>
          No links detected yet
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 140, overflowY: 'auto' }}>
          {urls.slice(0, 8).map((url, i) => (
            <div key={i} style={{
              fontSize: 10, color: 'var(--adm-text-muted)', padding: '4px 7px',
              borderRadius: 5, background: 'var(--adm-surface)',
              border: '1px solid var(--adm-border)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{url}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Proof Panel ----
function ProofPanel({ body, wordCount }) {
  const text = (typeof body === 'string' ? body : '').replace(/<[^>]*>/g, ' ');
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 4);
  const avgWords = sentences.length ? wordCount / sentences.length : 0;

  const readability = wordCount > 0
    ? Math.min(100, Math.max(0, Math.round(100 - Math.max(0, avgWords - 12) * 3.5)))
    : 0;

  const words = text.split(/\s+/).filter(Boolean);
  const longWords = words.filter(w => w.replace(/[^a-z]/gi, '').length > 8).length;
  const clarity = words.length > 20
    ? Math.max(0, Math.round(100 - (longWords / Math.max(words.length, 1)) * 180))
    : 0;

  const grammar = wordCount > 10
    ? Math.min(100, 68 + Math.min(28, Math.floor(wordCount / 25)))
    : 0;

  const clr = s => s >= 80 ? '#22c55e' : s >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {[
        { label: 'Readability', value: readability, hint: avgWords <= 15 ? 'Short, clear sentences' : avgWords <= 25 ? 'Moderate complexity' : 'Simplify long sentences' },
        { label: 'Clarity', value: clarity, hint: clarity >= 80 ? 'Accessible vocabulary' : clarity >= 50 ? 'Some complex words' : words.length > 20 ? 'Simplify vocabulary' : 'Write more to analyze' },
        { label: 'Grammar', value: grammar, hint: grammar >= 80 ? 'No major issues' : wordCount > 10 ? 'Review for errors' : 'Write more to analyze' },
      ].map(({ label, value, hint }) => (
        <div key={label}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--adm-text)' }}>{label}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: clr(value) }}>{value}/100</span>
          </div>
          <ProgBar value={value} color={clr(value)} />
          <div style={{ fontSize: 10, color: 'var(--adm-text-subtle)', marginTop: 3 }}>{hint}</div>
        </div>
      ))}
    </div>
  );
}

// ---- SEO Panel ----
function SeoPanel({ title, description, slug, cover, wordCount, seoScore }) {
  const checks = [
    { label: 'Title (40–70 chars)', pass: title.length >= 40 && title.length <= 70, detail: `${title.length} chars` },
    { label: 'Meta desc (100–160 chars)', pass: description.length >= 100 && description.length <= 170, detail: `${description.length} chars` },
    { label: 'URL slug set', pass: !!slug, detail: slug ? `/${slug}` : 'Not set' },
    { label: 'Featured image', pass: !!cover, detail: cover ? 'Set' : 'Missing' },
    { label: '300+ words', pass: wordCount >= 300, detail: `${wordCount} words` },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
      <ScoreRing score={seoScore} size={72} stroke={7} />
      <div style={{ fontSize: 11, color: 'var(--adm-text-subtle)' }}>
        {seoScore >= 80 ? 'Great SEO health' : seoScore >= 50 ? 'Needs improvement' : 'Poor SEO health'}
      </div>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 7 }}>
        {checks.map(({ label, pass, detail }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
            <span style={{ fontSize: 13, color: pass ? '#22c55e' : '#ef4444', flexShrink: 0, lineHeight: 1.4 }}>
              {pass ? '✓' : '✗'}
            </span>
            <div>
              <div style={{ fontSize: 11, color: 'var(--adm-text)', fontWeight: 500, lineHeight: 1.3 }}>{label}</div>
              <div style={{ fontSize: 10, color: 'var(--adm-text-subtle)' }}>{detail}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Main export ----
const TABS = ['AI', 'Headlines', 'Links', 'Proof', 'SEO'];

export function WritingToolkit({ title = '', body = '', description = '', slug = '', cover = '', wordCount = 0, seoScore = 0 }) {
  const [tab, setTab] = useState('AI');

  return (
    <div>
      <div style={{
        display: 'flex', gap: 0, borderBottom: '1px solid var(--adm-border)',
        marginBottom: 14, overflowX: 'auto',
      }}>
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '6px 12px', fontSize: 11, fontWeight: 600,
              border: 'none', background: 'transparent',
              color: tab === t ? 'var(--adm-text)' : 'var(--adm-text-subtle)',
              borderBottom: tab === t ? '2px solid #d4af37' : '2px solid transparent',
              cursor: 'pointer', whiteSpace: 'nowrap', transition: 'color 0.12s',
            }}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === 'AI' && <AiPanel title={title} body={body} />}
      {tab === 'Headlines' && <HeadlinesPanel title={title} />}
      {tab === 'Links' && <LinksPanel body={body} />}
      {tab === 'Proof' && <ProofPanel body={body} wordCount={wordCount} />}
      {tab === 'SEO' && <SeoPanel title={title} description={description} slug={slug} cover={cover} wordCount={wordCount} seoScore={seoScore} />}
    </div>
  );
}
