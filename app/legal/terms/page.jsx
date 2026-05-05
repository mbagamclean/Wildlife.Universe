import { ScrollText } from 'lucide-react';
import { LegalPage } from '@/components/legal/LegalPage';
import { buildStaticMetadata, SITE_NAME } from '@/lib/seo';

export const metadata = buildStaticMetadata({
  title: 'Terms of Service',
  description: `The conditions under which you can use ${SITE_NAME}.`,
  path: '/legal/terms',
});

const sections = [
  {
    heading: 'Acceptance',
    body: `By accessing wildlifeuniverse.org or any related service you agree to these Terms. If you don’t agree, please don’t use the service.`,
  },
  {
    heading: 'Editorial content',
    body: `Articles, photographs, illustrations, and audio on ${SITE_NAME} are produced by our editorial team and contributors. They’re for informational and educational purposes — not professional, veterinary, or wildlife management advice. Always consult qualified specialists for decisions involving wild animals or protected species.`,
  },
  {
    heading: 'Intellectual property',
    body: `All editorial content is owned by ${SITE_NAME} or its contributors and is protected by copyright. You may share article URLs and quote short excerpts with attribution. Wholesale republishing, scraping, or redistribution requires written permission.`,
  },
  {
    heading: 'User accounts',
    list: [
      'You’re responsible for the security of your account credentials.',
      'You must be at least 13 (or the local minimum) to create an account.',
      'You agree not to impersonate others, distribute spam, or attempt to access parts of the platform you’re not authorized to use.',
      'We may suspend or terminate accounts that violate these Terms or harm other users.',
    ],
  },
  {
    heading: 'User-submitted content',
    body: `If you post comments or submit content (tips, photos, corrections), you keep ownership but grant ${SITE_NAME} a non-exclusive, worldwide license to display and distribute that content as part of the service. You confirm you have the right to share whatever you submit.`,
  },
  {
    heading: 'Acceptable use',
    list: [
      'Don’t harass, threaten, or post hateful content.',
      'Don’t share copyrighted material you don’t have rights to.',
      'Don’t attempt to disrupt the service or probe for vulnerabilities outside a coordinated disclosure.',
      'Don’t scrape the site at scale — see our terms below on automated access.',
    ],
  },
  {
    heading: 'Automated access',
    body: 'You may not crawl, scrape, or harvest content beyond what our public RSS, sitemap, and APIs provide, or use the site to train machine-learning models without prior written permission.',
  },
  {
    heading: 'Disclaimers',
    body: `${SITE_NAME} is provided “as is.” We do our best to keep content accurate, but we don’t warrant that everything is error-free or current. We won’t be liable for indirect, incidental, or consequential damages arising from use of the service to the maximum extent permitted by law.`,
  },
  {
    heading: 'Termination',
    body: 'We may suspend or terminate access for violations of these Terms. You can stop using the service at any time and request deletion of your account.',
  },
  {
    heading: 'Changes',
    body: 'We may amend these Terms when our service or the law changes. Material changes will be highlighted on this page. Continued use after the effective date means you accept the new Terms.',
  },
  {
    heading: 'Governing law',
    body: 'These Terms are governed by the laws of the United Republic of Tanzania. Disputes will be resolved in the courts of Dar es Salaam unless a mandatory consumer law in your country requires otherwise.',
  },
];

export default function TermsOfServicePage() {
  return (
    <LegalPage
      icon={ScrollText}
      title="Terms of Service"
      lead={`The agreement between you and ${SITE_NAME} for using this site.`}
      effectiveDate="May 5, 2026"
      sections={sections}
    />
  );
}
