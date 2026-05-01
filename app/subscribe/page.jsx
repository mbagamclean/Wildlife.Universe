import { Suspense } from 'react';
import { PaymentGateway } from '@/components/payment/PaymentGateway';

export const metadata = {
  title: 'Subscribe · Wildlife Universe',
  description: 'Unlock premium wildlife content, ad-free experience, and exclusive features.',
};

export default async function SubscribePage({ searchParams }) {
  const params = await searchParams;

  const bookItem =
    params?.mode === 'book' && params?.title
      ? {
          slug:  params.slug  || '',
          title: decodeURIComponent(params.title),
          price: parseFloat(params.price || '0'),
        }
      : null;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse 90% 55% at 50% -5%, rgba(0,128,0,0.14) 0%, #040d07 55%, #040d07 100%)',
      }}
    >
      <div style={{ maxWidth: 1060, margin: '0 auto', padding: '48px 20px 64px' }}>
        <Suspense fallback={null}>
          <PaymentGateway bookItem={bookItem} />
        </Suspense>
      </div>
    </div>
  );
}
