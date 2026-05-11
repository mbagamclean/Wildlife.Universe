import { ReviewsAdminClient } from '@/components/admin/ReviewsAdminClient';

export const metadata = { title: 'Reviews · Admin' };

export default function AdminReviewsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-black sm:text-4xl">Reviews</h1>
        <p className="mt-2 text-sm text-[var(--color-fg-soft)]">
          Moderate reader reviews before they appear publicly.
        </p>
      </div>
      <ReviewsAdminClient />
    </div>
  );
}
