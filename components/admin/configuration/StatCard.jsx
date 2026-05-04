'use client';

export function StatCard({ label, value, sublabel, icon: Icon, accent = '#008000', delta = null }) {
  return (
    <div
      className="flex flex-col gap-3 rounded-2xl p-5 transition-all"
      style={{
        background: 'var(--adm-surface)',
        borderTop: `3px solid ${accent}`,
        boxShadow: 'var(--adm-shadow)',
        border: '1px solid var(--adm-border)',
        borderTopColor: accent,
      }}
    >
      <div className="flex items-center justify-between">
        {Icon && (
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ background: `${accent}18` }}
          >
            <Icon className="h-[18px] w-[18px]" style={{ color: accent }} />
          </div>
        )}
        {delta !== null && delta !== undefined && (
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
            style={
              delta >= 0
                ? { background: '#d4edda', color: '#155724' }
                : { background: '#fde2e2', color: '#7a1f1f' }
            }
          >
            {delta >= 0 ? '+' : ''}
            {delta}%
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-black" style={{ color: 'var(--adm-text)' }}>{value}</p>
        <p className="mt-0.5 text-xs font-medium" style={{ color: 'var(--adm-text-muted)' }}>{label}</p>
        {sublabel && (
          <p className="mt-0.5 text-[11px]" style={{ color: 'var(--adm-text-subtle)' }}>{sublabel}</p>
        )}
      </div>
    </div>
  );
}
