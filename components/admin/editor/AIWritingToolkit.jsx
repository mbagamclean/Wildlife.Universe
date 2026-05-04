'use client';
import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Newspaper, Link2, CheckCircle2, TrendingUp, Search,
  Palette, Film, Clock, Clapperboard, ShieldCheck,
} from 'lucide-react';
import { useAIStore } from '@/lib/stores/aiStore';
import { HeadlinePanel } from './HeadlinePanel';
import { ProofingPanel } from './ProofingPanel';
import { SEOScorePanel } from './SEOScorePanel';
import { AIMediaPanel } from './AIMediaPanel';
import { InternalLinksPanel } from './InternalLinksPanel';
import { AdSenseCheckPanel } from './AdSenseCheckPanel';
import { OriginalityPanel } from './OriginalityPanel';
import { DesignStudioPanel } from './DesignStudioPanel';
import { VersionHistoryPanel } from './VersionHistoryPanel';
import { MediaTranscribePanel } from './MediaTranscribePanel';

// Tab order matches Mayobe Bros' WritingToolkit (with AdSense appended).
const TOP_TABS = [
  { id: 'AI',        label: 'AI',        icon: Sparkles,     color: '#7c3aed' },
  { id: 'Headlines', label: 'Headlines', icon: Newspaper,    color: '#10b981' },
  { id: 'Links',     label: 'Links',     icon: Link2,        color: '#3b82f6' },
  { id: 'Proof',     label: 'Proof',     icon: CheckCircle2, color: '#16a34a' },
  { id: 'SEO',       label: 'SEO',       icon: TrendingUp,   color: '#2563eb' },
  { id: 'Orig',      label: 'Orig.',     icon: Search,       color: '#ea580c' },
  { id: 'Design',    label: 'Design',    icon: Palette,      color: '#ec4899' },
  { id: 'Media',     label: 'Media',     icon: Film,         color: '#0891b2' },
  { id: 'History',   label: 'History',   icon: Clock,        color: '#d97706' },
  { id: 'AIMedia',   label: 'AI Media',  icon: Clapperboard, color: '#f43f5e' },
  { id: 'AdSense',   label: 'AdSense',   icon: ShieldCheck,  color: '#d4af37' },
];

const PURPLE = '#7c3aed';
const PURPLE_LIGHT = 'rgba(124,58,237,0.1)';
const PURPLE_BORDER = 'rgba(124,58,237,0.25)';

const TONES = [
  'Professional', 'Casual', 'Friendly', 'Authoritative',
  'Conversational', 'Academic', 'Documentary', 'Wildlife Explorer',
  'National Geographic', 'Attenborough Narrative',
];

const WRITING_TABS = ['Generate', 'Enhance', 'Structure', 'Snippets', 'Research', 'EEAT', 'AdSense'];

const GENERATE_ACTIONS = [
  { id: 'full_article', icon: '✦', label: 'Generate Full Article (4,000–5,000 words)', hint: 'Add a title first', needsTitle: true },
  { id: 'introduction', icon: '≡', label: 'Write Introduction', hint: '250–350 word hook-driven opening' },
  { id: 'conclusion', icon: '→', label: 'Write Conclusion + CTA', hint: 'Memorable closing with call-to-action' },
  { id: 'faq', icon: '?', label: 'Write FAQ Section', hint: '8–10 questions matching Google searches' },
  { id: 'continue', icon: '⚡', label: 'Continue Writing', hint: 'Add 500–800 more words seamlessly' },
  { id: 'seo_optimize', icon: '◎', label: 'SEO Optimize Content', hint: 'Add keywords, LSI terms, internal link hints' },
];

const ENHANCE_ACTIONS = [
  { id: 'custom', icon: '✨', label: 'Improve Writing Quality', hint: 'Clarity, flow, and word choice' },
  { id: 'custom', icon: '🎯', label: 'Strengthen EEAT Signals', hint: 'Add expertise and authority markers' },
  { id: 'custom', icon: '📖', label: 'Humanize AI Content', hint: 'Remove AI patterns, add natural voice' },
  { id: 'custom', icon: '🌍', label: 'Add Geographic Context', hint: 'Specific habitats, regions, ecosystems' },
];

const STRUCTURE_ACTIONS = [
  { id: 'custom', icon: '📋', label: 'Generate Article Outline', hint: '10-14 sections with H2/H3 hierarchy' },
  { id: 'custom', icon: '🔗', label: 'Suggest Internal Links', hint: 'Related wildlife topics to link' },
  { id: 'custom', icon: '📊', label: 'Add Statistics Section', hint: 'Conservation data, population counts' },
  { id: 'custom', icon: '🗓', label: 'Add Timeline Section', hint: 'Species evolution or history' },
];

function TonePill({ tone, selected, onClick }) {
  return (
    <button
      onClick={() => onClick(tone)}
      style={{
        padding: '4px 11px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
        border: `1px solid ${selected ? PURPLE : 'var(--adm-border)'}`,
        background: selected ? PURPLE : 'transparent',
        color: selected ? '#fff' : 'var(--adm-text-muted)',
        transition: 'all 0.15s',
      }}
    >
      {tone}
    </button>
  );
}

function ActionItem({ action, onClick, disabled }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={() => onClick(action)}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px',
        borderRadius: 9, border: `1px solid ${hov ? PURPLE_BORDER : 'var(--adm-border)'}`,
        background: hov ? PURPLE_LIGHT : 'transparent',
        cursor: disabled ? 'not-allowed' : 'pointer', boxSizing: 'border-box',
        opacity: disabled ? 0.5 : 1, width: '100%', textAlign: 'left',
        transition: 'all 0.13s',
      }}
    >
      <span style={{ fontSize: 16, color: hov ? PURPLE : 'var(--adm-text-subtle)', flexShrink: 0, marginTop: 1 }}>
        {action.icon}
      </span>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--adm-text)' }}>{action.label}</div>
        <div style={{ fontSize: 10, color: 'var(--adm-text-subtle)', marginTop: 2 }}>{action.hint}</div>
      </div>
    </button>
  );
}

function InsertBar({ content, onInsertAppend, onInsertReplace, onInsertBelow, onClear }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        borderRadius: 10, border: `1px solid ${PURPLE_BORDER}`,
        background: PURPLE_LIGHT, padding: 12,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, color: PURPLE, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
        Generated Content
      </div>
      <div style={{
        maxHeight: 140, overflowY: 'auto', fontSize: 12, color: 'var(--adm-text)',
        lineHeight: 1.6, marginBottom: 10, padding: '8px 10px',
        background: 'var(--adm-surface)', borderRadius: 7, border: '1px solid var(--adm-border)',
      }}
        dangerouslySetInnerHTML={{ __html: content.slice(0, 600) + (content.length > 600 ? '…' : '') }}
      />
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        {[
          { label: 'Insert Into Editor', fn: onInsertAppend, primary: true },
          { label: 'Replace Selected', fn: onInsertReplace },
          { label: 'Insert Below Cursor', fn: onInsertBelow },
        ].map(({ label, fn, primary }) => (
          <button
            key={label}
            onClick={fn}
            style={{
              padding: '5px 11px', borderRadius: 7, fontSize: 11, fontWeight: 600,
              border: primary ? 'none' : `1px solid ${PURPLE_BORDER}`,
              background: primary ? PURPLE : 'transparent',
              color: primary ? '#fff' : PURPLE,
              cursor: 'pointer', flex: primary ? '1 1 100%' : '1 1 auto',
            }}
          >
            {label}
          </button>
        ))}
        <button
          onClick={onClear}
          style={{
            padding: '5px 8px', borderRadius: 7, fontSize: 10,
            border: '1px solid var(--adm-border)', background: 'transparent',
            color: 'var(--adm-text-subtle)', cursor: 'pointer',
          }}
        >
          ✕ Clear
        </button>
      </div>
    </motion.div>
  );
}

export function AIWritingToolkit({
  editor,
  title,
  wordCount,
  onUseHeadline,
  metaTitle = '',
  metaDescription = '',
  metaKeywords = '',
  category = '',
  excerpt = '',
  cover = null,
  palette = { from: '#0c4a1a', via: '#3aa15a', to: '#d4af37' },
  onPaletteChange = () => {},
  postId = null,
  onRestoreVersion = null,
}) {
  const store = useAIStore();
  const [topTab, setTopTab] = useState('AI');
  const [customPrompt, setCustomPrompt] = useState('');
  const [showStreaming, setShowStreaming] = useState(false);

  const runGeneration = useCallback(async (task, extraPrompt) => {
    if (store.isStreaming) return;
    const ctrl = new AbortController();
    store.setStreamController(ctrl);
    store.startStream(task);
    store.clearGenerated();
    setShowStreaming(true);

    try {
      const bodyText = editor?.getHTML() || '';
      const response = await fetch('/api/ai/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ctrl.signal,
        body: JSON.stringify({
          task,
          provider: store.provider,
          context: {
            title,
            body: bodyText,
            tones: store.selectedTones,
            toneIntensity: store.toneIntensity,
            customPrompt: extraPrompt || customPrompt,
            wordTarget: '4,000-5,000',
          },
        }),
      });

      if (!response.ok) throw new Error('Generation failed');
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        store.appendStream(decoder.decode(value, { stream: true }));
      }
      store.finishStream();
    } catch (err) {
      if (err.name !== 'AbortError') {
        store.finishStream();
        console.error('[Write]', err);
      }
    }
  }, [editor, title, store, customPrompt]);

  const handleInsert = (mode) => {
    if (!editor || !store.generatedContent) return;
    if (mode === 'append') {
      editor.chain().focus().insertContent(store.generatedContent).run();
    } else if (mode === 'replace') {
      const { from, to } = editor.state.selection;
      if (from !== to) {
        editor.chain().focus().deleteRange({ from, to }).insertContent(store.generatedContent).run();
      } else {
        editor.chain().focus().insertContent(store.generatedContent).run();
      }
    } else if (mode === 'below') {
      editor.chain().focus().setTextSelection(editor.state.doc.content.size - 1).insertContent(store.generatedContent).run();
    }
    store.clearGenerated();
    setShowStreaming(false);
  };

  const activeActions = store.activeWritingTab === 'Generate' ? GENERATE_ACTIONS
    : store.activeWritingTab === 'Enhance' ? ENHANCE_ACTIONS
    : STRUCTURE_ACTIONS;

  return (
    <div>
      <style>{`.ai-wt-subtabs::-webkit-scrollbar{display:none}`}</style>
      {/* ── Header ─────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10, flexShrink: 0,
          background: `linear-gradient(135deg, ${PURPLE}, #a855f7)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16,
        }}>✦</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--adm-text)' }}>Writing Toolkit</div>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700, color: 'var(--adm-text-subtle)',
          background: 'var(--adm-hover-bg)', padding: '2px 7px', borderRadius: 5,
        }}>2026</span>
      </div>

      {/* ── Top tabs (color-coded, horizontally scrollable) ─── */}
      <div className="ai-wt-toptabs" style={{
        display: 'flex', gap: 0,
        borderBottom: '1px solid var(--adm-border)',
        marginBottom: 12,
        overflowX: 'auto',
        scrollbarWidth: 'none', msOverflowStyle: 'none',
      }}>
        {TOP_TABS.map((t) => {
          const active = topTab === t.id;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTopTab(t.id)}
              title={t.label}
              style={{
                flexShrink: 0,
                padding: '7px 9px',
                fontSize: 10, fontWeight: 700,
                border: 'none', background: 'transparent',
                color: active ? t.color : 'var(--adm-text-subtle)',
                borderBottom: active ? `2px solid ${t.color}` : '2px solid transparent',
                cursor: 'pointer', whiteSpace: 'nowrap',
                transition: 'color 0.12s, border-color 0.12s',
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              <Icon size={11} />
              {t.label}
            </button>
          );
        })}
      </div>

      {topTab === 'AI' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Status bar */}
          <div style={{
            padding: '8px 11px', borderRadius: 8, background: PURPLE_LIGHT,
            border: `1px solid ${PURPLE_BORDER}`,
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: PURPLE, marginBottom: 3 }}>
              ◉ AdSense-Ready • EEAT Compliant • SEO Optimized
            </div>
            <div style={{ fontSize: 10, color: '#f59e0b', fontWeight: 600 }}>
              Target: 4,000–5,000 words ({wordCount} / 4,000)
            </div>
            {/* word progress bar */}
            <div style={{ height: 3, background: 'var(--adm-border)', borderRadius: 2, marginTop: 5, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 2, transition: 'width 0.4s ease',
                width: `${Math.min((wordCount / 4000) * 100, 100)}%`,
                background: wordCount >= 4000 ? '#22c55e' : PURPLE,
              }} />
            </div>
          </div>

          {/* Tone */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--adm-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 7 }}>
              Writing Tone
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {TONES.map(t => (
                <TonePill key={t} tone={t} selected={store.selectedTones.includes(t)} onClick={store.setTone} />
              ))}
            </div>
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: 'var(--adm-text-subtle)' }}>Tone intensity</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: PURPLE }}>{store.toneIntensity}%</span>
              </div>
              <input
                type="range" min={20} max={100} value={store.toneIntensity}
                onChange={e => store.setToneIntensity(Number(e.target.value))}
                style={{ width: '100%', accentColor: PURPLE }}
              />
            </div>
          </div>

          {/* Sub-tabs */}
          <div className="ai-wt-subtabs" style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--adm-border)', overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {WRITING_TABS.map(t => (
              <button key={t} onClick={() => store.setActiveWritingTab(t)} style={{
                flexShrink: 0, padding: '6px 10px', fontSize: 10, fontWeight: 700, border: 'none', background: 'transparent',
                color: store.activeWritingTab === t ? PURPLE : 'var(--adm-text-subtle)',
                borderBottom: store.activeWritingTab === t ? `2px solid ${PURPLE}` : '2px solid transparent',
                cursor: 'pointer', whiteSpace: 'nowrap',
              }}>{t}</button>
            ))}
          </div>

          {/* Info box (Generate tab only) */}
          {store.activeWritingTab === 'Generate' && (
            <div style={{
              padding: '10px 12px', borderRadius: 8,
              background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.2)',
              fontSize: 11, color: '#2563eb', lineHeight: 1.55,
            }}>
              <strong>Full Article Mode:</strong> Generates a 4,000–5,000 word comprehensive article with EEAT signals, AdSense compliance, 10–14 sections, FAQ, statistics, and internal link placeholders.
            </div>
          )}

          {/* Action list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {activeActions.map((action) => (
              <ActionItem
                key={action.id + action.label}
                action={action}
                disabled={store.isStreaming || (action.needsTitle && !title)}
                onClick={(a) => {
                  const promptMap = {
                    'Improve Writing Quality': `Rewrite the following article with significantly improved writing quality. Maintain all facts but elevate vocabulary, sentence variety, and narrative engagement: ${editor?.getHTML()?.replace(/<[^>]*>/g, ' ').slice(0, 1500)}`,
                    'Strengthen EEAT Signals': `Add EEAT signals (expertise, authority, trust) to this article. Add specific statistics, cite conservation organizations, include scientific consensus. Article: ${editor?.getHTML()?.replace(/<[^>]*>/g, ' ').slice(0, 1500)}`,
                    'Humanize AI Content': `Rewrite this article to sound completely human. Remove any AI patterns. Add personal observations, varied sentence length, natural transitions: ${editor?.getHTML()?.replace(/<[^>]*>/g, ' ').slice(0, 1500)}`,
                    'Add Geographic Context': `Add specific geographic context to this wildlife article — exact countries, biomes, national parks, elevation ranges: ${editor?.getHTML()?.replace(/<[^>]*>/g, ' ').slice(0, 1500)}`,
                    'Generate Article Outline': `Generate a comprehensive 10-14 section article outline for a wildlife article titled "${title}". Include H2 and H3 headings in HTML format.`,
                    'Suggest Internal Links': `Analyze this wildlife article and suggest 8-10 specific internal link opportunities with anchor text and target topic: ${editor?.getHTML()?.replace(/<[^>]*>/g, ' ').slice(0, 1500)}`,
                    'Add Statistics Section': `Write a statistics-rich section about ${title} with conservation data, population counts, habitat loss percentages, and research findings. Format as HTML.`,
                    'Add Timeline Section': `Write a timeline section for ${title} covering evolutionary history, significant events, discovery dates. Format as HTML with year markers.`,
                  };
                  const customP = promptMap[a.label];
                  runGeneration(a.id === 'custom' ? 'custom' : a.id, customP);
                }}
              />
            ))}
          </div>

          {/* Streaming preview */}
          <AnimatePresence>
            {store.isStreaming && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{
                  padding: '10px 12px', borderRadius: 8,
                  background: 'var(--adm-surface)', border: `1px solid ${PURPLE_BORDER}`,
                  fontSize: 11, color: 'var(--adm-text)', lineHeight: 1.6,
                  maxHeight: 150, overflowY: 'auto',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <motion.div
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                    style={{ width: 6, height: 6, borderRadius: '50%', background: PURPLE }}
                  />
                  <span style={{ fontSize: 10, fontWeight: 700, color: PURPLE }}>
                    Generating with {store.provider === 'claude' ? 'Claude' : 'OpenAI'}…
                  </span>
                  <button
                    onClick={store.cancelStream}
                    style={{ marginLeft: 'auto', fontSize: 10, color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                </div>
                <div dangerouslySetInnerHTML={{ __html: store.streamedContent.slice(0, 400) + (store.streamedContent.length > 400 ? '…' : '') }} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Generated content insert bar */}
          <AnimatePresence>
            {!store.isStreaming && store.generatedContent && (
              <InsertBar
                content={store.generatedContent}
                onInsertAppend={() => handleInsert('append')}
                onInsertReplace={() => handleInsert('replace')}
                onInsertBelow={() => handleInsert('below')}
                onClear={store.clearGenerated}
              />
            )}
          </AnimatePresence>

          {/* Custom prompt */}
          <div style={{ borderTop: '1px solid var(--adm-border)', paddingTop: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--adm-text)', marginBottom: 7 }}>
              Custom Article Prompt
            </div>
            <textarea
              value={customPrompt}
              onChange={e => setCustomPrompt(e.target.value)}
              placeholder="Describe the article you want… e.g. 'Write a comprehensive guide on the African lion\'s hunting strategies targeting wildlife tourists visiting the Serengeti'"
              rows={3}
              style={{
                width: '100%', resize: 'none', borderRadius: 9, fontSize: 11,
                border: '1px solid var(--adm-border)', background: 'var(--adm-bg)',
                color: 'var(--adm-text)', padding: '9px 11px', outline: 'none',
                lineHeight: 1.55, boxSizing: 'border-box',
              }}
            />
            <button
              onClick={() => runGeneration('custom')}
              disabled={store.isStreaming || !customPrompt.trim()}
              style={{
                marginTop: 7, width: '100%', padding: '10px', borderRadius: 9,
                background: store.isStreaming ? 'var(--adm-hover-bg)' : `linear-gradient(135deg, ${PURPLE}, #a855f7)`,
                color: store.isStreaming ? 'var(--adm-text-muted)' : '#fff',
                fontWeight: 700, fontSize: 12, border: 'none',
                cursor: store.isStreaming || !customPrompt.trim() ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                opacity: !customPrompt.trim() && !store.isStreaming ? 0.5 : 1,
              }}
            >
              <span>✦</span>
              {store.isStreaming ? 'Generating…' : 'Generate 4,000+ Word Article'}
            </button>
          </div>
        </div>
      )}

      {topTab === 'Headlines' && (
        <HeadlinePanel
          initialTopic={title}
          initialCategory={category}
          onUseHeadline={onUseHeadline}
        />
      )}

      {topTab === 'Links' && (
        <InternalLinksPanel editor={editor} />
      )}

      {topTab === 'Proof' && (
        <ProofingPanel editor={editor} />
      )}

      {topTab === 'SEO' && (
        <SEOScorePanel
          title={title}
          body={editor?.getHTML() || ''}
          metaTitle={metaTitle}
          metaDescription={metaDescription}
          metaKeywords={metaKeywords}
        />
      )}

      {topTab === 'Orig' && (
        <OriginalityPanel editor={editor} />
      )}

      {topTab === 'Design' && (
        <DesignStudioPanel
          cover={cover}
          palette={palette}
          onPaletteChange={onPaletteChange}
        />
      )}

      {topTab === 'Media' && (
        <MediaTranscribePanel editor={editor} />
      )}

      {topTab === 'History' && (
        <VersionHistoryPanel
          editor={editor}
          title={title}
          postId={postId}
          onRestore={onRestoreVersion}
        />
      )}

      {topTab === 'AIMedia' && (
        <AIMediaPanel
          editor={editor}
          title={title}
          body={editor?.getHTML() || ''}
        />
      )}

      {topTab === 'AdSense' && (
        <AdSenseCheckPanel
          editor={editor}
          title={title}
          excerpt={excerpt}
        />
      )}
    </div>
  );
}
