'use client';

export function AIPageHeader({ eyebrow = 'CONFIGURATION', title, description, icon: Icon, accent = '#d4af37' }) {
  return (
    <div className="mb-6 flex items-start gap-4">
      {Icon && (
        <div
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl"
          style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}
        >
          <Icon className="h-5 w-5" style={{ color: accent }} />
        </div>
      )}
      <div className="min-w-0">
        <p className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest" style={{ color: accent }}>
          <span className="h-3 w-1 rounded-full" style={{ background: accent }} />
          {eyebrow}
        </p>
        <h1 className="text-2xl font-black sm:text-3xl" style={{ color: 'var(--adm-text)' }}>
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm" style={{ color: 'var(--adm-text-muted)' }}>
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
