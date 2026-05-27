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

  const heading = bookItem
    ? `Buy ${bookItem.title} — Wildlife Universe`
    : 'Subscribe to Wildlife Universe';
  const subheading = bookItem
    ? 'Complete your purchase securely below.'
    : 'Unlock premium wildlife content, ad-free reading, and exclusive features.';

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse 90% 55% at 50% -5%, rgba(0,128,0,0.14) 0%, #040d07 55%, #040d07 100%)',
      }}
    >
      <div style={{ maxWidth: 1060, margin: '0 auto', padding: '48px 20px 64px' }}>
        {/* Page-level <h1> — gives the page a single primary heading
            for SEO/accessibility. PaymentGateway below uses h2/h3 for
            its section structure. */}
        <header style={{ textAlign: 'center', marginBottom: 36 }}>
          <h1
            style={{
              fontSize: 'clamp(28px, 4.2vw, 44px)',
              fontWeight: 900,
              letterSpacing: '-0.02em',
              color: '#fff',
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            {heading}
          </h1>
          <p
            style={{
              marginTop: 10,
              fontSize: 15,
              color: 'rgba(255,255,255,0.62)',
              maxWidth: 620,
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            {subheading}
          </p>
        </header>
        <Suspense fallback={null}>
          <PaymentGateway bookItem={bookItem} />
        </Suspense>
      </div>
    </div>
  );
}
