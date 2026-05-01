import { ProfileForm } from '@/components/auth/ProfileForm';

export const metadata = { title: 'Profile' };

export default function ProfilePage() {
  return (
    <section className="px-4 pb-20 pt-12 sm:pt-16">
      <ProfileForm />
    </section>
  );
}
