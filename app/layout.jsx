import { Inter, Playfair_Display } from 'next/font/google';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { SiteSettingsProvider } from '@/lib/providers/SiteSettingsProvider';
import { StorageProvider } from '@/lib/storage/StorageProvider';
import { AuthProvider } from '@/lib/auth/AuthContext';
import { SiteChrome } from '@/components/layout/SiteChrome';
import { PageviewTracker } from '@/components/analytics/PageviewTracker';
import {
  SITE_NAME,
  SITE_URL,
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  JsonLd,
  buildOrganizationJsonLd,
  buildWebsiteJsonLd,
  buildVerificationMetadata,
  buildHreflangMap,
} from '@/lib/seo';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
  weight: ['400', '700', '900'],
});

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  generator: 'Next.js',
  referrer: 'strict-origin-when-cross-origin',
  // Search-engine site verification — Google, Bing, Yandex etc. each
  // issue a token when you claim a property; set the env var and the
  // matching `<meta>` renders, claiming the property automatically.
  // Per-page metadata can override; the root keeps the site-wide claim
  // alive for unverified paths too.
  verification: buildVerificationMetadata(),
  // Site-wide hreflang + canonical + RSS link.
  // Trailing slash on the homepage canonical to match the request URL
  // (Google treats `/` and `` as different; the request is always `/`).
  alternates: {
    canonical: `${SITE_URL}/`,
    languages: buildHreflangMap(`${SITE_URL}/`),
    types: {
      'application/rss+xml': [{ url: '/rss.xml', title: `${SITE_NAME} — RSS` }],
    },
  },
  formatDetection: { email: false, address: false, telephone: false },
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    url: `${SITE_URL}/`,
    locale: 'en_US',
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
};

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f9f5' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0f0a' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${playfair.variable}`}
    >
      <body>
        <JsonLd data={buildOrganizationJsonLd()} />
        <JsonLd data={buildWebsiteJsonLd()} />
        <ThemeProvider>
          <SiteSettingsProvider>
            <StorageProvider>
              <AuthProvider>
                <PageviewTracker />
                <SiteChrome>{children}</SiteChrome>
              </AuthProvider>
            </StorageProvider>
          </SiteSettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
