import { UserList } from '@/components/admin/UserList';

export const metadata = { title: 'Users · Admin' };

export default function AdminUsersPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-black sm:text-4xl">Users</h1>
        <p className="mt-2 text-sm text-[var(--color-fg-soft)]">
          Everyone who has signed up in this browser session.
        </p>
      </div>
      <UserList />
    </div>
  );
}
