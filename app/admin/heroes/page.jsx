import { HeroList } from '@/components/admin/HeroList';

export const metadata = { title: 'Hero · Admin' };

export default function AdminHeroesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-black sm:text-4xl">Hero</h1>
        <p className="mt-2 text-sm text-[var(--color-fg-soft)]">
          Switch between modes and manage your homepage rotation.
        </p>
      </div>
      <HeroList />
    </div>
  );
}
