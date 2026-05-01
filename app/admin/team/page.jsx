'use client';
import { useEffect, useState } from 'react';
import { db } from '@/lib/storage/db';
import { UserPlus, Shield, Newspaper, Wrench } from 'lucide-react';

const ROLE_TABS = [
  { key: 'admin',      label: 'Admins',      icon: Shield,    color: '#008000' },
  { key: 'publisher',  label: 'Publishers',  icon: Newspaper, color: '#6b9fdb' },
  { key: 'technician', label: 'Technicians', icon: Wrench,    color: '#d4af37' },
];

export default function AdminTeamPage() {
  const [users, setUsers] = useState([]);
  const [tab, setTab] = useState('admin');
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'admin' });
  const [adding, setAdding] = useState(false);

  const load = () => db.users.list().then((u) => { setUsers(u); setLoaded(true); });
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!form.email) return;
    await db.users.create({ ...form, password: 'changeme123' });
    setForm({ name: '', email: '', role: tab });
    setAdding(false);
    load();
  };

  const filtered = users.filter((u) => u.role === tab);

  return (
    <div className="p-5 sm:p-8">
      <div className="mb-6">
        <p className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#d4af37]">
          <span className="h-3 w-1 rounded-full bg-[#d4af37]" />
          TEAM
        </p>
        <h1 className="text-2xl font-black sm:text-3xl" style={{ color: 'var(--adm-text)' }}>Team Members</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--adm-text-muted)' }}>Manage publishers, admins, and technicians.</p>
      </div>

      {/* Role tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {ROLE_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all"
            style={
              tab === t.key
                ? { background: t.color, color: '#fff', boxShadow: `0 4px 12px ${t.color}40` }
                : { background: 'var(--adm-surface)', color: 'var(--adm-text-muted)', boxShadow: 'var(--adm-shadow)', border: '1px solid var(--adm-border)' }
            }
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
        <button
          onClick={() => { setAdding(true); setForm({ name: '', email: '', role: tab }); }}
          className="ml-auto flex items-center gap-2 rounded-xl bg-[#008000] px-4 py-2 text-sm font-semibold text-white hover:bg-[#006400]"
        >
          <UserPlus className="h-4 w-4" /> Add Member
        </button>
      </div>

      {adding && (
        <div className="mb-4 rounded-2xl p-5" style={{ background: 'var(--adm-surface)', boxShadow: 'var(--adm-shadow)', border: '1px solid var(--adm-border)' }}>
          <p className="mb-3 text-sm font-bold" style={{ color: 'var(--adm-text)' }}>New {tab}</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Full name"
              className="rounded-xl px-3 py-2 text-sm focus:outline-none"
              style={{
                background: 'var(--adm-surface-2)',
                border: '1px solid var(--adm-border)',
                color: 'var(--adm-text)',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#d4af37'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--adm-border)'; }}
            />
            <input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Email address"
              className="rounded-xl px-3 py-2 text-sm focus:outline-none"
              style={{
                background: 'var(--adm-surface-2)',
                border: '1px solid var(--adm-border)',
                color: 'var(--adm-text)',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#d4af37'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--adm-border)'; }}
            />
            <div className="flex gap-2">
              <button
                onClick={add}
                className="flex-1 rounded-xl bg-[#008000] py-2 text-sm font-semibold text-white hover:bg-[#006400]"
              >
                Add
              </button>
              <button
                onClick={() => setAdding(false)}
                className="flex-1 rounded-xl py-2 text-sm font-semibold"
                style={{ background: 'var(--adm-surface-3)', color: 'var(--adm-text-muted)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl" style={{ background: 'var(--adm-surface)', boxShadow: 'var(--adm-shadow)', border: '1px solid var(--adm-border)' }}>
        {!loaded ? (
          <p className="p-8 text-center text-sm" style={{ color: 'var(--adm-text-subtle)' }}>Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-center text-sm" style={{ color: 'var(--adm-text-subtle)' }}>
            No {ROLE_TABS.find((t) => t.key === tab)?.label.toLowerCase()} yet.
          </p>
        ) : (
          filtered.map((u, i) => (
            <div
              key={u.id}
              className="flex items-center gap-3 px-5 py-3.5"
              style={i < filtered.length - 1 ? { borderBottom: '1px solid var(--adm-border)' } : {}}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-bold text-[#d4af37]" style={{ background: 'rgba(212,175,55,0.15)' }}>
                {(u.name || u.email)[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold" style={{ color: 'var(--adm-text)' }}>{u.name || '—'}</p>
                <p className="text-[11px]" style={{ color: 'var(--adm-text-subtle)' }}>{u.email}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
