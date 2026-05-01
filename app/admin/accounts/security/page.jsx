'use client';
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { db } from '@/lib/storage/db';
import { useAuth } from '@/lib/auth/AuthContext';

export default function AdminSecurityPage() {
  const { user } = useAuth();
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [msg, setMsg] = useState(null);

  const changePassword = async () => {
    if (!next || next !== confirm) {
      setMsg({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    if (next.length < 6) {
      setMsg({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }
    try {
      const users = await db.users.list();
      const me = users.find((u) => u.email === user?.email);
      if (!me) {
        setMsg({ type: 'error', text: 'User not found.' });
        return;
      }
      await db.users.update(me.id, { password: next });
      setNext('');
      setConfirm('');
      setMsg({ type: 'success', text: 'Password updated successfully.' });
    } catch {
      setMsg({ type: 'error', text: 'Failed to update password.' });
    }
  };

  return (
    <div className="p-5 sm:p-8">
      <div className="mb-6">
        <p className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#d4af37]">
          <span className="h-3 w-1 rounded-full bg-[#d4af37]" />
          ACCOUNTS
        </p>
        <h1 className="text-2xl font-black sm:text-3xl" style={{ color: 'var(--adm-text)' }}>Accounts &amp; Security</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--adm-text-muted)' }}>Manage account credentials and security settings.</p>
      </div>

      <div className="max-w-lg">
        <div className="rounded-2xl p-6" style={{ background: 'var(--adm-surface)', boxShadow: 'var(--adm-shadow)', border: '1px solid var(--adm-border)' }}>
          <p className="mb-4 text-sm font-bold" style={{ color: 'var(--adm-text)' }}>Change Password</p>
          <div className="flex flex-col gap-3">
            {([['New Password', next, setNext], ['Confirm Password', confirm, setConfirm]]).map(([label, val, setVal]) => (
              <div key={label} className="relative">
                <label className="mb-1 block text-xs font-semibold" style={{ color: 'var(--adm-text-muted)' }}>{label}</label>
                <input
                  type={show ? 'text' : 'password'}
                  value={val}
                  onChange={(e) => setVal(e.target.value)}
                  className="w-full rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none"
                  style={{
                    background: 'var(--adm-surface-2)',
                    border: '1px solid var(--adm-border)',
                    color: 'var(--adm-text)',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#d4af37'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--adm-border)'; }}
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  className="absolute right-3 top-[30px] text-[#bbb] hover:text-[#888]"
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            ))}
          </div>
          {msg && (
            <p
              className={`mt-3 rounded-xl px-3 py-2 text-xs font-semibold ${
                msg.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'
              }`}
            >
              {msg.text}
            </p>
          )}
          <button
            onClick={changePassword}
            className="mt-4 w-full rounded-xl bg-[#008000] py-2.5 text-sm font-semibold text-white hover:bg-[#006400] active:scale-[0.98]"
          >
            Update Password
          </button>
        </div>
      </div>
    </div>
  );
}
