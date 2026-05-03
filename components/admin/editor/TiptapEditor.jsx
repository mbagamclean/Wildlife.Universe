'use client';
import { EditorContent } from '@tiptap/react';
import { useTheme } from 'next-themes';

export function TiptapEditor({ editor, placeholder }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <>
      <style>{`
        .tiptap-body .tiptap { outline: none; min-height: 480px; }
        .tiptap-body .tiptap h1 { font-size: 2em; font-weight: 700; margin: 0.5em 0 0.3em; line-height: 1.2; }
        .tiptap-body .tiptap h2 { font-size: 1.55em; font-weight: 700; margin: 1em 0 0.3em; line-height: 1.25; }
        .tiptap-body .tiptap h3 { font-size: 1.2em; font-weight: 600; margin: 0.8em 0 0.25em; line-height: 1.3; }
        .tiptap-body .tiptap p { margin: 0.55em 0; line-height: 1.85; }
        .tiptap-body .tiptap ul { list-style: disc; padding-left: 1.7em; margin: 0.5em 0; }
        .tiptap-body .tiptap ol { list-style: decimal; padding-left: 1.7em; margin: 0.5em 0; }
        .tiptap-body .tiptap li { margin: 0.2em 0; }
        .tiptap-body .tiptap a { color: #d4af37; text-decoration: underline; }
        .tiptap-body .tiptap blockquote { border-left: 3px solid #7c3aed; padding-left: 1em; margin: 0.7em 0; font-style: italic; color: var(--adm-text-muted); }
        .tiptap-body .tiptap pre { background: var(--adm-surface); border: 1px solid var(--adm-border); padding: 14px 16px; border-radius: 8px; font-family: monospace; font-size: 0.85em; overflow-x: auto; margin: 0.5em 0; }
        .tiptap-body .tiptap code { background: var(--adm-hover-bg); padding: 1px 5px; border-radius: 3px; font-size: 0.88em; font-family: monospace; }
        .tiptap-body .tiptap hr { border: none; border-top: 1px solid var(--adm-border); margin: 1.2em 0; }
        .tiptap-body .tiptap img { max-width: 100%; border-radius: 10px; display: block; margin: 1em 0; }
        .tiptap-body .tiptap table { border-collapse: collapse; width: 100%; margin: 0.8em 0; }
        .tiptap-body .tiptap th, .tiptap-body .tiptap td { border: 1px solid var(--adm-border); padding: 8px 12px; text-align: left; }
        .tiptap-body .tiptap th { background: var(--adm-hover-bg); font-weight: 600; }
        .tiptap-body .tiptap p.is-editor-empty:first-child::before { content: attr(data-placeholder); color: var(--adm-text-subtle); pointer-events: none; float: left; height: 0; }
        .tiptap-body .tiptap .is-empty::before { content: attr(data-placeholder); color: var(--adm-text-subtle); pointer-events: none; float: left; height: 0; }
        .tiptap-body .tiptap mark { background: rgba(212,175,55,0.3); border-radius: 2px; }
        .tiptap-body ::selection { background: rgba(124,58,237,0.2); }
      `}</style>
      <div
        className="tiptap-body"
        style={{
          flex: 1,
          padding: '20px 32px',
          fontSize: 15,
          lineHeight: 1.85,
          color: 'var(--adm-text)',
          caretColor: '#7c3aed',
        }}
      >
        <EditorContent editor={editor} />
      </div>
    </>
  );
}
