import { ShieldCheck } from 'lucide-react';
import { LegalPage } from '@/components/legal/LegalPage';
import { buildStaticMetadata, SITE_NAME } from '@/lib/seo';

export const metadata = buildStaticMetadata({
  title: 'Fact Checking Policy',
  description: `How ${SITE_NAME} verifies every claim before publication.`,
  path: '/legal/fact-checking',
});

const sections = [
  {
    heading: 'Why we fact-check',
    body: 'Wildlife reporting carries real consequences for the species it covers — misinformation about a population number or IUCN status can shape funding, policy, and field decisions. Every story we publish goes through a deliberate verification pass before it goes live.',
  },
  {
    heading: 'What we check',
    list: [
      'Numbers — population estimates, range data, dates, distances, percentages.',
      'Quotes and attributions — recordings, transcripts, or written confirmations.',
      'Scientific claims — cross-checked against peer-reviewed literature or authoritative bodies (IUCN, BirdLife, Kew, IUCN/SSC specialist groups).',
      'Place names, taxonomic names, and the spelling of every named person.',
      'Photo and video provenance — we verify the photographer, location, and date for all imagery.',
    ],
  },
  {
    heading: 'How we check',
    list: [
      'Each article has a designated fact-checker who is not the author.',
      'Claims are tracked against a sources sheet — every assertion in the published draft maps to at least one cited source.',
      'For species data we use the most recent IUCN Red List entry as a baseline and cite it with a date.',
      'Time-sensitive figures are stamped with the assessment year so readers know when the data was current.',
    ],
  },
  {
    heading: 'When we get it wrong',
    body: 'Mistakes happen. When we find one — or a reader reports one — we correct it visibly. Significant changes are noted at the top of the article, dated, and the change history is preserved internally. Trivial typo fixes are silent. We never silently rewrite a substantive claim.',
  },
  {
    heading: 'How to flag a correction',
    body: `If you spot something wrong, email us with the URL and the specific claim. We aim to respond within two business days. Direct corrections to mclean@wildlifeuniverse.org.`,
  },
];

export default function FactCheckingPolicyPage() {
  return (
    <LegalPage
      icon={ShieldCheck}
      title="Fact Checking Policy"
      lead={`What ${SITE_NAME} verifies, how, and what happens when we get it wrong.`}
      effectiveDate="May 5, 2026"
      sections={sections}
    />
  );
}
