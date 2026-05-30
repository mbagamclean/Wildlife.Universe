'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Upload, Save, AlertCircle, CheckCircle2, Loader2, User, ExternalLink,
} from 'lucide-react';

const FIELDS = [
  { key: 'name',         label: 'Display name',         type: 'text',     hint: 'Shown on bylines and the /author/<slug> page.' },
  { key: 'title',        label: 'Job title',            type: 'text',     hint: 'E.g. "Senior Wildlife Biologist" — appears under the name and in Article JSON-LD jobTitle.' },
  { key: 'bio',          label: 'Bio',                  type: 'textarea', hint: '2–3 sentences. Used on the profile page, in Person.description JSON-LD, and in the policy / team page.' },
  { key: 'expertise',    label: 'Expertise',            type: 'text',     hint: 'Comma-separated topics. Surfaces as expertise chips on the profile page and as knowsAbout in JSON-LD.' },
  { key: 'affiliation',  label: 'Affiliation',          type: 'text',     hint: 'Institution or organisation. Emitted as Person.alumniOf for E-E-A-T credibility.' },
  { key: 'email',        label: 'Public email',         type: 'text',     hint: 'Optional. Shown on the profile page if provided.' },
  { key: 'twitter',      label: 'Twitter / X profile',  type: 'text',     hint: 'Full URL. Emitted as Person.sameAs.' },
  { key: 'website',      label: 'Website',              type: 'text',     hint: 'Full URL. Emitted as Person.sameAs.' },
];

export default function EditAuthorPage() {
  const { slug } = useParams();
  const router = useRouter();
  const [form, setForm] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [warning, setWarning] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/admin/authors/${slug}`, { credentials: 'include' });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(json.error || `HTTP ${res.status}`);
          return;
        }
        setForm(json);
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  function update(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
    setSaved(false);
  }

  async function onSave(e) {
    e?.preventDefault?.();
    setSaving(true);
    setError(null);
    setSaved(false);
    setWarning(null);
    try {
      const payload = {};
      for (const f of FIELDS) payload[f.key] = form[f.key] ?? '';
      payload.photoUrl = form.photoUrl ?? '';
      const res = await fetch(`/api/admin/authors/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || `HTTP ${res.status}`);
        return;
      }
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function onPhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    setWarning(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`/api/admin/authors/${slug}/photo`, {
        method: 'POST',
        credentials: 'include',
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) {
        setUploadError(json.error || `HTTP ${res.status}`);
        return;
      }
      if (json.warning) setWarning(json.warning);
      setForm((f) => ({ ...f, photoUrl: json.photoUrl }));
      setSaved(false);
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  if (error && !form) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: 720, margin: '0 auto' }}>
        <Link href="/admin/content/authors" style={backLinkStyle}>
          <ArrowLeft size={14} /> Back to authors
        </Link>
        <div style={errBoxStyle}>
          <AlertCircle size={16} /> {error}
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div style={{ padding: '2rem', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--adm-text-muted)' }}>
        <Loader2 size={16} className="wu-spin" /> Loading author…
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: 920, margin: '0 auto' }}>
      <Link href="/admin/content/authors" style={backLinkStyle}>
        <ArrowLeft size={14} /> Back to authors
      </Link>

      <header style={{ display: 'flex', alignItems: 'flex-start', gap: 16, margin: '0.5rem 0 1.5rem' }}>
        <div style={avatarStyle}>
          {form.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.photoUrl} alt={form.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <User size={36} style={{ color: '#008000' }} />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--adm-text-muted)' }}>
            Edit author
          </p>
          <h1 style={{ margin: '0.3rem 0', fontSize: '1.5rem', fontWeight: 800, color: 'var(--adm-text)' }}>
            {form.name}
          </h1>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--adm-text-muted)' }}>
            Slug: <code style={{ background: 'var(--adm-hover-bg)', padding: '1px 6px', borderRadius: 4 }}>{form.slug}</code>
            {' · '}
            <a href={`/author/${form.slug}`} target="_blank" rel="noopener" style={{ color: 'var(--adm-link)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              View public profile <ExternalLink size={11} />
            </a>
          </p>
        </div>
      </header>

      {error && (
        <div style={errBoxStyle}>
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {warning && (
        <div style={warnBoxStyle}>
          <AlertCircle size={16} /> {warning}
        </div>
      )}
      {saved && (
        <div style={okBoxStyle}>
          <CheckCircle2 size={16} /> Saved. Public pages revalidated.
        </div>
      )}

      {/* Photo upload */}
      <div style={panelStyle}>
        <h2 style={panelHStyle}>Headshot</h2>
        <p style={hintStyle}>
          Recommended: a square portrait at least 512×512. Larger images are auto-resized to 512×512 WebP.
          The same image is used on the profile page, byline avatars, and the Article JSON-LD <code>Person.image</code> field.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={onPhotoUpload}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={uploading ? btnDisabledStyle : btnStyle}
          >
            {uploading ? <Loader2 size={14} className="wu-spin" /> : <Upload size={14} />}
            {uploading ? 'Uploading…' : (form.photoUrl ? 'Replace photo' : 'Upload photo')}
          </button>
          {form.photoUrl && (
            <button
              type="button"
              onClick={() => { update('photoUrl', ''); }}
              style={btnSecondaryStyle}
            >
              Clear (use default)
            </button>
          )}
        </div>
        {uploadError && (
          <p style={{ marginTop: 8, fontSize: 12, color: '#dc2626' }}>
            <AlertCircle size={12} style={{ verticalAlign: 'middle' }} /> {uploadError}
          </p>
        )}
        {form.photoUrl && (
          <p style={{ marginTop: 8, fontSize: 11, color: 'var(--adm-text-muted)', wordBreak: 'break-all' }}>
            <code>{form.photoUrl}</code>
          </p>
        )}
      </div>

      {/* Editable fields */}
      <form onSubmit={onSave}>
        <div style={panelStyle}>
          <h2 style={panelHStyle}>Profile</h2>
          {FIELDS.map((f) => (
            <div key={f.key} style={{ marginBottom: 16 }}>
              <label style={labelStyle}>{f.label}</label>
              {f.type === 'textarea' ? (
                <textarea
                  value={form[f.key] ?? ''}
                  onChange={(e) => update(f.key, e.target.value)}
                  rows={4}
                  style={textareaStyle}
                />
              ) : (
                <input
                  type="text"
                  value={form[f.key] ?? ''}
                  onChange={(e) => update(f.key, e.target.value)}
                  style={inputStyle}
                />
              )}
              <p style={hintStyle}>{f.hint}</p>
            </div>
          ))}
        </div>

        <div style={panelStyle}>
          <h2 style={panelHStyle}>Expertise categories (read-only)</h2>
          <p style={hintStyle}>
            These determine which posts get auto-assigned to this author by the autopilot. They live in code
            (<code>lib/seo/authors.js</code>) so any change here would also have to change post-author
            assignment for ~50–200 existing posts. To rebalance assignment, edit the JS module and re-run
            <code> scripts/_one-off/backfill-authors.mjs</code>.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {(form.expertiseCategories || []).map((c) => (
              <code key={c} style={chipStyle}>{c}</code>
            ))}
            {(form.expertiseCategories || []).length === 0 && (
              <span style={{ fontSize: 11, color: 'var(--adm-text-muted)' }}>(none)</span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: '1.5rem' }}>
          <Link href="/admin/content/authors" style={btnSecondaryStyle}>Cancel</Link>
          <button type="submit" disabled={saving} style={saving ? btnDisabledStyle : btnPrimaryStyle}>
            {saving ? <Loader2 size={14} className="wu-spin" /> : <Save size={14} />}
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>

      <style>{`
        .wu-spin { animation: wu-spin 1s linear infinite; }
        @keyframes wu-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

const backLinkStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  fontSize: 12,
  color: 'var(--adm-text-muted)',
  textDecoration: 'none',
};

const avatarStyle = {
  width: 80,
  height: 80,
  borderRadius: 16,
  background: 'rgba(0,128,0,0.12)',
  border: '1px solid rgba(0,128,0,0.3)',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  flexShrink: 0,
};

const panelStyle = {
  background: 'var(--adm-surface)',
  border: '1px solid var(--adm-border)',
  borderRadius: 12,
  padding: '1.25rem 1.5rem',
  marginBottom: '1.25rem',
};

const panelHStyle = {
  margin: '0 0 0.75rem',
  fontSize: 13,
  fontWeight: 800,
  color: 'var(--adm-text)',
  letterSpacing: '0.02em',
  textTransform: 'uppercase',
};

const labelStyle = {
  display: 'block',
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--adm-text-muted)',
  marginBottom: 4,
  letterSpacing: '0.04em',
};

const inputStyle = {
  width: '100%',
  padding: '8px 12px',
  background: 'var(--adm-bg)',
  border: '1px solid var(--adm-border)',
  borderRadius: 8,
  color: 'var(--adm-text)',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
};

const textareaStyle = {
  ...inputStyle,
  resize: 'vertical',
  fontFamily: 'inherit',
  lineHeight: 1.6,
};

const hintStyle = {
  margin: '4px 0 0',
  fontSize: 11,
  color: 'var(--adm-text-muted)',
  lineHeight: 1.55,
};

const btnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '7px 14px',
  borderRadius: 7,
  background: 'var(--adm-bg)',
  border: '1px solid var(--adm-border)',
  color: 'var(--adm-text)',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  textDecoration: 'none',
};
const btnPrimaryStyle = {
  ...btnStyle,
  background: '#008000',
  border: 'none',
  color: '#fff',
};
const btnSecondaryStyle = {
  ...btnStyle,
};
const btnDisabledStyle = {
  ...btnStyle,
  opacity: 0.6,
  cursor: 'wait',
};

const chipStyle = {
  fontSize: 10,
  padding: '3px 8px',
  borderRadius: 999,
  background: 'rgba(0,128,0,0.08)',
  color: '#008000',
  fontWeight: 600,
};

const errBoxStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 14px',
  borderRadius: 8,
  background: 'rgba(220,38,38,0.08)',
  border: '1px solid rgba(220,38,38,0.3)',
  color: '#dc2626',
  fontSize: 13,
  marginBottom: '1rem',
};
const warnBoxStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 14px',
  borderRadius: 8,
  background: 'rgba(212,175,55,0.08)',
  border: '1px solid rgba(212,175,55,0.4)',
  color: '#a07a00',
  fontSize: 13,
  marginBottom: '1rem',
};
const okBoxStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 14px',
  borderRadius: 8,
  background: 'rgba(0,128,0,0.08)',
  border: '1px solid rgba(0,128,0,0.3)',
  color: '#008000',
  fontSize: 13,
  marginBottom: '1rem',
};
