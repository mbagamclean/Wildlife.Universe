'use client';
import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAIStore } from '@/lib/stores/aiStore';

const GRAD = 'linear-gradient(135deg, #7c3aed, #ec4899)';
const PURPLE = '#7c3aed';
const PINK = '#ec4899';

const IMG_PROVIDERS = [
  { id: 'openai', label: 'OpenAI DALL·E 3', badge: 'DALL·E 3' },
  { id: 'gemini', label: 'Gemini Imagen 3', badge: 'Imagen 3' },
];

const IMAGE_TABS = ['Text to Image', 'Transform', 'Bulk'];

function ImageCard({ image, onInsert }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        borderRadius: 10, overflow: 'hidden', position: 'relative',
        border: '1px solid var(--adm-border)',
        aspectRatio: '16/9',
      }}
    >
      <img
        src={image.imageUrl}
        alt={image.altText}
        loading="lazy"
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
      <AnimatePresence>
        {hov && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 10,
            }}
          >
            <button
              onClick={() => onInsert(image, 'image')}
              style={{
                padding: '6px 14px', borderRadius: 7, fontSize: 11, fontWeight: 700,
                background: GRAD, color: '#fff', border: 'none', cursor: 'pointer',
              }}
            >
              Insert Into Editor
            </button>
            <button
              onClick={() => onInsert(image, 'cover')}
              style={{
                padding: '5px 12px', borderRadius: 7, fontSize: 10, fontWeight: 600,
                background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer',
              }}
            >
              Set as Cover Image
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BulkJobRow({ job, index }) {
  const statusColor = job.status === 'done' ? '#22c55e' : job.status === 'error' ? '#ef4444' : job.status === 'processing' ? PURPLE : 'var(--adm-text-subtle)';
  const statusIcon = job.status === 'done' ? '✓' : job.status === 'error' ? '✗' : job.status === 'processing' ? '⟳' : '◌';

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      style={{
        padding: '9px 11px', borderRadius: 8, border: '1px solid var(--adm-border)',
        background: 'var(--adm-surface)', display: 'flex', alignItems: 'flex-start', gap: 9,
      }}
    >
      <motion.span
        animate={job.status === 'processing' ? { rotate: 360 } : {}}
        transition={job.status === 'processing' ? { repeat: Infinity, duration: 1, ease: 'linear' } : {}}
        style={{ color: statusColor, fontSize: 14, flexShrink: 0, marginTop: 1, display: 'inline-block' }}
      >
        {statusIcon}
      </motion.span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--adm-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {job.heading}
        </div>
        {job.status === 'error' && (
          <div style={{ fontSize: 10, color: '#ef4444', marginTop: 2 }}>{job.error}</div>
        )}
        {job.status === 'processing' && (
          <div style={{ fontSize: 10, color: PURPLE, marginTop: 2 }}>Generating image…</div>
        )}
      </div>
      {job.status === 'done' && job.imageUrl && (
        <img src={job.imageUrl} alt="" style={{ width: 40, height: 28, objectFit: 'cover', borderRadius: 5, flexShrink: 0 }} />
      )}
    </motion.div>
  );
}

export function AIImageGenerator({ editor, onCoverChange }) {
  const store = useAIStore();
  const [activeTab, setActiveTab] = useState('Text to Image');
  const [h2Headings, setH2Headings] = useState([]);

  // Detect H2 headings from editor
  useEffect(() => {
    if (!editor) return;
    const headings = [];
    editor.state.doc.descendants((node) => {
      if (node.type.name === 'heading' && node.attrs.level === 2) {
        headings.push(node.textContent);
      }
    });
    setH2Headings(headings);
    if (store.bulkJobs.length === 0 && headings.length > 0) {
      store.setBulkJobs(headings.map(h => ({ heading: h, status: 'pending', imageUrl: null, error: null })));
    }
  }, [editor?.state.doc]);

  const generateSingle = useCallback(async () => {
    if (store.isGeneratingImage || !store.imagePrompt.trim()) return;
    store.setIsGeneratingImage(true);
    try {
      const res = await fetch('/api/ai/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: store.imagePrompt,
          mode: 'text_to_image',
          provider: store.imageProvider,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      store.addGeneratedImage(json);
    } catch (err) {
      console.error('[Image Gen]', err);
    } finally {
      store.setIsGeneratingImage(false);
    }
  }, [store]);

  const generateTransform = useCallback(async () => {
    if (store.isGeneratingImage || !store.transformPrompt.trim() || !store.transformSourceUrl.trim()) return;
    store.setIsGeneratingImage(true);
    try {
      const transformedPrompt = `Transform this image: ${store.transformSourceUrl}. Instructions: ${store.transformPrompt}. Maintain animal anatomy accuracy and wildlife realism.`;
      const res = await fetch('/api/ai/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: transformedPrompt, mode: 'transform', provider: store.imageProvider }),
      });
      const json = await res.json();
      if (json.success) store.addGeneratedImage(json);
    } catch (err) {
      console.error('[Transform]', err);
    } finally {
      store.setIsGeneratingImage(false);
    }
  }, [store]);

  const generateBulk = useCallback(async () => {
    if (store.isBulkRunning || h2Headings.length === 0) return;
    store.setIsBulkRunning(true);

    // Build context for each heading by reading editor content
    const headingData = [];
    let currentH2 = null;
    let contextParts = [];

    editor?.state.doc.descendants((node) => {
      if (node.type.name === 'heading' && node.attrs.level === 2) {
        if (currentH2) headingData.push({ heading: currentH2, context: contextParts.join(' ') });
        currentH2 = node.textContent;
        contextParts = [];
      } else if (currentH2 && node.isText) {
        contextParts.push(node.text || '');
      }
    });
    if (currentH2) headingData.push({ heading: currentH2, context: contextParts.join(' ') });

    // Reset jobs
    const jobs = headingData.map(h => ({ ...h, status: 'pending', imageUrl: null, error: null }));
    store.setBulkJobs(jobs);

    // Process one at a time (sequential to respect rate limits)
    for (let i = 0; i < headingData.length; i++) {
      store.updateBulkJob(i, { status: 'processing' });

      try {
        const res = await fetch('/api/ai/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'bulk',
            provider: store.imageProvider,
            headings: [headingData[i]],
          }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.results?.[0]?.error || 'Failed');
        const result = json.results?.[0];
        store.updateBulkJob(i, {
          status: result?.status === 'done' ? 'done' : 'error',
          imageUrl: result?.imageUrl,
          error: result?.error,
        });

        // Auto-insert into editor before the H2
        if (result?.status === 'done' && result?.imageUrl && editor) {
          let headingPos = null;
          editor.state.doc.descendants((node, pos) => {
            if (node.type.name === 'heading' && node.attrs.level === 2 && node.textContent === headingData[i].heading && headingPos === null) {
              headingPos = pos;
            }
          });
          if (headingPos !== null) {
            editor.chain().focus().setTextSelection(headingPos).insertContent(
              `<figure><img src="${result.imageUrl}" alt="${result.altText || headingData[i].heading}" loading="lazy" /><figcaption>${result.caption || headingData[i].heading}</figcaption></figure>`
            ).run();
          }
        }
      } catch (err) {
        store.updateBulkJob(i, { status: 'error', error: err.message });
      }
    }

    store.setIsBulkRunning(false);
  }, [editor, h2Headings, store]);

  const insertImage = useCallback((image, mode) => {
    if (mode === 'cover') {
      onCoverChange?.(image.imageUrl);
      return;
    }
    if (!editor) return;
    editor.chain().focus().insertContent(
      `<figure><img src="${image.imageUrl}" alt="${image.altText || ''}" loading="lazy" /><figcaption>${image.caption || ''}</figcaption></figure>`
    ).run();
  }, [editor, onCoverChange]);

  const activeProvider = IMG_PROVIDERS.find(p => p.id === store.imageProvider) || IMG_PROVIDERS[0];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10, flexShrink: 0,
          background: GRAD,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
        }}>🖼</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--adm-text)' }}>AI Image Generator</div>
          <div style={{ fontSize: 9, color: 'var(--adm-text-subtle)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {activeProvider.badge} · 8K UHD · 16:9 · Canon EOS R5
          </div>
        </div>
        {/* Provider selector */}
        <select
          value={store.imageProvider}
          onChange={e => store.setImageProvider(e.target.value)}
          style={{
            fontSize: 10, fontWeight: 600, padding: '3px 6px', borderRadius: 6,
            border: '1px solid var(--adm-border)', background: 'var(--adm-surface)',
            color: 'var(--adm-text)', cursor: 'pointer', maxWidth: 90,
          }}
        >
          {IMG_PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.badge}</option>)}
        </select>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--adm-border)', marginBottom: 12 }}>
        {IMAGE_TABS.map(t => {
          const label = t === 'Text to Image' ? 'Generate' : t === 'Bulk' ? `Bulk (${h2Headings.length})` : t;
          return (
            <button key={t} onClick={() => setActiveTab(t)} style={{
              flex: 1, padding: '7px 4px', fontSize: 10, fontWeight: 700, border: 'none', background: 'transparent',
              color: activeTab === t ? PURPLE : 'var(--adm-text-subtle)',
              borderBottom: activeTab === t ? `2px solid ${PURPLE}` : '2px solid transparent',
              cursor: 'pointer', whiteSpace: 'nowrap',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
            }}>
              {t === 'Text to Image' ? '✦' : t === 'Transform' ? '✨' : '≡'} {label}
            </button>
          );
        })}
      </div>

      {/* Text to Image */}
      {activeTab === 'Text to Image' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--adm-text)', marginBottom: 6 }}>Describe the image</div>
            <textarea
              value={store.imagePrompt}
              onChange={e => store.setImagePrompt(e.target.value)}
              placeholder="e.g. A pride of lions resting under an acacia tree at sunset on the Serengeti plains, golden hour lighting"
              rows={3}
              style={{
                width: '100%', resize: 'none', borderRadius: 9, fontSize: 11,
                border: '1px solid var(--adm-border)', background: 'var(--adm-bg)',
                color: 'var(--adm-text)', padding: '9px 11px', outline: 'none',
                lineHeight: 1.55, boxSizing: 'border-box',
              }}
            />
            <div style={{ fontSize: 10, color: 'var(--adm-text-subtle)', marginTop: 5 }}>
              Image style auto-applied: 8K UHD, Canon EOS R5, 16:9, no AI smoothing.
            </div>
          </div>

          <button
            onClick={generateSingle}
            disabled={store.isGeneratingImage || !store.imagePrompt.trim()}
            style={{
              padding: '11px', borderRadius: 10, fontSize: 13, fontWeight: 700,
              border: 'none', background: store.isGeneratingImage ? 'var(--adm-hover-bg)' : GRAD,
              color: store.isGeneratingImage ? 'var(--adm-text-muted)' : '#fff',
              cursor: store.isGeneratingImage || !store.imagePrompt.trim() ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: !store.imagePrompt.trim() && !store.isGeneratingImage ? 0.5 : 1,
            }}
          >
            {store.isGeneratingImage ? (
              <><motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ display: 'inline-block' }}>⟳</motion.span> Generating…</>
            ) : (
              <><span>✦</span> Generate Image</>
            )}
          </button>

          {/* Generated images */}
          {store.generatedImages.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--adm-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Generated Images
              </div>
              {store.generatedImages.slice(0, 4).map((img, i) => (
                <motion.div key={i} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
                  <ImageCard image={img} onInsert={insertImage} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Transform */}
      {activeTab === 'Transform' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--adm-text)', marginBottom: 5 }}>Source Image URL</div>
            <input
              value={store.transformSourceUrl}
              onChange={e => store.setTransformSourceUrl(e.target.value)}
              placeholder="https://example.com/wildlife-image.jpg"
              style={{
                width: '100%', borderRadius: 8, border: '1px solid var(--adm-border)',
                background: 'var(--adm-bg)', color: 'var(--adm-text)',
                padding: '7px 10px', fontSize: 11, outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--adm-text)', marginBottom: 5 }}>Transformation Instructions</div>
            <textarea
              value={store.transformPrompt}
              onChange={e => store.setTransformPrompt(e.target.value)}
              placeholder="e.g. Add dramatic sunset lighting, convert to rainy season atmosphere, add dust from a running herd"
              rows={3}
              style={{
                width: '100%', resize: 'none', borderRadius: 8, fontSize: 11,
                border: '1px solid var(--adm-border)', background: 'var(--adm-bg)',
                color: 'var(--adm-text)', padding: '8px 10px', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ fontSize: 10, color: 'var(--adm-text-subtle)', padding: '6px 10px', borderRadius: 7, background: 'var(--adm-surface)', border: '1px solid var(--adm-border)' }}>
            Transformation preserves animal anatomy, wildlife accuracy, and species realism.
          </div>
          <button
            onClick={generateTransform}
            disabled={store.isGeneratingImage}
            style={{
              padding: '10px', borderRadius: 9, fontSize: 12, fontWeight: 700, border: 'none',
              background: store.isGeneratingImage ? 'var(--adm-hover-bg)' : GRAD,
              color: store.isGeneratingImage ? 'var(--adm-text-muted)' : '#fff',
              cursor: store.isGeneratingImage ? 'wait' : 'pointer',
            }}
          >
            {store.isGeneratingImage ? '⟳ Processing…' : '✦ Transform Image'}
          </button>
          {store.generatedImages.length > 0 && (
            <ImageCard image={store.generatedImages[0]} onInsert={insertImage} />
          )}
        </div>
      )}

      {/* Bulk */}
      {activeTab === 'Bulk' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{
            padding: '10px 12px', borderRadius: 9,
            background: 'rgba(124,58,237,0.07)', border: '1px solid rgba(124,58,237,0.2)',
            fontSize: 11, color: PURPLE, lineHeight: 1.55,
          }}>
            <strong>Bulk Mode:</strong> AI reads each H2 section's content, generates a context-matched wildlife image, and inserts it before the corresponding H2 automatically.
          </div>

          {h2Headings.length === 0 ? (
            <div style={{ fontSize: 11, color: 'var(--adm-text-subtle)', textAlign: 'center', padding: '16px 0' }}>
              No H2 headings detected. Add H2 sections to your article first.
            </div>
          ) : (
            <>
              <div style={{ fontSize: 11, color: 'var(--adm-text-subtle)' }}>
                {h2Headings.length} H2 section{h2Headings.length !== 1 ? 's' : ''} detected. Each will get a unique wildlife image.
              </div>
              <button
                onClick={generateBulk}
                disabled={store.isBulkRunning}
                style={{
                  padding: '11px', borderRadius: 10, fontSize: 12, fontWeight: 700, border: 'none',
                  background: store.isBulkRunning ? 'var(--adm-hover-bg)' : GRAD,
                  color: store.isBulkRunning ? 'var(--adm-text-muted)' : '#fff',
                  cursor: store.isBulkRunning ? 'wait' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {store.isBulkRunning ? (
                  <><motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ display: 'inline-block' }}>⟳</motion.span> Generating {h2Headings.length} images…</>
                ) : (
                  <><span>≡</span> Generate All {h2Headings.length} Section Images</>
                )}
              </button>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {store.bulkJobs.map((job, i) => (
                  <BulkJobRow key={i} job={job} index={i} />
                ))}
              </div>
            </>
          )}

          {/* CEO Tools section */}
          <div style={{ marginTop: 4, paddingTop: 12, borderTop: '1px solid var(--adm-border)' }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.09em', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
              <span>✦</span> CEO Tools
            </div>
            <div style={{ fontSize: 11, color: '#f59e0b', lineHeight: 1.55 }}>
              Advanced editorial review tools are available in the Editorial Review section from the sidebar menu.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
