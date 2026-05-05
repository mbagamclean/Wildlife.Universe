import { Cookie } from 'lucide-react';
import { LegalPage } from '@/components/legal/LegalPage';
import { buildStaticMetadata, SITE_NAME } from '@/lib/seo';

export const metadata = buildStaticMetadata({
  title: 'Cookie Policy',
  description: `Which cookies ${SITE_NAME} uses, why, and how to control them.`,
  path: '/legal/cookies',
});

const sections = [
  {
    heading: 'What are cookies?',
    body: 'Cookies are small text files a website stores in your browser. They let the site remember things like whether you’re signed in, which language you prefer, and which articles you’ve already read.',
  },
  {
    heading: 'Cookies we use',
    list: [
      'Essential — sign-in session cookies set by Supabase. Without these, you can’t stay logged in. They expire when your session ends.',
      'Preference — remember your language, theme, and listening-mode settings on this device. Lifetime: up to 1 year.',
      'Analytics (aggregate only) — count visits per page so we can see which articles resonate. We do not link these to your identity, and we never sell the data.',
    ],
  },
  {
    heading: 'No advertising cookies',
    body: `${SITE_NAME} does not currently run third-party display advertising and does not place ad-tech tracking cookies. If we ever do, we’ll update this page and ask for explicit consent first.`,
  },
  {
    heading: 'Controlling cookies',
    body: 'You can clear or block cookies in your browser settings at any time. Essential cookies are required for sign-in to work — disabling them means you’ll need to sign in on every visit.',
  },
  {
    heading: 'Changes',
    body: 'When the cookie set changes, we update this page with a new effective date.',
  },
];

export default function CookiePolicyPage() {
  return (
    <LegalPage
      icon={Cookie}
      title="Cookie Policy"
      lead={`A short, plain-English list of the cookies ${SITE_NAME} sets and what each one does.`}
      effectiveDate="May 5, 2026"
      sections={sections}
    />
  );
}
