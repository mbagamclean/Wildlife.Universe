'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { categories } from '@/lib/mock/categories';
import { MediaUpload } from './MediaUpload';
import { WritingToolkit } from './editor/WritingToolkit';

// ---- Utilities ----
function toSlug(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function countWords(html) {
  const text = (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return text ? text.split(' ').filter(Boolean).length : 0;
}

function readTime(words) {
  const m = Math.ceil(words / 200);
  return m === 1 ? '1 min read' : `${m} min read`;
}

function calcSeo(title, desc, slug, cover, words) {
  let s = 0;
  if (title.length >= 40 && title.length <= 70) s += 20; else if (title.length > 0) s += 8;
  if (desc.length >= 100 && desc.length <= 170) s += 20; else if (desc.length > 0) s += 8;
  if (slug) s += 10;
  if (cover) s += 15;
  if (words >= 300) s += 35; else if (words >= 100) s += 15; else if (words > 0) s += 5;
  return Math.min(s, 100);
}

// ---- Toolbar button ----
function TBtn({ title: tip, onMouseDown, children }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      title={tip}
      onMouseDown={onMouseDown}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        minWidth: 28, height: 26, padding: '0 5px', borderRadius: 5, border: 'none',
        background: hov ? 'var(--adm-hover-bg)' : 'transparent',
        color: 'var(--adm-text)', cursor: 'pointer', fontSize: 12,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 500, transition: 'background 0.1s', flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

function TDivider() {
  return <div style={{ width: 1, height: 18, background: 'var(--adm-border)', margin: '0 3px', alignSelf: 'center', flexShrink: 0 }} />;
}

// ---- Sidebar section ----
function SideSection({ label, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: '1px solid var(--adm-border)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px', background: 'transparent', border: 'none',
          color: 'var(--adm-text)', fontSize: 10, fontWeight: 800,
          cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.09em',
        }}
      >
        {label}
        <span style={{ opacity: 0.5, fontSize: 9, transform: open ? 'none' : 'rotate(-90deg)', transition: 'transform 0.18s', display: 'inline-block' }}>▾</span>
      </button>
      {open && <div style={{ padding: '0 14px 13px' }}>{children}</div>}
    </div>
  );
}

// ---- Header action buttons ----
function HBtn({ onClick, primary, disabled, style: extra, children }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: '5px 13px', borderRadius: 7, fontSize: 11, fontWeight: 600,
        border: primary ? 'none' : '1px solid var(--adm-border)',
        background: primary
          ? (hov ? '#b8952e' : '#d4af37')
          : (hov ? 'var(--adm-hover-bg)' : 'transparent'),
        color: primary ? '#000' : 'var(--adm-text)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'background 0.13s',
        whiteSpace: 'nowrap', flexShrink: 0,
        ...extra,
      }}
    >
      {children}
    </button>
  );
}

// ---- Small field label ----
function FieldLabel({ children, count, max }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--adm-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
        {children}
      </span>
      {max != null && (
        <span style={{ fontSize: 10, color: count > max * 0.9 ? '#f59e0b' : 'var(--adm-text-subtle)' }}>
          {count}/{max}
        </span>
      )}
    </div>
  );
}

const fieldStyle = {
  borderRadius: 7, border: '1px solid var(--adm-border)', background: 'var(--adm-bg)',
  color: 'var(--adm-text)', padding: '6px 9px', fontSize: 12, outline: 'none', width: '100%',
  boxSizing: 'border-box',
};

// ---- Main component ----
export function PostEditor({ initial, onSave, onCancel }) {
  const editorRef = useRef(null);
  const debounceRef = useRef(null);
  const autosaveTimerRef = useRef(null);
  const draftKey = `cms-draft-${initial?.id || 'new'}`;

  const [slugEdited, setSlugEdited] = useState(!!initial?.slug);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [seoOpen, setSeoOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [wordCount, setWordCount] = useState(0);
  const [bodyHtml, setBodyHtml] = useState(initial?.body || '');

  const [title, setTitle] = useState(initial?.title || '');
  const [slug, setSlug] = useState(initial?.slug || '');
  const [category, setCategory] = useState(initial?.category || 'animals');
  const [label, setLabel] = useState(initial?.label || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [excerpt, setExcerpt] = useState('');
  const [cover, setCover] = useState(initial?.cover || '');
  const [palette, setPalette] = useState(initial?.coverPalette || { from: '#0c4a1a', via: '#3aa15a', to: '#d4af37' });
  const [featured, setFeatured] = useState(!!initial?.featured);
  const [published, setPublished] = useState(initial?.status === 'published');
  const [publishDate, setPublishDate] = useState(
    initial?.createdAt ? String(initial.createdAt).slice(0, 10) : new Date().toISOString().slice(0, 10)
  );
  const [tags, setTags] = useState(Array.isArray(initial?.tags) ? initial.tags.join(', ') : '');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDesc, setMetaDesc] = useState('');
  const [metaKw, setMetaKw] = useState('');

  const currentCat = useMemo(() => categories.find(c => c.slug === category), [category]);
  const labelOptions = currentCat?.labels || [];

  // Reset label when category changes
  useEffect(() => {
    if (!labelOptions.includes(label)) setLabel(labelOptions[0] || '');
  }, [category]); // eslint-disable-line

  // Auto-slug from title
  useEffect(() => {
    if (!slugEdited) setSlug(toSlug(title));
  }, [title, slugEdited]);

  // Seed editor with initial body
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = initial?.body || '';
      const wc = countWords(initial?.body || '');
      setWordCount(wc);
      setBodyHtml(initial?.body || '');
    }
  }, []); // eslint-disable-line

  // Autosave every 10s
  useEffect(() => {
    autosaveTimerRef.current = setInterval(() => {
      const html = editorRef.current?.innerHTML || '';
      try {
        localStorage.setItem(draftKey, JSON.stringify({ title, slug, category, label, description, body: html, cover, palette, featured, tags }));
        setSavedAt(new Date());
      } catch (_) {}
    }, 10000);
    return () => clearInterval(autosaveTimerRef.current);
  }, [title, slug, category, label, description, cover, palette, featured, tags]); // eslint-disable-line

  const seoScore = useMemo(
    () => calcSeo(title, description, slug, cover, wordCount),
    [title, description, slug, cover, wordCount]
  );

  // Editor input handler
  const handleInput = useCallback(() => {
    const html = editorRef.current?.innerHTML || '';
    setWordCount(countWords(html));
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setBodyHtml(html), 1200);
  }, []);

  // execCommand wrapper — onMouseDown + e.preventDefault() keeps editor focus
  const exec = useCallback((cmd, val = null) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
  }, []);

  const fmtBlock = useCallback((tag) => {
    document.execCommand('formatBlock', false, tag);
    editorRef.current?.focus();
  }, []);

  const insertLink = useCallback(() => {
    const url = prompt('Enter URL:');
    if (url) exec('createLink', url);
  }, [exec]);

  // Save
  const handleSave = async (status) => {
    setSaving(true);
    const body = editorRef.current?.innerHTML || '';
    const coverUrl = typeof cover === 'string' ? cover : (cover?.sources?.[0] || '');
    const payload = {
      title: title.trim(),
      slug: slug.trim(),
      category,
      label,
      description: description.trim(),
      body,
      cover: coverUrl,
      coverPalette: palette,
      featured,
      status,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
    };
    try {
      await onSave(payload);
      localStorage.removeItem(draftKey);
    } finally {
      setSaving(false);
    }
  };

  const HEADER_H = 52;

  return (
    <>
      {/* Editor typography */}
      <style>{`
        [data-post-editor] h1{font-size:2em;font-weight:700;margin:.4em 0;line-height:1.2}
        [data-post-editor] h2{font-size:1.5em;font-weight:700;margin:.4em 0;line-height:1.25}
        [data-post-editor] h3{font-size:1.2em;font-weight:600;margin:.35em 0;line-height:1.3}
        [data-post-editor] p{margin:.5em 0}
        [data-post-editor] ul{list-style:disc;padding-left:1.6em;margin:.5em 0}
        [data-post-editor] ol{list-style:decimal;padding-left:1.6em;margin:.5em 0}
        [data-post-editor] li{margin:.2em 0}
        [data-post-editor] a{color:#d4af37;text-decoration:underline}
        [data-post-editor] blockquote{border-left:3px solid #d4af37;padding-left:1em;margin:.5em 0;color:var(--adm-text-muted);font-style:italic}
        [data-post-editor] pre{background:var(--adm-surface);border:1px solid var(--adm-border);padding:12px 14px;border-radius:8px;font-family:monospace;font-size:.85em;overflow-x:auto;margin:.5em 0}
        [data-post-editor] code{background:var(--adm-hover-bg);padding:1px 4px;border-radius:3px;font-size:.88em;font-family:monospace}
        [data-post-editor] hr{border:none;border-top:1px solid var(--adm-border);margin:1em 0}
        [data-post-editor]:empty:before{content:attr(data-placeholder);color:var(--adm-text-subtle);pointer-events:none}
        [data-post-editor]:focus{outline:none}
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: 'var(--adm-bg)' }}>

        {/* ===== STICKY HEADER ===== */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 50,
          background: 'var(--adm-surface)',
          borderBottom: '1px solid var(--adm-border)',
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 14px', height: HEADER_H,
          boxSizing: 'border-box',
        }}>
          {/* Left */}
          <button
            onClick={onCancel}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px',
              borderRadius: 6, border: '1px solid var(--adm-border)',
              background: 'transparent', color: 'var(--adm-text)',
              fontSize: 11, cursor: 'pointer', flexShrink: 0,
            }}
          >
            ← Back
          </button>

          <div style={{ width: 1, height: 18, background: 'var(--adm-border)', flexShrink: 0 }} />

          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Post title…"
            style={{
              flex: 1, minWidth: 0, background: 'transparent', border: 'none',
              outline: 'none', fontSize: 13, fontWeight: 600, color: 'var(--adm-text)',
            }}
          />

          {/* Word / time badges */}
          <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
            {[`${wordCount} words`, readTime(wordCount)].map(t => (
              <span key={t} style={{
                fontSize: 10, color: 'var(--adm-text-subtle)',
                background: 'var(--adm-hover-bg)',
                padding: '2px 7px', borderRadius: 20, whiteSpace: 'nowrap',
              }}>{t}</span>
            ))}
          </div>

          {/* Right actions */}
          <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
            <HBtn onClick={() => setSidebarOpen(o => !o)}>
              {sidebarOpen ? 'Hide Panel' : 'Show Panel'}
            </HBtn>
            <HBtn onClick={() => window.print()}>Print</HBtn>
            <HBtn onClick={() => handleSave('draft')} disabled={saving}>
              {saving ? 'Saving…' : 'Save Draft'}
            </HBtn>
            <HBtn primary onClick={() => handleSave('published')} disabled={saving}>
              Publish Now
            </HBtn>
          </div>
        </div>

        {/* ===== BODY ROW ===== */}
        <div style={{ display: 'flex', flex: 1, alignItems: 'flex-start' }}>

          {/* ===== MAIN COLUMN ===== */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

            {/* Formatting toolbar */}
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center',
              padding: '6px 14px', borderBottom: '1px solid var(--adm-border)',
              background: 'var(--adm-surface)',
              position: 'sticky', top: HEADER_H, zIndex: 40,
            }}>
              <TBtn tip="Bold" onMouseDown={e => { e.preventDefault(); exec('bold'); }}><b>B</b></TBtn>
              <TBtn tip="Italic" onMouseDown={e => { e.preventDefault(); exec('italic'); }}><i>I</i></TBtn>
              <TBtn tip="Underline" onMouseDown={e => { e.preventDefault(); exec('underline'); }}><u>U</u></TBtn>
              <TBtn tip="Strikethrough" onMouseDown={e => { e.preventDefault(); exec('strikeThrough'); }}><s>S</s></TBtn>
              <TBtn tip="Subscript" onMouseDown={e => { e.preventDefault(); exec('subscript'); }}>x₂</TBtn>
              <TBtn tip="Superscript" onMouseDown={e => { e.preventDefault(); exec('superscript'); }}>x²</TBtn>
              <TDivider />
              <TBtn tip="Heading 1" onMouseDown={e => { e.preventDefault(); fmtBlock('h1'); }}>H1</TBtn>
              <TBtn tip="Heading 2" onMouseDown={e => { e.preventDefault(); fmtBlock('h2'); }}>H2</TBtn>
              <TBtn tip="Heading 3" onMouseDown={e => { e.preventDefault(); fmtBlock('h3'); }}>H3</TBtn>
              <TBtn tip="Paragraph" onMouseDown={e => { e.preventDefault(); fmtBlock('p'); }}>¶</TBtn>
              <TBtn tip="Blockquote" onMouseDown={e => { e.preventDefault(); fmtBlock('blockquote'); }}>"</TBtn>
              <TDivider />
              <TBtn tip="Align Left" onMouseDown={e => { e.preventDefault(); exec('justifyLeft'); }}>≡L</TBtn>
              <TBtn tip="Center" onMouseDown={e => { e.preventDefault(); exec('justifyCenter'); }}>≡C</TBtn>
              <TBtn tip="Align Right" onMouseDown={e => { e.preventDefault(); exec('justifyRight'); }}>R≡</TBtn>
              <TBtn tip="Justify" onMouseDown={e => { e.preventDefault(); exec('justifyFull'); }}>≡≡</TBtn>
              <TDivider />
              <TBtn tip="Bullet List" onMouseDown={e => { e.preventDefault(); exec('insertUnorderedList'); }}>•—</TBtn>
              <TBtn tip="Numbered List" onMouseDown={e => { e.preventDefault(); exec('insertOrderedList'); }}>1—</TBtn>
              <TBtn tip="Indent" onMouseDown={e => { e.preventDefault(); exec('indent'); }}>→|</TBtn>
              <TBtn tip="Outdent" onMouseDown={e => { e.preventDefault(); exec('outdent'); }}>|←</TBtn>
              <TDivider />
              <TBtn tip="Insert Link" onMouseDown={e => { e.preventDefault(); insertLink(); }}>🔗</TBtn>
              <TBtn tip="Unlink" onMouseDown={e => { e.preventDefault(); exec('unlink'); }}>✂🔗</TBtn>
              <TBtn tip="Inline Code" onMouseDown={e => { e.preventDefault(); fmtBlock('pre'); }}>{`</>`}</TBtn>
              <TBtn tip="Horizontal Rule" onMouseDown={e => { e.preventDefault(); exec('insertHorizontalRule'); }}>—</TBtn>
              <TBtn tip="Clear Formatting" onMouseDown={e => { e.preventDefault(); exec('removeFormat'); }}>Tx</TBtn>
            </div>

            {/* Slug bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 28px 0' }}>
              <span style={{ fontSize: 10, color: 'var(--adm-text-subtle)', flexShrink: 0 }}>URL:</span>
              <div style={{
                display: 'flex', alignItems: 'center', flex: 1,
                background: 'var(--adm-surface)', border: '1px solid var(--adm-border)',
                borderRadius: 6, overflow: 'hidden',
              }}>
                <span style={{ padding: '4px 8px', fontSize: 10, color: 'var(--adm-text-subtle)', borderRight: '1px solid var(--adm-border)', background: 'var(--adm-hover-bg)', whiteSpace: 'nowrap' }}>
                  wildlife.universe/
                </span>
                <input
                  value={slug}
                  onChange={e => { setSlug(e.target.value); setSlugEdited(true); }}
                  placeholder="post-slug"
                  style={{ flex: 1, padding: '4px 8px', background: 'transparent', border: 'none', outline: 'none', fontSize: 10, color: 'var(--adm-text)', minWidth: 0 }}
                />
              </div>
              {slugEdited && (
                <button
                  onClick={() => { setSlug(toSlug(title)); setSlugEdited(false); }}
                  style={{ fontSize: 10, color: '#d4af37', background: 'transparent', border: 'none', cursor: 'pointer', flexShrink: 0, padding: 0 }}
                >
                  ↺ Auto
                </button>
              )}
            </div>

            {/* ContentEditable editor */}
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={handleInput}
              data-post-editor
              data-placeholder="Start writing your article…"
              style={{
                minHeight: 480, padding: '20px 28px',
                fontSize: 15, lineHeight: 1.85,
                color: 'var(--adm-text)', caretColor: '#d4af37',
              }}
            />

            {/* Status bar */}
            <div style={{
              display: 'flex', gap: 16, flexWrap: 'wrap',
              padding: '9px 28px', borderTop: '1px solid var(--adm-border)',
              fontSize: 10, color: 'var(--adm-text-subtle)',
            }}>
              <span>{wordCount} words</span>
              <span>{readTime(wordCount)}</span>
              <span style={{ marginLeft: 'auto' }}>
                {savedAt ? `Autosaved ${savedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Unsaved draft'}
              </span>
            </div>

            {/* Excerpt */}
            <div style={{ padding: '18px 28px', borderTop: '1px solid var(--adm-border)' }}>
              <FieldLabel count={excerpt.length} max={280}>Excerpt</FieldLabel>
              <textarea
                value={excerpt}
                onChange={e => setExcerpt(e.target.value)}
                maxLength={280}
                rows={3}
                placeholder="Short excerpt for previews and search results…"
                style={{
                  ...fieldStyle, resize: 'vertical', background: 'var(--adm-surface)',
                  fontSize: 13, lineHeight: 1.6,
                }}
              />
            </div>

            {/* SEO Settings (collapsible) */}
            <div style={{ padding: '0 28px 36px' }}>
              <button
                onClick={() => setSeoOpen(o => !o)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7, width: '100%',
                  padding: '12px 0', background: 'transparent', border: 'none',
                  borderTop: '1px solid var(--adm-border)',
                  color: 'var(--adm-text)', fontSize: 11, fontWeight: 700,
                  cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.07em',
                }}
              >
                <span style={{ opacity: 0.5, fontSize: 9, transform: seoOpen ? 'none' : 'rotate(-90deg)', transition: 'transform 0.18s', display: 'inline-block' }}>▾</span>
                SEO Settings
                <span style={{
                  marginLeft: 'auto', fontSize: 10, fontWeight: 800,
                  color: seoScore >= 70 ? '#22c55e' : seoScore >= 40 ? '#f59e0b' : '#ef4444',
                }}>
                  Score: {seoScore}/100
                </span>
              </button>
              {seoOpen && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 14 }}>
                  <div>
                    <FieldLabel count={metaTitle.length} max={60}>Meta Title</FieldLabel>
                    <input
                      value={metaTitle}
                      onChange={e => setMetaTitle(e.target.value)}
                      placeholder={title || 'Page title for search engines…'}
                      maxLength={80}
                      style={fieldStyle}
                    />
                  </div>
                  <div>
                    <FieldLabel count={metaDesc.length} max={160}>Meta Description</FieldLabel>
                    <textarea
                      value={metaDesc}
                      onChange={e => setMetaDesc(e.target.value)}
                      placeholder={description || 'Description for search results…'}
                      rows={2}
                      maxLength={200}
                      style={{ ...fieldStyle, resize: 'vertical' }}
                    />
                  </div>
                  <div>
                    <FieldLabel>Keywords</FieldLabel>
                    <input
                      value={metaKw}
                      onChange={e => setMetaKw(e.target.value)}
                      placeholder="wildlife, conservation, savanna…"
                      style={fieldStyle}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ===== SIDEBAR ===== */}
          {sidebarOpen && (
            <div style={{
              width: 282, flexShrink: 0,
              borderLeft: '1px solid var(--adm-border)',
              background: 'var(--adm-surface)',
              position: 'sticky', top: HEADER_H, alignSelf: 'flex-start',
              maxHeight: `calc(100vh - ${HEADER_H}px)`,
              overflowY: 'auto',
            }}>

              {/* Publishing */}
              <SideSection label="Publishing">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, cursor: 'pointer' }}>
                    <input type="checkbox" checked={published} onChange={e => setPublished(e.target.checked)} style={{ accentColor: '#d4af37' }} />
                    Published
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, cursor: 'pointer' }}>
                    <input type="checkbox" checked={featured} onChange={e => setFeatured(e.target.checked)} style={{ accentColor: '#d4af37' }} />
                    Featured post
                  </label>
                  <div>
                    <FieldLabel>Publish Date</FieldLabel>
                    <input type="date" value={publishDate} onChange={e => setPublishDate(e.target.value)} style={fieldStyle} />
                  </div>
                  <div>
                    <FieldLabel>Tags</FieldLabel>
                    <input
                      value={tags}
                      onChange={e => setTags(e.target.value)}
                      placeholder="safari, conservation…"
                      style={fieldStyle}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 6, paddingTop: 2 }}>
                    <button
                      onClick={() => handleSave('draft')}
                      disabled={saving}
                      style={{
                        flex: 1, padding: '7px', borderRadius: 7, fontSize: 11, fontWeight: 600,
                        border: '1px solid var(--adm-border)', background: 'transparent',
                        color: 'var(--adm-text)', cursor: saving ? 'wait' : 'pointer',
                      }}
                    >
                      {saving ? '…' : 'Save Draft'}
                    </button>
                    <button
                      onClick={() => handleSave('published')}
                      disabled={saving}
                      style={{
                        flex: 1, padding: '7px', borderRadius: 7, fontSize: 11, fontWeight: 700,
                        border: 'none', background: '#d4af37', color: '#000',
                        cursor: saving ? 'wait' : 'pointer',
                      }}
                    >
                      {saving ? '…' : 'Publish'}
                    </button>
                  </div>
                </div>
              </SideSection>

              {/* Organization */}
              <SideSection label="Organization">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <FieldLabel>Category</FieldLabel>
                    <select value={category} onChange={e => setCategory(e.target.value)} style={fieldStyle}>
                      {categories.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <FieldLabel>Label</FieldLabel>
                    <select value={label} onChange={e => setLabel(e.target.value)} style={fieldStyle}>
                      {labelOptions.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <FieldLabel count={description.length} max={280}>Short Description</FieldLabel>
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      maxLength={280}
                      rows={3}
                      placeholder="Brief description…"
                      style={{ ...fieldStyle, resize: 'vertical' }}
                    />
                  </div>
                </div>
              </SideSection>

              {/* Featured Image */}
              <SideSection label="Featured Image">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <MediaUpload
                    value={cover}
                    onChange={v => setCover(v)}
                    label=""
                  />
                  <div>
                    <FieldLabel>Gradient Palette</FieldLabel>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                      {['from', 'via', 'to'].map(k => (
                        <label key={k} style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                          <span style={{ fontSize: 9, color: 'var(--adm-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{k}</span>
                          <input
                            type="color"
                            value={palette[k]}
                            onChange={e => setPalette(p => ({ ...p, [k]: e.target.value }))}
                            style={{ width: '100%', height: 28, borderRadius: 5, border: '1px solid var(--adm-border)', cursor: 'pointer', padding: 1 }}
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                  <div style={{
                    height: 52, borderRadius: 7, overflow: 'hidden',
                    background: `linear-gradient(135deg, ${palette.from}, ${palette.via}, ${palette.to})`,
                    position: 'relative',
                  }}>
                    {cover && typeof cover === 'string' && (
                      <img src={cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}
                    {cover && cover?.sources?.[0] && (
                      <img src={cover.sources[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}
                  </div>
                </div>
              </SideSection>

              {/* Writing Toolkit */}
              <SideSection label="Writing Toolkit" defaultOpen={false}>
                <WritingToolkit
                  title={title}
                  body={bodyHtml}
                  description={description}
                  slug={slug}
                  cover={typeof cover === 'string' ? cover : cover?.sources?.[0] || ''}
                  wordCount={wordCount}
                  seoScore={seoScore}
                />
              </SideSection>

            </div>
          )}
        </div>
      </div>
    </>
  );
}
