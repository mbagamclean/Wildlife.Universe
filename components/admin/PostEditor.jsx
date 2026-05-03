'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import Youtube from '@tiptap/extension-youtube';

import { categories } from '@/lib/mock/categories';
import { MediaUpload } from './MediaUpload';
import { TiptapEditor } from './editor/TiptapEditor';
import { AIWritingToolkit } from './editor/AIWritingToolkit';
import { AISEOAssistant } from './editor/AISEOAssistant';
import { AIImageGenerator } from './editor/AIImageGenerator';

// ── Utilities ────────────────────────────────────────────────
function toSlug(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
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

// ── Toolbar ──────────────────────────────────────────────────
function TBtn({ tip, onMouseDown, active, children }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      title={tip}
      onMouseDown={onMouseDown}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        minWidth: 28, height: 26, padding: '0 5px', borderRadius: 5, border: 'none',
        background: active ? 'rgba(124,58,237,0.12)' : hov ? 'var(--adm-hover-bg)' : 'transparent',
        color: active ? '#7c3aed' : 'var(--adm-text)',
        cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: active ? 700 : 500, transition: 'background 0.1s, color 0.1s', flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

function TDiv() {
  return <div style={{ width: 1, height: 18, background: 'var(--adm-border)', margin: '0 3px', alignSelf: 'center', flexShrink: 0 }} />;
}

// ── Sidebar section ───────────────────────────────────────────
function SideSection({ label, children, defaultOpen = true, accent }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: '1px solid var(--adm-border)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px', background: 'transparent', border: 'none',
          color: accent || 'var(--adm-text)', fontSize: 10, fontWeight: 800,
          cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.09em',
        }}
      >
        {label}
        <span style={{ opacity: 0.5, fontSize: 9, transform: open ? 'none' : 'rotate(-90deg)', transition: 'transform 0.18s', display: 'inline-block' }}>▾</span>
      </button>
      {open && <div style={{ padding: '0 14px 14px' }}>{children}</div>}
    </div>
  );
}

// ── Header button ─────────────────────────────────────────────
function HBtn({ onClick, primary, disabled, children }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        padding: '5px 13px', borderRadius: 7, fontSize: 11, fontWeight: 600, flexShrink: 0,
        border: primary ? 'none' : '1px solid var(--adm-border)',
        background: primary ? (hov ? '#b8952e' : '#d4af37') : (hov ? 'var(--adm-hover-bg)' : 'transparent'),
        color: primary ? '#000' : 'var(--adm-text)',
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1,
        transition: 'background 0.13s', whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  );
}

const fieldStyle = {
  borderRadius: 7, border: '1px solid var(--adm-border)', background: 'var(--adm-bg)',
  color: 'var(--adm-text)', padding: '6px 9px', fontSize: 12, outline: 'none',
  width: '100%', boxSizing: 'border-box',
};

// ── Main ──────────────────────────────────────────────────────
export function PostEditor({ initial, onSave, onCancel }) {
  const draftKey = `cms-draft-${initial?.id || 'new'}`;
  const autosaveRef = useRef(null);
  const HEADER_H = 52;

  const [slugEdited, setSlugEdited] = useState(!!initial?.slug);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [seoOpen, setSeoOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);

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

  // Tiptap editor instance
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, codeBlock: { languageClassPrefix: 'language-' } }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Underline,
      Subscript,
      Superscript,
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer' } }),
      Image.configure({ inline: false, allowBase64: false }),
      Youtube.configure({ width: 640, height: 360, allowFullscreen: true, controls: true, nocookie: true }),
      Placeholder.configure({ placeholder: 'Start writing your article… let the wildlife story unfold.' }),
      CharacterCount,
    ],
    content: initial?.body || '',
    editorProps: {
      attributes: { class: 'tiptap-content' },
    },
  });

  const wordCount = editor?.storage?.characterCount?.words() ?? 0;

  useEffect(() => {
    if (!slugEdited) setSlug(toSlug(title));
  }, [title, slugEdited]);

  useEffect(() => {
    if (!labelOptions.includes(label)) setLabel(labelOptions[0] || '');
  }, [category]); // eslint-disable-line

  // Autosave
  useEffect(() => {
    autosaveRef.current = setInterval(() => {
      const body = editor?.getHTML() || '';
      try {
        localStorage.setItem(draftKey, JSON.stringify({ title, slug, category, label, description, body, cover, palette, featured, tags }));
        setSavedAt(new Date());
      } catch (_) {}
    }, 10000);
    return () => clearInterval(autosaveRef.current);
  }, [title, slug, category, label, description, cover, palette, featured, tags]); // eslint-disable-line

  const seoScore = useMemo(
    () => calcSeo(title, description, slug, cover, wordCount),
    [title, description, slug, cover, wordCount]
  );

  const insertLink = useCallback(() => {
    const url = prompt('Enter URL:');
    if (url) editor?.chain().focus().setLink({ href: url }).run();
  }, [editor]);

  const insertVideo = useCallback(() => {
    const url = prompt('Enter video URL (YouTube, Vimeo, or direct .mp4 link):');
    if (!url) return;
    editor?.commands.setYoutubeVideo({ src: url });
  }, [editor]);

  // Toolbar active checks
  const isActive = useCallback((name, attrs) => editor?.isActive(name, attrs) ?? false, [editor]);

  // Save
  const handleSave = async (status) => {
    setSaving(true);
    const body = editor?.getHTML() || '';
    const coverUrl = typeof cover === 'string' ? cover : cover?.sources?.[0]?.src || '';
    const payload = {
      title: title.trim(), slug: slug.trim(), category, label,
      description: description.trim(), body, cover: coverUrl, coverPalette: palette,
      featured, status, tags: tags.split(',').map(t => t.trim()).filter(Boolean),
    };
    try {
      await onSave(payload);
      localStorage.removeItem(draftKey);
    } finally {
      setSaving(false);
    }
  };

  // Handler for SEO assistant inserting fields
  const handleSEOInserted = useCallback(({ metaTitle: mt, metaDesc: md, metaKw: mk, excerpt: ex } = {}) => {
    if (mt !== undefined) setMetaTitle(mt);
    if (md !== undefined) setMetaDesc(md);
    if (mk !== undefined) setMetaKw(mk);
    if (ex !== undefined) setExcerpt(ex);
  }, []);

  return (
    <>
      <style>{`
        .tiptap-content { outline: none; min-height: 480px; }
        .tiptap-content h1 { font-size: 2em; font-weight: 700; margin: 0.5em 0 0.3em; line-height: 1.2; }
        .tiptap-content h2 { font-size: 1.55em; font-weight: 700; margin: 1em 0 0.3em; line-height: 1.25; }
        .tiptap-content h3 { font-size: 1.2em; font-weight: 600; margin: 0.8em 0 0.25em; line-height: 1.3; }
        .tiptap-content p { margin: 0.55em 0; line-height: 1.85; }
        .tiptap-content ul { list-style: disc; padding-left: 1.7em; margin: 0.5em 0; }
        .tiptap-content ol { list-style: decimal; padding-left: 1.7em; margin: 0.5em 0; }
        .tiptap-content li { margin: 0.2em 0; }
        .tiptap-content a { color: #d4af37; text-decoration: underline; }
        .tiptap-content blockquote { border-left: 3px solid #7c3aed; padding-left: 1em; margin: 0.7em 0; font-style: italic; color: var(--adm-text-muted); }
        .tiptap-content pre { background: var(--adm-surface); border: 1px solid var(--adm-border); padding: 14px 16px; border-radius: 8px; font-family: monospace; font-size: 0.85em; overflow-x: auto; margin: 0.5em 0; }
        .tiptap-content code { background: var(--adm-hover-bg); padding: 1px 5px; border-radius: 3px; font-size: 0.88em; font-family: monospace; }
        .tiptap-content hr { border: none; border-top: 1px solid var(--adm-border); margin: 1.2em 0; }
        .tiptap-content img { max-width: 100%; border-radius: 10px; display: block; margin: 1em 0; }
        .tiptap-content figure { margin: 1em 0; }
        .tiptap-content figcaption { font-size: 0.85em; color: var(--adm-text-muted); text-align: center; margin-top: 4px; }
        .tiptap-content div[data-youtube-video] { margin: 1em 0; border-radius: 10px; overflow: hidden; }
        .tiptap-content div[data-youtube-video] iframe { width: 100%; aspect-ratio: 16/9; display: block; border: none; }
        .tiptap-content p.is-editor-empty:first-child::before { content: attr(data-placeholder); color: var(--adm-text-subtle); pointer-events: none; float: left; height: 0; }
        .tiptap-content ::selection { background: rgba(124,58,237,0.15); }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: 'var(--adm-bg)' }}>

        {/* ───── STICKY HEADER ───── */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 50,
          background: 'var(--adm-surface)', borderBottom: '1px solid var(--adm-border)',
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 14px', height: HEADER_H, boxSizing: 'border-box',
        }}>
          <button onClick={onCancel} style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px',
            borderRadius: 6, border: '1px solid var(--adm-border)', background: 'transparent',
            color: 'var(--adm-text)', fontSize: 11, cursor: 'pointer', flexShrink: 0,
          }}>← Back</button>

          <div style={{ width: 1, height: 18, background: 'var(--adm-border)', flexShrink: 0 }} />

          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Post title…"
            style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, fontWeight: 600, color: 'var(--adm-text)' }}
          />

          <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
            {[`${wordCount} words`, readTime(wordCount)].map(t => (
              <span key={t} style={{ fontSize: 10, color: 'var(--adm-text-subtle)', background: 'var(--adm-hover-bg)', padding: '2px 7px', borderRadius: 20, whiteSpace: 'nowrap' }}>{t}</span>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
            <HBtn onClick={() => setSidebarOpen(o => !o)}>{sidebarOpen ? 'Hide Panel' : 'Show Panel'}</HBtn>
            <HBtn onClick={() => window.print()}>Print</HBtn>
            <HBtn onClick={() => handleSave('draft')} disabled={saving}>{saving ? 'Saving…' : 'Save Draft'}</HBtn>
            <HBtn primary onClick={() => handleSave('published')} disabled={saving}>Publish Now</HBtn>
          </div>
        </div>

        {/* ───── BODY ───── */}
        <div style={{ display: 'flex', flex: 1, alignItems: 'flex-start' }}>

          {/* ───── MAIN COLUMN ───── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

            {/* Formatting toolbar */}
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center',
              padding: '6px 14px', borderBottom: '1px solid var(--adm-border)',
              background: 'var(--adm-surface)',
              position: 'sticky', top: HEADER_H, zIndex: 40,
            }}>
              <TBtn tip="Bold" active={isActive('bold')} onMouseDown={e => { e.preventDefault(); editor?.chain().focus().toggleBold().run(); }}><b>B</b></TBtn>
              <TBtn tip="Italic" active={isActive('italic')} onMouseDown={e => { e.preventDefault(); editor?.chain().focus().toggleItalic().run(); }}><i>I</i></TBtn>
              <TBtn tip="Underline" active={isActive('underline')} onMouseDown={e => { e.preventDefault(); editor?.chain().focus().toggleUnderline().run(); }}><u>U</u></TBtn>
              <TBtn tip="Strikethrough" active={isActive('strike')} onMouseDown={e => { e.preventDefault(); editor?.chain().focus().toggleStrike().run(); }}><s>S</s></TBtn>
              <TBtn tip="Subscript" active={isActive('subscript')} onMouseDown={e => { e.preventDefault(); editor?.chain().focus().toggleSubscript().run(); }}>x₂</TBtn>
              <TBtn tip="Superscript" active={isActive('superscript')} onMouseDown={e => { e.preventDefault(); editor?.chain().focus().toggleSuperscript().run(); }}>x²</TBtn>
              <TDiv />
              <TBtn tip="Heading 1" active={isActive('heading', { level: 1 })} onMouseDown={e => { e.preventDefault(); editor?.chain().focus().toggleHeading({ level: 1 }).run(); }}>H1</TBtn>
              <TBtn tip="Heading 2" active={isActive('heading', { level: 2 })} onMouseDown={e => { e.preventDefault(); editor?.chain().focus().toggleHeading({ level: 2 }).run(); }}>H2</TBtn>
              <TBtn tip="Heading 3" active={isActive('heading', { level: 3 })} onMouseDown={e => { e.preventDefault(); editor?.chain().focus().toggleHeading({ level: 3 }).run(); }}>H3</TBtn>
              <TBtn tip="Paragraph" active={isActive('paragraph')} onMouseDown={e => { e.preventDefault(); editor?.chain().focus().setParagraph().run(); }}>¶</TBtn>
              <TBtn tip="Blockquote" active={isActive('blockquote')} onMouseDown={e => { e.preventDefault(); editor?.chain().focus().toggleBlockquote().run(); }}>"</TBtn>
              <TDiv />
              <TBtn tip="Align Left" active={isActive({ textAlign: 'left' })} onMouseDown={e => { e.preventDefault(); editor?.chain().focus().setTextAlign('left').run(); }}>≡L</TBtn>
              <TBtn tip="Center" active={isActive({ textAlign: 'center' })} onMouseDown={e => { e.preventDefault(); editor?.chain().focus().setTextAlign('center').run(); }}>≡C</TBtn>
              <TBtn tip="Align Right" active={isActive({ textAlign: 'right' })} onMouseDown={e => { e.preventDefault(); editor?.chain().focus().setTextAlign('right').run(); }}>R≡</TBtn>
              <TBtn tip="Justify" active={isActive({ textAlign: 'justify' })} onMouseDown={e => { e.preventDefault(); editor?.chain().focus().setTextAlign('justify').run(); }}>≡≡</TBtn>
              <TDiv />
              <TBtn tip="Bullet List" active={isActive('bulletList')} onMouseDown={e => { e.preventDefault(); editor?.chain().focus().toggleBulletList().run(); }}>•—</TBtn>
              <TBtn tip="Numbered List" active={isActive('orderedList')} onMouseDown={e => { e.preventDefault(); editor?.chain().focus().toggleOrderedList().run(); }}>1—</TBtn>
              <TBtn tip="Code Block" active={isActive('codeBlock')} onMouseDown={e => { e.preventDefault(); editor?.chain().focus().toggleCodeBlock().run(); }}>{`</>`}</TBtn>
              <TDiv />
              <TBtn tip="Insert Link" active={isActive('link')} onMouseDown={e => { e.preventDefault(); insertLink(); }}>🔗</TBtn>
              <TBtn tip="Remove Link" onMouseDown={e => { e.preventDefault(); editor?.chain().focus().unsetLink().run(); }}>✂🔗</TBtn>
              <TBtn tip="Embed Video (YouTube / Vimeo / MP4)" onMouseDown={e => { e.preventDefault(); insertVideo(); }}>▶</TBtn>
              <TBtn tip="Horizontal Rule" onMouseDown={e => { e.preventDefault(); editor?.chain().focus().setHorizontalRule().run(); }}>—</TBtn>
              <TBtn tip="Clear Formatting" onMouseDown={e => { e.preventDefault(); editor?.chain().focus().clearNodes().unsetAllMarks().run(); }}>Tx</TBtn>
              <TBtn tip="Undo" onMouseDown={e => { e.preventDefault(); editor?.chain().focus().undo().run(); }}>↩</TBtn>
              <TBtn tip="Redo" onMouseDown={e => { e.preventDefault(); editor?.chain().focus().redo().run(); }}>↪</TBtn>
            </div>

            {/* Slug bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 28px 0' }}>
              <span style={{ fontSize: 10, color: 'var(--adm-text-subtle)', flexShrink: 0 }}>URL:</span>
              <div style={{ display: 'flex', alignItems: 'center', flex: 1, background: 'var(--adm-surface)', border: '1px solid var(--adm-border)', borderRadius: 6, overflow: 'hidden' }}>
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
                <button onClick={() => { setSlug(toSlug(title)); setSlugEdited(false); }}
                  style={{ fontSize: 10, color: '#7c3aed', background: 'transparent', border: 'none', cursor: 'pointer', flexShrink: 0, padding: 0 }}>
                  ↺ Auto
                </button>
              )}
            </div>

            {/* Tiptap editor */}
            <TiptapEditor editor={editor} />

            {/* Status bar */}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', padding: '9px 28px', borderTop: '1px solid var(--adm-border)', fontSize: 10, color: 'var(--adm-text-subtle)' }}>
              <span>{wordCount} words</span>
              <span>{readTime(wordCount)}</span>
              <span style={{ marginLeft: 'auto' }}>
                {savedAt ? `Autosaved ${savedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Unsaved draft'}
              </span>
            </div>

            {/* Excerpt */}
            <div style={{ padding: '18px 28px', borderTop: '1px solid var(--adm-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--adm-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Excerpt</span>
                <span style={{ fontSize: 10, color: excerpt.length > 250 ? '#f59e0b' : 'var(--adm-text-subtle)' }}>{excerpt.length}/280</span>
              </div>
              <textarea value={excerpt} onChange={e => setExcerpt(e.target.value)} maxLength={280} rows={3}
                placeholder="Short excerpt for previews and search results…"
                style={{ ...fieldStyle, resize: 'vertical', background: 'var(--adm-surface)', fontSize: 13, lineHeight: 1.6 }}
              />
            </div>

            {/* SEO Settings (collapsible) */}
            <div style={{ padding: '0 28px 36px' }}>
              <button onClick={() => setSeoOpen(o => !o)} style={{
                display: 'flex', alignItems: 'center', gap: 7, width: '100%',
                padding: '12px 0', background: 'transparent', border: 'none',
                borderTop: '1px solid var(--adm-border)', color: 'var(--adm-text)',
                fontSize: 11, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.07em',
              }}>
                <span style={{ opacity: 0.5, fontSize: 9, transform: seoOpen ? 'none' : 'rotate(-90deg)', transition: 'transform 0.18s', display: 'inline-block' }}>▾</span>
                SEO Settings
                <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 800, color: seoScore >= 70 ? '#22c55e' : seoScore >= 40 ? '#f59e0b' : '#ef4444' }}>
                  Score: {seoScore}/100
                </span>
              </button>
              {seoOpen && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 12 }}>
                  {[
                    { label: 'Meta Title', value: metaTitle, set: setMetaTitle, max: 60, ph: title || 'Page title for search engines…' },
                    { label: 'Meta Description', value: metaDesc, set: setMetaDesc, max: 160, ph: description || 'Description for search results…', multi: true },
                    { label: 'Keywords', value: metaKw, set: setMetaKw, ph: 'lion, savanna, wildlife safari…' },
                  ].map(({ label, value, set, max, ph, multi }) => (
                    <div key={label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--adm-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
                        {max && <span style={{ fontSize: 10, color: value.length > max * 0.9 ? '#f59e0b' : 'var(--adm-text-subtle)' }}>{value.length}/{max}</span>}
                      </div>
                      {multi ? (
                        <textarea value={value} onChange={e => set(e.target.value)} placeholder={ph} rows={2} maxLength={200}
                          style={{ ...fieldStyle, resize: 'vertical' }} />
                      ) : (
                        <input value={value} onChange={e => set(e.target.value)} placeholder={ph} maxLength={max ? max + 20 : undefined} style={fieldStyle} />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ───── SIDEBAR ───── */}
          {sidebarOpen && (
            <div style={{
              width: 290, flexShrink: 0, borderLeft: '1px solid var(--adm-border)',
              background: 'var(--adm-surface)',
              position: 'sticky', top: HEADER_H, alignSelf: 'flex-start',
              maxHeight: `calc(100vh - ${HEADER_H}px)`, overflowY: 'auto',
            }}>

              {/* Publishing */}
              <SideSection label="Publishing">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, cursor: 'pointer' }}>
                    <input type="checkbox" checked={published} onChange={e => setPublished(e.target.checked)} style={{ accentColor: '#d4af37' }} />
                    Published
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, cursor: 'pointer' }}>
                    <input type="checkbox" checked={featured} onChange={e => setFeatured(e.target.checked)} style={{ accentColor: '#d4af37' }} />
                    Featured post
                  </label>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--adm-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Publish Date</div>
                    <input type="date" value={publishDate} onChange={e => setPublishDate(e.target.value)} style={fieldStyle} />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--adm-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Tags</div>
                    <input value={tags} onChange={e => setTags(e.target.value)} placeholder="safari, conservation…" style={fieldStyle} />
                  </div>
                  <div style={{ display: 'flex', gap: 6, paddingTop: 2 }}>
                    <button onClick={() => handleSave('draft')} disabled={saving}
                      style={{ flex: 1, padding: '7px', borderRadius: 7, fontSize: 11, fontWeight: 600, border: '1px solid var(--adm-border)', background: 'transparent', color: 'var(--adm-text)', cursor: saving ? 'wait' : 'pointer' }}>
                      {saving ? '…' : 'Save Draft'}
                    </button>
                    <button onClick={() => handleSave('published')} disabled={saving}
                      style={{ flex: 1, padding: '7px', borderRadius: 7, fontSize: 11, fontWeight: 700, border: 'none', background: '#d4af37', color: '#000', cursor: saving ? 'wait' : 'pointer' }}>
                      {saving ? '…' : 'Publish'}
                    </button>
                  </div>
                </div>
              </SideSection>

              {/* Organization */}
              <SideSection label="Organization">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--adm-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Category</div>
                    <select value={category} onChange={e => setCategory(e.target.value)} style={fieldStyle}>
                      {categories.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--adm-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Label</div>
                    <select value={label} onChange={e => setLabel(e.target.value)} style={fieldStyle}>
                      {labelOptions.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--adm-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Short Description</span>
                      <span style={{ fontSize: 10, color: description.length > 250 ? '#f59e0b' : 'var(--adm-text-subtle)' }}>{description.length}/280</span>
                    </div>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={280} rows={3}
                      placeholder="Brief description…" style={{ ...fieldStyle, resize: 'vertical' }} />
                  </div>
                </div>
              </SideSection>

              {/* Featured Image */}
              <SideSection label="Featured Image">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  <MediaUpload value={cover} onChange={v => setCover(v)} label="" />
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--adm-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Gradient Palette</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                      {['from', 'via', 'to'].map(k => (
                        <label key={k} style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                          <span style={{ fontSize: 9, color: 'var(--adm-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{k}</span>
                          <input type="color" value={palette[k]} onChange={e => setPalette(p => ({ ...p, [k]: e.target.value }))}
                            style={{ width: '100%', height: 28, borderRadius: 5, border: '1px solid var(--adm-border)', cursor: 'pointer', padding: 1 }} />
                        </label>
                      ))}
                    </div>
                  </div>
                  <div style={{ height: 50, borderRadius: 7, overflow: 'hidden', background: `linear-gradient(135deg, ${palette.from}, ${palette.via}, ${palette.to})`, position: 'relative' }}>
                    {cover && typeof cover === 'string' && (
                      <img src={cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}
                  </div>
                </div>
              </SideSection>

              {/* AI Writing Toolkit */}
              <SideSection label="✦ AI Writing Toolkit" accent="#7c3aed" defaultOpen={false}>
                <AIWritingToolkit editor={editor} title={title} wordCount={wordCount} />
              </SideSection>

              {/* AI SEO Assistant */}
              <SideSection label="📈 AI SEO Assistant" accent="#059669" defaultOpen={false}>
                <AISEOAssistant
                  title={title}
                  editor={editor}
                  slug={slug}
                  onFieldsInserted={handleSEOInserted}
                />
              </SideSection>

              {/* AI Image Generator */}
              <SideSection label="🖼 AI Image Generator" accent="#7c3aed" defaultOpen={false}>
                <AIImageGenerator
                  editor={editor}
                  onCoverChange={(url) => setCover(url)}
                />
              </SideSection>

            </div>
          )}
        </div>
      </div>
    </>
  );
}
