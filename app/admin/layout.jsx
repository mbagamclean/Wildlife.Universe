import { AdminLayout } from '@/components/admin/AdminLayout';

export const metadata = { title: 'Admin' };

export default function AdminRootLayout({ children }) {
  return <AdminLayout>{children}</AdminLayout>;
}
