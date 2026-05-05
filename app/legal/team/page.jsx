import { Users } from 'lucide-react';
import { LegalPage } from '@/components/legal/LegalPage';
import { buildStaticMetadata, SITE_NAME } from '@/lib/seo';

export const metadata = buildStaticMetadata({
  title: 'Wildlife Universe Team',
  description: `Editors, writers, photographers, and contributors who make ${SITE_NAME}.`,
  path: '/legal/team',
});

const sections = [
  {
    heading: 'Editorial leadership',
    body: `${SITE_NAME} was founded by Matt McLean (publisher and editor-in-chief) with a mission to publish journalism that takes the living world as seriously as the human one. Editorial direction, sourcing, and corrections sit with the editor-in-chief and rotate through subject editors for each beat.`,
  },
  {
    heading: 'Beats and section editors',
    list: [
      'Animals — mammals, reptiles, amphibians, fish, IUCN Red List reporting.',
      'Birds — basal lineages, waterfowl, raptors, songbirds, migration.',
      'Plants — trees, shrubs, herbs, vines, conservation in flora.',
      'Insects — Arthropoda, ecosystem services, entomology.',
    ],
  },
  {
    heading: 'Contributors',
    body: 'Bylines link to author profiles describing background and beat. Guest contributions are clearly labelled as such. Our contributor pool includes field biologists, conservation reporters, science journalists, photographers, and translators.',
  },
  {
    heading: 'Standards and oversight',
    body: 'Every article passes a fact-check (see Fact Checking Policy) and is held to the editorial standards described in our Editorial Policy. Significant corrections are listed publicly at the top of the affected article with the date of the change.',
  },
  {
    heading: 'Get in touch',
    body: 'Pitches, tips, and corrections all go to mclean@wildlifeuniverse.org. We respond to legitimate inquiries within two business days.',
  },
];

export default function TeamPage() {
  return (
    <LegalPage
      icon={Users}
      title="Wildlife Universe Team"
      eyebrow="Wildlife Universe · Team"
      lead="The editors, writers, photographers, and contributors behind the journalism."
      sections={sections}
    />
  );
}
