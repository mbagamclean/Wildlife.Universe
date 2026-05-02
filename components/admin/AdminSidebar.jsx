'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  LayoutDashboard,
  FileText, PawPrint, Feather, Leaf, Bug, Globe, MessageSquare,
  Users,
  Folder, Tag, Image as ImageIcon,
  LayoutGrid, Settings, Mail, Newspaper, BarChart2, Megaphone,
  Activity, Share2, CheckCircle2, Inbox,
  Shield, UserCircle,
  Home, LogOut,
} from 'lucide-react';

const NAV = [
  {
    section: 'MAIN',
    items: [
      { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    ],
  },
  {
    section: 'CONTENT',
    items: [
      { href: '/admin/content/posts',    label: 'Posts',    icon: FileText },
      { href: '/admin/content/animals',  label: 'Animals',  icon: PawPrint },
      { href: '/admin/content/birds',    label: 'Birds',    icon: Feather },
      { href: '/admin/content/plants',   label: 'Plants',   icon: Leaf },
      { href: '/admin/content/insects',  label: 'Insects',  icon: Bug },
      { href: '/admin/content/pages',    label: 'Pages',    icon: Globe },
      { href: '/admin/content/comments', label: 'Comments', icon: MessageSquare },
    ],
  },
  {
    section: 'TEAM',
    items: [
      { href: '/admin/team', label: 'Team Members', icon: Users },
    ],
  },
  {
    section: 'ORGANIZATION',
    items: [
      { href: '/admin/organization/categories', label: 'Categories', icon: Folder },
      { href: '/admin/organization/labels',     label: 'Labels',     icon: Tag },
      { href: '/admin/organization/media',      label: 'Media',      icon: ImageIcon },
    ],
  },
  {
    section: 'CONFIGURATION',
    items: [
      { href: '/admin/configuration/user-dashboard',    label: 'User Dashboard Mgmt',    icon: LayoutGrid },
      { href: '/admin/configuration/settings',          label: 'Settings',               icon: Settings },
      { href: '/admin/configuration/subscribers',       label: 'Subscribers',            icon: Mail },
      { href: '/admin/configuration/publishers',        label: 'Publishers',             icon: Newspaper },
      { href: '/admin/configuration/analytics',         label: 'Analytics',              icon: BarChart2 },
      { href: '/admin/configuration/ad-management',     label: 'Ad Management',          icon: Megaphone },
      { href: '/admin/configuration/live-activity',     label: 'Live Activity',          icon: Activity },
      { href: '/admin/configuration/social-media',      label: 'Social Media Auto.',     icon: Share2 },
      { href: '/admin/configuration/content-quality',   label: 'Content Quality',        icon: CheckCircle2 },
      { href: '/admin/configuration/messages',          label: 'Messages',               icon: Inbox },
    ],
  },
  {
    section: 'ACCOUNTS',
    items: [
      { href: '/admin/accounts/security', label: 'Accounts & Security', icon: Shield },
      { href: '/admin/accounts/profile',  label: 'Author Profile',      icon: UserCircle },
    ],
  },
];

export function AdminSidebar({ onClose }) {
  const pathname = usePathname();
  const router   = useRouter();
  const { user, signOut } = useAuth();

  const isActive = (item) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : (user?.email?.[0] ?? 'C').toUpperCase();

  const displayName = user?.name || user?.email?.split('@')[0] || 'CEO';

  return (
    <div className="flex h-full flex-col overflow-hidden" style={{ background: 'var(--adm-surface)' }}>

      {/* Full Access badge */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 flex-shrink-0 rounded-full bg-[#008000]" />
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--adm-text-subtle)' }}>
            Full Access
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 pb-2">
        {NAV.map(({ section, items }) => (
          <div key={section} className="mb-1">
            <p className="px-2 pt-3 pb-1.5 text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--adm-text-subtle)' }}>
              {section}
            </p>
            {items.map((item) => {
              const active = isActive(item);
              const Icon   = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className="group flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm font-medium transition-all"
                  style={
                    active
                      ? {
                          background:  'var(--adm-active-bg)',
                          borderLeft:  '3px solid var(--adm-active-border)',
                          paddingLeft: 8,
                          fontWeight:  600,
                          color:       'var(--adm-text)',
                        }
                      : {
                          borderLeft:  '3px solid transparent',
                          color:       'var(--adm-text-muted)',
                        }
                  }
                  onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--adm-hover-bg)'; }}
                  onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                >
                  <Icon
                    className="h-[17px] w-[17px] flex-shrink-0"
                    style={{ color: active ? '#d4af37' : 'var(--adm-text-muted)' }}
                  />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="flex-shrink-0 px-3 py-3" style={{ borderTop: '1px solid var(--adm-border)' }}>
        <div className="mb-3 flex items-center gap-2.5 px-1">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white"
            style={{ background: '#d4af37' }}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-bold" style={{ color: 'var(--adm-text)' }}>{displayName}</p>
            <p className="text-[11px] uppercase tracking-widest" style={{ color: 'var(--adm-text-subtle)' }}>{user?.role ?? 'staff'}</p>
          </div>
        </div>

        <div className="flex gap-1">
          <button
            onClick={() => { router.push('/'); onClose?.(); }}
            title="Go to website"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] transition-colors"
            style={{ color: 'var(--adm-text-muted)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--adm-hover-bg)'; e.currentTarget.style.color = 'var(--adm-text)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--adm-text-muted)'; }}
          >
            <Home className="h-3.5 w-3.5" />
            Home
          </button>
          <button
            onClick={() => { signOut?.(); router.push('/'); }}
            title="Sign out"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] transition-colors"
            style={{ color: 'var(--adm-text-muted)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#f87171'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--adm-text-muted)'; }}
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
