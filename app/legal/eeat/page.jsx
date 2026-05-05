import { BadgeCheck } from 'lucide-react';
import { LegalPage } from '@/components/legal/LegalPage';
import { buildStaticMetadata, SITE_NAME } from '@/lib/seo';

export const metadata = buildStaticMetadata({
  title: 'Editorial Policy',
  description: `Standards, sourcing, and the editorial process behind every story on ${SITE_NAME}.`,
  path: '/legal/eeat',
});

const sections = [
  {
    heading: 'Mission',
    body: `${SITE_NAME} publishes accurate, accountable, and engaging stories about the living world — animals, plants, birds, insects, and the ecosystems that hold them together. Our editorial standards exist so readers can trust what we publish.`,
  },
  {
    heading: 'Expertise',
    body: 'Articles are written by people who know the subject — field biologists, conservation reporters, photographers, and trained science communicators. Bylines link to author profiles describing background and beat. Posts that draw heavily from a contributor outside our staff are flagged as guest contributions.',
  },
  {
    heading: 'Sourcing',
    list: [
      'Primary sources first: peer-reviewed papers, IUCN Red List entries, government and NGO field reports, and direct interviews.',
      'When we cite a study we link to it. When we paraphrase, we name the source in-text.',
      'Anonymous sources are used only when identifying them would put them at risk, and only with editor approval.',
    ],
  },
  {
    heading: 'Fact-checking',
    body: 'Every article passes a fact-check before publication — see our Fact Checking Policy for the full procedure. Time-sensitive species data (population, IUCN status) is rechecked at least quarterly and timestamped.',
  },
  {
    heading: 'Independence',
    body: `${SITE_NAME} is editorially independent. Sponsored content, when present, is clearly labelled “Sponsored” at the top of the article, and the sponsor never reviews or signs off on editorial copy.`,
  },
  {
    heading: 'Conflicts of interest',
    body: 'Writers disclose any commercial, organisational, or personal ties that could shape their reporting. Where a conflict exists, we either reassign the story or publish the disclosure prominently.',
  },
  {
    heading: 'Corrections',
    body: 'When we get something wrong we fix it transparently — see our Cache Policy for how corrections propagate. Significant corrections are noted at the top of the article with the date of the change.',
  },
  {
    heading: 'AI and automation',
    body: 'AI tools may assist with translation, transcription, image generation, and editorial review, but every published claim is verified by a human editor. AI-generated illustrations are labelled. We never publish content generated end-to-end by an LLM without editorial sign-off.',
  },
];

export default function EditorialPolicyPage() {
  return (
    <LegalPage
      icon={BadgeCheck}
      title="Editorial Policy"
      lead="Our editorial standards — expertise, sourcing, independence, and corrections."
      effectiveDate="May 5, 2026"
      sections={sections}
    />
  );
}
