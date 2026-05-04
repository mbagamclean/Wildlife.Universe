'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import UnderlineExt from '@tiptap/extension-underline';
import SubscriptExt from '@tiptap/extension-subscript';
import SuperscriptExt from '@tiptap/extension-superscript';
import LinkExt from '@tiptap/extension-link';
import ImageExt from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import Youtube from '@tiptap/extension-youtube';

import {
  ArrowLeft, Undo2, Redo2,
  Bold, Italic, Underline, Strikethrough,
  Subscript, Superscript,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered,
  Link2, ImageIcon, Video, Code, Code2,
  Minus, Info, Printer, Type,
  Maximize2, Minimize2,
  Sparkles, Star, Folder, Tag, Calendar, User,
  ChevronDown, Save, Send, Quote,
  FileText, Clock, Check, TrendingUp, Wand2,
} from 'lucide-react';

import { categories } from '@/lib/mock/categories';
import { MediaUpload } from './MediaUpload';
import { TiptapEditor } from './editor/TiptapEditor';
import { AIWritingToolkit } from './editor/AIWritingToolkit';
import { AISEOAssistant } from './editor/AISEOAssistant';
import { AIImageGenerator } from './editor/AIImageGenerator';
import { AIRewriteFloater } from './editor/AIRewriteFloater';

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

// ── Toolbar button ────────────────────────────────────────────
function TBtn({ tip, onMouseDown, active, children }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      title={tip}
      onMouseDown={onMouseDown}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        minWidth: 30, height: 30, padding: '0 5px', borderRadius: 5, border: 'none',
        background: active ? 'rgba(124,58,237,0.12)' : hov ? 'var(--adm-hover-bg)' : 'transparent',
        color: active ? '#7c3aed' : 'var(--adm-text)',
        cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: active ? 700 : 400, transition: 'background 0.1s, color 0.1s', flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

function TDiv() {
  return (
    <div style={{
      width: 1, height: 16, background: 'var(--adm-border)',
      margin: '0 3px', alignSelf: 'center', flexShrink: 0,
    }} />
  );
}

// ── Format dropdown ───────────────────────────────────────────
function FormatDropdown({ editor, isActive }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const current =
    isActive('heading', { level: 1 }) ? 'Heading 1' :
    isActive('heading', { level: 2 }) ? 'Heading 2' :
    isActive('heading', { level: 3 }) ? 'Heading 3' :
    isActive('blockquote') ? 'Quote' : 'Format';

  const opts = [
    { label: 'Paragraph',  fn: () => editor?.chain().focus().setParagraph().run() },
    { label: 'Heading 1',  fn: () => editor?.chain().focus().toggleHeading({ level: 1 }).run() },
    { label: 'Heading 2',  fn: () => editor?.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: 'Heading 3',  fn: () => editor?.chain().focus().toggleHeading({ level: 3 }).run() },
    { label: 'Blockquote', fn: () => editor?.chain().focus().toggleBlockquote().run() },
  ];

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onMouseDown={e => { e.preventDefault(); setOpen(o => !o); }}
        style={{
          display: 'flex', alignItems: 'center', gap: 3, height: 30,
          padding: '0 9px', borderRadius: 5, fontSize: 12, fontWeight: 500,
          border: '1px solid var(--adm-border)', background: 'transparent',
          color: 'var(--adm-text)', cursor: 'pointer', whiteSpace: 'nowrap',
        }}
      >
        {current} <ChevronDown size={9} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 3px)', left: 0, zIndex: 200,
          background: 'var(--adm-surface)', border: '1px solid var(--adm-border)',
          borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          minWidth: 130, overflow: 'hidden',
        }}>
          {opts.map(o => (
            <button
              key={o.label}
              onMouseDown={e => { e.preventDefault(); o.fn(); setOpen(false); }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '8px 12px', fontSize: 12, color: 'var(--adm-text)',
                background: 'transparent', border: 'none', cursor: 'pointer',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--adm-hover-bg)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Sidebar card section ──────────────────────────────────────
function SideCard({ title, icon, accentBg, badge, children, defaultOpen = true, open: controlledOpen, onToggle }) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const toggle = isControlled ? onToggle : () => setInternalOpen(o => !o);
  return (
    <div style={{
      background: 'var(--adm-surface)', border: '1px solid var(--adm-border)',
      borderRadius: 12, overflow: 'hidden',
    }}>
      <button
        onClick={toggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '13px 16px', background: accentBg || 'transparent',
          border: 'none', cursor: 'pointer', textAlign: 'left',
        }}
      >
        {icon && (
          <span style={{ color: accentBg ? '#fff' : 'var(--adm-text-muted)', flexShrink: 0, display: 'flex' }}>
            {icon}
          </span>
        )}
        <span style={{ fontSize: 13, fontWeight: 700, color: accentBg ? '#fff' : 'var(--adm-text)', flex: 1, letterSpacing: '-0.01em' }}>
          {title}
        </span>
        {badge && (
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5,
            background: accentBg ? 'rgba(255,255,255,0.22)' : 'var(--adm-hover-bg)',
            color: accentBg ? '#fff' : 'var(--adm-text-muted)',
          }}>
            {badge}
          </span>
        )}
        <motion.span
          animate={{ rotate: open ? 0 : -90 }}
          transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
          style={{
            fontSize: 10, color: accentBg ? 'rgba(255,255,255,0.7)' : 'var(--adm-text-subtle)',
            display: 'inline-block', transformOrigin: 'center',
          }}
        >
          ▾
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              padding: '14px 16px',
              borderTop: `1px solid ${accentBg ? 'rgba(255,255,255,0.15)' : 'var(--adm-border)'}`,
            }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const fieldStyle = {
  borderRadius: 7, border: '1px solid var(--adm-border)', background: 'var(--adm-bg)',
  color: 'var(--adm-text)', padding: '8px 11px', fontSize: 13, outline: 'none',
  width: '100%', boxSizing: 'border-box', transition: 'border-color 0.15s, box-shadow 0.15s',
};

// ── Main ──────────────────────────────────────────────────────
export function PostEditor({ initial, onSave, onCancel }) {
  const draftKey = `cms-draft-${initial?.id || 'new'}`;
  const autosaveRef = useRef(null);
  const HEADER_H = 68;

  const [slugEdited, setSlugEdited] = useState(!!initial?.slug);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [seoOpen, setSeoOpen] = useState(true);
  const [openPanel, setOpenPanel] = useState(null);
  const togglePanel = useCallback((id) => setOpenPanel(p => (p === id ? null : id)), []);
  const [fullscreen, setFullscreen] = useState(false);
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
    initial?.createdAt
      ? new Date(initial.createdAt).toISOString().slice(0, 16)
      : new Date().toISOString().slice(0, 16)
  );
  const [tags, setTags] = useState(Array.isArray(initial?.tags) ? initial.tags.join(', ') : '');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDesc, setMetaDesc] = useState('');
  const [metaKw, setMetaKw] = useState('');

  const currentCat = useMemo(() => categories.find(c => c.slug === category), [category]);
  const labelOptions = currentCat?.labels || [];

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, codeBlock: { languageClassPrefix: 'language-' } }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      UnderlineExt,
      SubscriptExt,
      SuperscriptExt,
      LinkExt.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer' } }),
      ImageExt.configure({ inline: false, allowBase64: false }),
      Youtube.configure({ width: 640, height: 360, allowFullscreen: true, controls: true, nocookie: true }),
      Placeholder.configure({ placeholder: 'Start writing your post... (drag & drop images to upload)' }),
      CharacterCount,
    ],
    content: initial?.body || '',
    editorProps: { attributes: { class: 'tiptap-content' } },
  });

  const wordCount = editor?.storage?.characterCount?.words() ?? 0;
  const charCount = editor?.storage?.characterCount?.characters() ?? 0;
  const wordsLeft = Math.max(0, 4000 - wordCount);

  useEffect(() => { if (!slugEdited) setSlug(toSlug(title)); }, [title, slugEdited]);

  useEffect(() => {
    if (!labelOptions.includes(label)) setLabel(labelOptions[0] || '');
  }, [category]); // eslint-disable-line

  useEffect(() => {
    if (!editor) return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.title !== undefined) setTitle(d.title);
      if (d.slug !== undefined) { setSlug(d.slug); setSlugEdited(true); }
      if (d.category !== undefined) setCategory(d.category);
      if (d.label !== undefined) setLabel(d.label);
      if (d.description !== undefined) setDescription(d.description);
      if (d.excerpt !== undefined) setExcerpt(d.excerpt);
      if (d.cover !== undefined) setCover(d.cover);
      if (d.palette !== undefined) setPalette(d.palette);
      if (d.featured !== undefined) setFeatured(d.featured);
      if (d.tags !== undefined) setTags(d.tags);
      if (d.metaTitle !== undefined) setMetaTitle(d.metaTitle);
      if (d.metaDesc !== undefined) setMetaDesc(d.metaDesc);
      if (d.metaKw !== undefined) setMetaKw(d.metaKw);
      if (d.publishDate !== undefined) setPublishDate(d.publishDate);
      if (d.body) editor.commands.setContent(d.body);
    } catch (_) {}
  }, [editor]); // eslint-disable-line

  useEffect(() => {
    autosaveRef.current = setInterval(() => {
      const body = editor?.getHTML() || '';
      try {
        localStorage.setItem(draftKey, JSON.stringify({
          title, slug, category, label, description, excerpt, body,
          cover, palette, featured, tags,
          metaTitle, metaDesc, metaKw, publishDate,
        }));
        setSavedAt(new Date());
      } catch (_) {}
    }, 10000);
    return () => clearInterval(autosaveRef.current);
  }, [title, slug, category, label, description, excerpt, cover, palette, featured, tags, metaTitle, metaDesc, metaKw, publishDate]); // eslint-disable-line

  const seoScore = useMemo(
    () => calcSeo(title, description, slug, cover, wordCount),
    [title, description, slug, cover, wordCount]
  );

  const insertLink = useCallback(() => {
    const url = prompt('Enter URL:');
    if (url) editor?.chain().focus().setLink({ href: url }).run();
  }, [editor]);

  const insertImage = useCallback(() => {
    const url = prompt('Enter image URL:');
    if (url) editor?.chain().focus().setImage({ src: url }).run();
  }, [editor]);

  const insertVideo = useCallback(() => {
    const raw = prompt('Enter video URL (YouTube, Vimeo, TikTok, Instagram, Facebook, X, or direct .mp4):');
    if (!raw) return;
    const url = raw.trim();
    const ch = editor?.chain().focus();
    if (!ch) return;

    if (/youtube\.com|youtu\.be/.test(url)) {
      editor.commands.setYoutubeVideo({ src: url });
      return;
    }
    if (/\.(mp4|webm|mov|ogg|m3u8)(\?|#|$)/i.test(url)) {
      ch.insertContent(
        `<video controls playsinline style="width:100%;border-radius:12px;background:#000"><source src="${url}"/></video><p></p>`
      ).run();
      return;
    }
    const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vimeo) {
      ch.insertContent(
        `<div style="position:relative;width:100%;padding-top:56.25%"><iframe src="https://player.vimeo.com/video/${vimeo[1]}" style="position:absolute;inset:0;width:100%;height:100%;border:0;border-radius:12px" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></div><p></p>`
      ).run();
      return;
    }
    ch.insertContent(
      `<p><a href="${url}" target="_blank" rel="noopener noreferrer" data-video-embed="true">▶ ${url}</a></p>`
    ).run();
  }, [editor]);

  const isActive = useCallback((name, attrs) => editor?.isActive(name, attrs) ?? false, [editor]);

  const handleSave = async (status) => {
    setSaving(true);
    const body = editor?.getHTML() || '';
    const coverUrl = typeof cover === 'string' ? cover : cover?.sources?.[0]?.src || '';
    const payload = {
      title: title.trim(), slug: slug.trim(), category, label,
      description: description.trim(),
      excerpt: excerpt.trim(),
      body, cover: coverUrl, coverPalette: palette,
      featured, status,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      metaTitle: metaTitle.trim(),
      metaDesc: metaDesc.trim(),
      metaKw: metaKw.trim(),
      publishDate,
    };
    try {
      await onSave(payload);
      localStorage.removeItem(draftKey);
    } finally {
      setSaving(false);
    }
  };

  const handleSEOInserted = useCallback(({ metaTitle: mt, metaDesc: md, metaKw: mk, excerpt: ex } = {}) => {
    if (mt !== undefined) setMetaTitle(mt);
    if (md !== undefined) setMetaDesc(md);
    if (mk !== undefined) setMetaKw(mk);
    if (ex !== undefined) setExcerpt(ex);
  }, []);

  return (
    <>
      <style>{`
        .pe-title::placeholder { color: var(--adm-text-subtle); }
        .pe-field:focus { border-color: #7c3aed !important; box-shadow: 0 0 0 3px rgba(124,58,237,0.1); }
        .pe-hbtn { transition: opacity 0.12s; }
        .pe-hbtn:hover { opacity: 0.85; }
        .tiptap-body .tiptap div[data-youtube-video] { margin: 1em 0; border-radius: 10px; overflow: hidden; }
        .tiptap-body .tiptap div[data-youtube-video] iframe { width: 100%; aspect-ratio: 16/9; display: block; border: none; }
      `}</style>

      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', flexDirection: 'column', overflowY: 'auto', background: 'var(--adm-bg)' }}>

        {/* ── STICKY HEADER ── */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 50,
          background: 'var(--adm-bg)', borderBottom: '1px solid var(--adm-border)',
        }}>
          <div style={{
            maxWidth: 1600, margin: '0 auto',
            height: HEADER_H, display: 'flex', alignItems: 'center', gap: 10,
            padding: '0 24px', boxSizing: 'border-box',
          }}>
          {/* Back */}
          <button
            onClick={onCancel}
            className="pe-hbtn"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 34, height: 34, borderRadius: 8, border: '1px solid var(--adm-border)',
              background: 'transparent', color: 'var(--adm-text)', cursor: 'pointer', flexShrink: 0,
            }}
          >
            <ArrowLeft size={15} />
          </button>

          {/* Title + stats */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 20, fontWeight: 800, lineHeight: 1.15,
              color: 'var(--adm-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {title || 'New Post'}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 2 }}>
              <span style={{ fontSize: 11, color: 'var(--adm-text-muted)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <FileText size={11} strokeWidth={1.75} /> {wordCount} words
              </span>
              <span style={{ fontSize: 11, color: 'var(--adm-text-muted)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <Clock size={11} strokeWidth={1.75} /> {readTime(wordCount)}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
            <button
              onClick={() => setSidebarOpen(o => !o)}
              className="pe-hbtn"
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                height: 34, padding: '0 12px', borderRadius: 7, border: '1px solid var(--adm-border)',
                background: 'transparent', color: 'var(--adm-text)', fontSize: 12, fontWeight: 500, cursor: 'pointer',
              }}
            >
              ⊟ {sidebarOpen ? 'Hide Panel' : 'Show Panel'}
            </button>
            <button
              onClick={() => window.print()}
              className="pe-hbtn"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 34, height: 34, borderRadius: 7, border: '1px solid var(--adm-border)',
                background: 'transparent', color: 'var(--adm-text)', cursor: 'pointer',
              }}
            >
              <Printer size={14} />
            </button>
            <button
              onClick={() => handleSave('draft')}
              disabled={saving}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                height: 34, padding: '0 16px', borderRadius: 7, border: 'none',
                background: '#374151', color: '#fff', fontSize: 12, fontWeight: 600,
                cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1,
              }}
            >
              <Save size={13} /> {saving ? 'Saving…' : 'Save Draft'}
            </button>
            <button
              onClick={() => handleSave('published')}
              disabled={saving}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                height: 34, padding: '0 16px', borderRadius: 7, border: 'none',
                background: '#1d4ed8', color: '#fff', fontSize: 12, fontWeight: 600,
                cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1,
              }}
            >
              <Send size={13} /> Publish Now
            </button>
          </div>
          </div>
        </div>

        {/* ── BODY ── */}
        <div style={{
          maxWidth: 1600, margin: '0 auto', width: '100%',
          display: 'flex', gap: 20, padding: '20px 24px 60px',
          alignItems: 'flex-start', flex: 1,
        }}>

          {/* ── MAIN CARD ── */}
          <div style={{
            flex: 1, minWidth: 0,
            background: 'var(--adm-surface)', border: '1px solid var(--adm-border)',
            borderRadius: 14, overflow: 'hidden',
            boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
          }}>

            {/* Title input */}
            <div style={{ padding: '28px 32px 10px' }}>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Post title..."
                className="pe-title"
                style={{
                  background: 'transparent', border: 'none', outline: 'none', width: '100%',
                  fontSize: 34, fontWeight: 700, color: 'var(--adm-text)',
                  letterSpacing: '-0.02em', lineHeight: 1.2,
                }}
              />
            </div>

            {/* URL row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 32px 14px' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--adm-text-muted)', flexShrink: 0 }}>URL:</span>
              <div style={{
                display: 'flex', alignItems: 'center', flex: 1,
                background: 'var(--adm-bg)', border: '1px solid var(--adm-border)',
                borderRadius: 6, overflow: 'hidden',
              }}>
                <span style={{
                  padding: '4px 9px', fontSize: 11, color: 'var(--adm-text-subtle)',
                  borderRight: '1px solid var(--adm-border)', background: 'var(--adm-hover-bg)', whiteSpace: 'nowrap',
                }}>
                  wildlife.universe/
                </span>
                <input
                  value={slug}
                  onChange={e => { setSlug(e.target.value); setSlugEdited(true); }}
                  placeholder="post-slug"
                  style={{
                    flex: 1, padding: '4px 9px', background: 'transparent',
                    border: 'none', outline: 'none', fontSize: 11, color: 'var(--adm-text)', minWidth: 0,
                  }}
                />
              </div>
              {slugEdited && (
                <button
                  onClick={() => { setSlug(toSlug(title)); setSlugEdited(false); }}
                  style={{ fontSize: 11, color: '#7c3aed', background: 'transparent', border: 'none', cursor: 'pointer', flexShrink: 0, padding: 0 }}
                >
                  ↺ Auto
                </button>
              )}
            </div>

            {/* ── TOOLBAR ── */}
            <div style={{
              position: 'sticky', top: HEADER_H, zIndex: 40,
              background: 'var(--adm-surface)',
              borderTop: '1px solid var(--adm-border)',
              borderBottom: '1px solid var(--adm-border)',
            }}>
              {/* Row 1 */}
              <div style={{
                display: 'flex', flexWrap: 'nowrap', overflowX: 'auto', alignItems: 'center',
                gap: 2, padding: '5px 10px',
              }}>
                <TBtn tip="Undo" onMouseDown={e => { e.preventDefault(); editor?.chain().focus().undo().run(); }}>
                  <Undo2 size={13} />
                </TBtn>
                <TBtn tip="Redo" onMouseDown={e => { e.preventDefault(); editor?.chain().focus().redo().run(); }}>
                  <Redo2 size={13} />
                </TBtn>
                <TDiv />
                <FormatDropdown editor={editor} isActive={isActive} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginLeft: 3, flexShrink: 0 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 3, height: 30,
                    padding: '0 9px', borderRadius: 5, fontSize: 12, fontWeight: 500,
                    border: '1px solid var(--adm-border)', color: 'var(--adm-text-subtle)', whiteSpace: 'nowrap',
                  }}>
                    pt <ChevronDown size={9} />
                  </div>
                </div>
                <TDiv />
                <TBtn tip="Bold" active={isActive('bold')} onMouseDown={e => { e.preventDefault(); editor?.chain().focus().toggleBold().run(); }}>
                  <Bold size={13} />
                </TBtn>
                <TBtn tip="Italic" active={isActive('italic')} onMouseDown={e => { e.preventDefault(); editor?.chain().focus().toggleItalic().run(); }}>
                  <Italic size={13} />
                </TBtn>
                <TBtn tip="Underline" active={isActive('underline')} onMouseDown={e => { e.preventDefault(); editor?.chain().focus().toggleUnderline().run(); }}>
                  <Underline size={13} />
                </TBtn>
                <TBtn tip="Strikethrough" active={isActive('strike')} onMouseDown={e => { e.preventDefault(); editor?.chain().focus().toggleStrike().run(); }}>
                  <Strikethrough size={13} />
                </TBtn>
                <TBtn tip="Subscript" active={isActive('subscript')} onMouseDown={e => { e.preventDefault(); editor?.chain().focus().toggleSubscript().run(); }}>
                  <Subscript size={13} />
                </TBtn>
                <TBtn tip="Superscript" active={isActive('superscript')} onMouseDown={e => { e.preventDefault(); editor?.chain().focus().toggleSuperscript().run(); }}>
                  <Superscript size={13} />
                </TBtn>
                <TDiv />
                <TBtn tip="Align Left" active={isActive({ textAlign: 'left' })} onMouseDown={e => { e.preventDefault(); editor?.chain().focus().setTextAlign('left').run(); }}>
                  <AlignLeft size={13} />
                </TBtn>
                <TBtn tip="Align Center" active={isActive({ textAlign: 'center' })} onMouseDown={e => { e.preventDefault(); editor?.chain().focus().setTextAlign('center').run(); }}>
                  <AlignCenter size={13} />
                </TBtn>
                <TBtn tip="Align Right" active={isActive({ textAlign: 'right' })} onMouseDown={e => { e.preventDefault(); editor?.chain().focus().setTextAlign('right').run(); }}>
                  <AlignRight size={13} />
                </TBtn>
                <TBtn tip="Justify" active={isActive({ textAlign: 'justify' })} onMouseDown={e => { e.preventDefault(); editor?.chain().focus().setTextAlign('justify').run(); }}>
                  <AlignJustify size={13} />
                </TBtn>
                <TDiv />
                <TBtn tip="Bullet List" active={isActive('bulletList')} onMouseDown={e => { e.preventDefault(); editor?.chain().focus().toggleBulletList().run(); }}>
                  <List size={13} />
                </TBtn>
                <TBtn tip="Numbered List" active={isActive('orderedList')} onMouseDown={e => { e.preventDefault(); editor?.chain().focus().toggleOrderedList().run(); }}>
                  <ListOrdered size={13} />
                </TBtn>
                <TBtn tip="Indent" onMouseDown={e => { e.preventDefault(); editor?.chain().focus().sinkListItem('listItem').run(); }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>›</span>
                </TBtn>
                <TBtn tip="Outdent" onMouseDown={e => { e.preventDefault(); editor?.chain().focus().liftListItem('listItem').run(); }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>‹</span>
                </TBtn>
                <TDiv />
                <TBtn tip="Insert Link" active={isActive('link')} onMouseDown={e => { e.preventDefault(); insertLink(); }}>
                  <Link2 size={13} />
                </TBtn>
                <TBtn tip="Insert Image" onMouseDown={e => { e.preventDefault(); insertImage(); }}>
                  <ImageIcon size={13} />
                </TBtn>
                <TBtn tip="Embed Video" onMouseDown={e => { e.preventDefault(); insertVideo(); }}>
                  <Video size={13} />
                </TBtn>
                <TBtn tip="Inline Code" active={isActive('code')} onMouseDown={e => { e.preventDefault(); editor?.chain().focus().toggleCode().run(); }}>
                  <Code size={13} />
                </TBtn>
                <TBtn tip="Code Block" active={isActive('codeBlock')} onMouseDown={e => { e.preventDefault(); editor?.chain().focus().toggleCodeBlock().run(); }}>
                  <Code2 size={13} />
                </TBtn>
                <TBtn tip="Horizontal Rule" onMouseDown={e => { e.preventDefault(); editor?.chain().focus().setHorizontalRule().run(); }}>
                  <Minus size={13} />
                </TBtn>
                <TBtn tip="Blockquote" active={isActive('blockquote')} onMouseDown={e => { e.preventDefault(); editor?.chain().focus().toggleBlockquote().run(); }}>
                  <Quote size={13} />
                </TBtn>
                <TBtn tip="Info" onMouseDown={e => e.preventDefault()}>
                  <Info size={13} />
                </TBtn>
                <TBtn tip="Clear Formatting" onMouseDown={e => { e.preventDefault(); editor?.chain().focus().clearNodes().unsetAllMarks().run(); }}>
                  <Type size={13} />
                </TBtn>
                <TBtn tip="Paragraph" active={isActive('paragraph')} onMouseDown={e => { e.preventDefault(); editor?.chain().focus().setParagraph().run(); }}>
                  <span style={{ fontSize: 12 }}>¶</span>
                </TBtn>
                <TBtn tip="Print" onMouseDown={e => { e.preventDefault(); window.print(); }}>
                  <Printer size={13} />
                </TBtn>
                <div style={{ flex: 1 }} />
                {/* Toolkit button */}
                <button
                  onMouseDown={e => e.preventDefault()}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    height: 30, padding: '0 12px', borderRadius: 5, border: 'none',
                    background: '#7c3aed', color: '#fff',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
                  }}
                >
                  <Sparkles size={12} /> Toolkit
                </button>
              </div>

              {/* Row 2 */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 3,
                padding: '3px 10px 5px',
                borderTop: '1px solid var(--adm-border)',
              }}>
                <TBtn tip={fullscreen ? 'Exit Fullscreen' : 'Fullscreen'} onMouseDown={e => { e.preventDefault(); setFullscreen(f => !f); }}>
                  {fullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                </TBtn>
                <div style={{ flex: 1 }} />
              </div>
            </div>

            {/* Tiptap editor */}
            <div style={{ position: 'relative' }}>
              <TiptapEditor editor={editor} />
              <AIRewriteFloater editor={editor} />
            </div>

            {/* Status bar */}
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center',
              padding: '9px 32px', borderTop: '1px solid var(--adm-border)',
              fontSize: 11, color: 'var(--adm-text-subtle)',
            }}>
              <span>{wordCount} words</span>
              <span>{charCount} chars</span>
              <span>~{readTime(wordCount)}</span>
              {wordsLeft > 0 ? (
                <span style={{ color: '#d97706', fontWeight: 500 }}>
                  {wordsLeft.toLocaleString()} more words for full AdSense score
                </span>
              ) : (
                <span style={{ color: '#16a34a', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <Check size={12} strokeWidth={2.25} /> AdSense word target reached
                </span>
              )}
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 10 }}>
                {savedAt
                  ? `Autosaved ${savedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : 'F11 · fullscreen · Ctrl+H · find & replace · Ctrl+P · print'}
              </span>
            </div>

            {/* Excerpt */}
            <div style={{ padding: '20px 32px', borderTop: '1px solid var(--adm-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--adm-text)' }}>Excerpt</span>
                <span style={{ fontSize: 11, color: excerpt.length > 250 ? '#f59e0b' : 'var(--adm-text-subtle)' }}>
                  {excerpt.length} characters
                </span>
              </div>
              <textarea
                value={excerpt}
                onChange={e => setExcerpt(e.target.value)}
                maxLength={280}
                rows={3}
                placeholder="Write a short summary of your post..."
                className="pe-field"
                style={{ ...fieldStyle, resize: 'vertical', lineHeight: 1.6 }}
              />
            </div>

            {/* SEO Settings */}
            <div style={{ padding: '0 32px 40px', borderTop: '1px solid var(--adm-border)' }}>
              <button
                onClick={() => setSeoOpen(o => !o)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: '14px 0', background: 'transparent', border: 'none',
                  color: 'var(--adm-text)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: 14 }}>⊕</span>
                SEO Settings
                <span style={{
                  marginLeft: 'auto', fontSize: 11, fontWeight: 700,
                  color: seoScore >= 70 ? '#16a34a' : seoScore >= 40 ? '#d97706' : '#dc2626',
                }}>
                  Score: {seoScore}/100
                </span>
                <span style={{
                  transform: seoOpen ? 'none' : 'rotate(-90deg)',
                  transition: 'transform 0.2s', fontSize: 10,
                  color: 'var(--adm-text-muted)', display: 'inline-block',
                }}>
                  ▾
                </span>
              </button>
              {seoOpen && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {[
                    { label: 'Meta Title',       value: metaTitle, set: setMetaTitle, max: 60,  ph: 'SEO title (defaults to post title)',    multi: false },
                    { label: 'Meta Description', value: metaDesc,  set: setMetaDesc,  max: 160, ph: 'SEO description (120–160 characters)', multi: true  },
                    { label: 'Meta Keywords',    value: metaKw,    set: setMetaKw,    max: null, ph: 'keyword1, keyword2, keyword3',         multi: false },
                  ].map(({ label, value, set, max, ph, multi }) => (
                    <div key={label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--adm-text)' }}>{label}</label>
                        {max && (
                          <span style={{ fontSize: 11, color: value.length > max * 0.9 ? '#f59e0b' : 'var(--adm-text-subtle)' }}>
                            {value.length}/{max}
                          </span>
                        )}
                      </div>
                      {multi ? (
                        <textarea
                          value={value} onChange={e => set(e.target.value)}
                          placeholder={ph} rows={3} maxLength={200}
                          className="pe-field" style={{ ...fieldStyle, resize: 'vertical' }}
                        />
                      ) : (
                        <input
                          value={value} onChange={e => set(e.target.value)}
                          placeholder={ph} maxLength={max ? max + 20 : undefined}
                          className="pe-field" style={fieldStyle}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── SIDEBAR ── */}
          {sidebarOpen && (
            <div style={{
              width: 320, flexShrink: 0,
              display: 'flex', flexDirection: 'column', gap: 12,
              position: 'sticky', top: HEADER_H, alignSelf: 'flex-start',
              height: '120vh', overflowY: 'auto', paddingRight: 4,
            }}>

              {/* Publishing */}
              <SideCard title="Publishing" icon={<Calendar size={14} />} open={openPanel === 'publishing'} onToggle={() => togglePanel('publishing')}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', color: 'var(--adm-text)' }}>
                    <input type="checkbox" checked={published} onChange={e => setPublished(e.target.checked)}
                      style={{ width: 16, height: 16, accentColor: '#7c3aed', cursor: 'pointer', flexShrink: 0 }} />
                    Published
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', color: 'var(--adm-text)' }}>
                    <input type="checkbox" checked={featured} onChange={e => setFeatured(e.target.checked)}
                      style={{ width: 16, height: 16, accentColor: '#d4af37', cursor: 'pointer', flexShrink: 0 }} />
                    <Star size={13} style={{ color: '#d4af37', flexShrink: 0 }} fill="#d4af37" />
                    Featured Post
                  </label>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                      <Calendar size={12} style={{ color: 'var(--adm-text-muted)', flexShrink: 0 }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--adm-text-muted)' }}>Publish Date</span>
                    </div>
                    <input type="datetime-local" value={publishDate} onChange={e => setPublishDate(e.target.value)}
                      className="pe-field" style={fieldStyle} />
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                      <User size={12} style={{ color: 'var(--adm-text-muted)', flexShrink: 0 }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--adm-text-muted)' }}>Author</span>
                    </div>
                    <input value="Admin" readOnly
                      style={{ ...fieldStyle, background: 'var(--adm-hover-bg)', cursor: 'default', color: 'var(--adm-text-muted)' }} />
                  </div>

                  <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
                    <button onClick={() => handleSave('draft')} disabled={saving}
                      style={{
                        flex: 1, padding: '8px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                        border: '1px solid var(--adm-border)', background: 'transparent',
                        color: 'var(--adm-text)', cursor: saving ? 'wait' : 'pointer',
                      }}>
                      Save Draft
                    </button>
                    <button onClick={() => handleSave('published')} disabled={saving}
                      style={{
                        flex: 1, padding: '8px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                        border: 'none', background: '#d4af37', color: '#000', cursor: saving ? 'wait' : 'pointer',
                      }}>
                      Publish
                    </button>
                  </div>
                </div>
              </SideCard>

              {/* Organization */}
              <SideCard title="Organization" icon={<Folder size={14} />} open={openPanel === 'organization'} onToggle={() => togglePanel('organization')}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                      <Folder size={12} style={{ color: 'var(--adm-text-muted)' }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--adm-text-muted)' }}>Category *</span>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <select value={category} onChange={e => setCategory(e.target.value)}
                        style={{ ...fieldStyle, appearance: 'none', WebkitAppearance: 'none', paddingRight: 28, cursor: 'pointer' }}>
                        {categories.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                      </select>
                      <ChevronDown size={12} style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--adm-text-muted)', pointerEvents: 'none' }} />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                      <Tag size={12} style={{ color: 'var(--adm-text-muted)' }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--adm-text-muted)' }}>Label</span>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <select value={label} onChange={e => setLabel(e.target.value)}
                        style={{ ...fieldStyle, appearance: 'none', WebkitAppearance: 'none', paddingRight: 28, cursor: 'pointer' }}>
                        <option value="">No label</option>
                        {labelOptions.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                      <ChevronDown size={12} style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--adm-text-muted)', pointerEvents: 'none' }} />
                    </div>
                  </div>

                </div>
              </SideCard>

              {/* Featured Image */}
              <SideCard title="Featured Image" icon={<ImageIcon size={14} />} open={openPanel === 'featured'} onToggle={() => togglePanel('featured')}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <MediaUpload value={cover} onChange={v => setCover(v)} label="" />
                  <div>
                    <span style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--adm-text-muted)', marginBottom: 6 }}>
                      Gradient Palette
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                      {['from', 'via', 'to'].map(k => (
                        <label key={k} style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                          <span style={{ fontSize: 9, color: 'var(--adm-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{k}</span>
                          <input type="color" value={palette[k]} onChange={e => setPalette(p => ({ ...p, [k]: e.target.value }))}
                            style={{ width: '100%', height: 28, borderRadius: 5, border: '1px solid var(--adm-border)', cursor: 'pointer', padding: 1 }} />
                        </label>
                      ))}
                    </div>
                    <div style={{ height: 36, borderRadius: 7, marginTop: 8, overflow: 'hidden', background: `linear-gradient(135deg, ${palette.from}, ${palette.via}, ${palette.to})` }} />
                  </div>
                </div>
              </SideCard>

              {/* Writing Toolkit */}
              <SideCard title="Writing Toolkit" accentBg="#7c3aed" icon={<Sparkles size={14} />} badge="2026" open={openPanel === 'writing'} onToggle={() => togglePanel('writing')}>
                <AIWritingToolkit
                  editor={editor}
                  title={title}
                  wordCount={wordCount}
                  metaTitle={metaTitle}
                  metaDescription={metaDesc}
                  metaKeywords={metaKw}
                  category={currentCat?.name || ''}
                  onUseHeadline={(text) => setTitle(text)}
                />
              </SideCard>

              {/* AI SEO Assistant */}
              <SideCard title="AI SEO Assistant" icon={<TrendingUp size={14} />} open={openPanel === 'seo'} onToggle={() => togglePanel('seo')}>
                <AISEOAssistant title={title} editor={editor} slug={slug} onFieldsInserted={handleSEOInserted} />
              </SideCard>

              {/* AI Image Generator */}
              <SideCard title="AI Image Generator" icon={<Wand2 size={14} />} open={openPanel === 'image'} onToggle={() => togglePanel('image')}>
                <AIImageGenerator editor={editor} onCoverChange={url => setCover(url)} />
              </SideCard>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
