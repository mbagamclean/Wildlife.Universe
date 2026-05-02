import { Inter, Playfair_Display } from 'next/font/google';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { SiteSettingsProvider } from '@/lib/providers/SiteSettingsProvider';
import { StorageProvider } from '@/lib/storage/StorageProvider';
import { AuthProvider } from '@/lib/auth/AuthContext';
import { SiteChrome } from '@/components/layout/SiteChrome';
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
  title: {
    default: 'Wildlife Universe',
    template: '%s | Wildlife Universe',
  },
  description:
    'A modern luxury wildlife platform exploring animals, plants, birds, and the living world.',
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
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
        <ThemeProvider>
          <SiteSettingsProvider>
            <StorageProvider>
              <AuthProvider>
                <SiteChrome>{children}</SiteChrome>
              </AuthProvider>
            </StorageProvider>
          </SiteSettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
