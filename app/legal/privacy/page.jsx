import { Lock } from 'lucide-react';
import { LegalPage } from '@/components/legal/LegalPage';
import { buildStaticMetadata, SITE_NAME } from '@/lib/seo';

export const metadata = buildStaticMetadata({
  title: 'Privacy Policy',
  description: `How ${SITE_NAME} collects, uses, and safeguards your personal information.`,
  path: '/legal/privacy',
});

const sections = [
  {
    heading: 'Who we are',
    body: `${SITE_NAME} (“we”, “us”, “our”) operates wildlifeuniverse.org and the related apps and services. We publish wildlife journalism, species profiles, and conservation reporting. This policy explains what data we collect, why, and what choices you have.`,
  },
  {
    heading: 'Information we collect',
    list: [
      'Account information you provide when signing up (email, display name, password hash).',
      'Newsletter subscriptions (email address only).',
      'Comments, saved articles, and reading preferences if you’re signed in.',
      'Aggregated, non-identifying analytics — page views, referrer, country, and approximate session duration. We do not link these to your identity.',
      'Server logs (IP address, user agent, timestamp) retained for up to 30 days for security and abuse prevention.',
    ],
  },
  {
    heading: 'How we use your information',
    list: [
      'To deliver the articles, newsletters, and tools you’ve requested.',
      'To improve content and site performance based on aggregated analytics.',
      'To prevent fraud, abuse, and spam, and to keep the platform secure.',
      'To respond to questions or feedback you send us.',
    ],
  },
  {
    heading: 'Sharing your information',
    body: 'We never sell your personal data. We share information only with infrastructure providers (Supabase, Vercel) under contracts that require them to protect it, with email and analytics providers strictly limited to what each tool needs to function, and where required by law in response to valid legal process.',
  },
  {
    heading: 'Cookies',
    body: 'We use a small number of cookies — see our Cookie Policy for the full list. You can decline non-essential cookies through your browser or our consent banner where available.',
  },
  {
    heading: 'Your rights',
    list: [
      'Access — request a copy of the personal data we hold about you.',
      'Correction — ask us to fix anything that’s wrong.',
      'Deletion — close your account and have your data erased, except where we’re required to keep it.',
      'Objection — opt out of newsletters or non-essential processing at any time.',
    ],
  },
  {
    heading: 'Data retention',
    body: 'Account data lives for as long as your account is active. Newsletter records are deleted within 30 days of unsubscribe. Analytics is aggregated and cannot be tied back to you.',
  },
  {
    heading: 'Children',
    body: `${SITE_NAME} is intended for general audiences. We don’t knowingly collect personal data from children under 13 (or under 16 in regions where that’s the local threshold). If you believe a child has given us data, contact us and we’ll delete it.`,
  },
  {
    heading: 'Changes to this policy',
    body: 'We may update this policy as our services evolve or the law changes. Material changes will be announced on this page with a new effective date. Continued use of the site after changes take effect means you accept the updated policy.',
  },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      icon={Lock}
      title="Privacy Policy"
      lead={`How ${SITE_NAME} collects, uses, and protects your personal information.`}
      effectiveDate="May 5, 2026"
      sections={sections}
    />
  );
}
