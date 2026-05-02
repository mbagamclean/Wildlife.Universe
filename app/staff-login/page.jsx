import { Suspense } from 'react';
import { StaffLoginForm } from '@/components/auth/StaffLoginForm';

export const metadata = {
  title: 'Staff Portal — Wildlife Universe',
  robots: { index: false, follow: false },
};

export default function StaffLoginPage() {
  return (
    <Suspense fallback={null}>
      <StaffLoginForm />
    </Suspense>
  );
}
