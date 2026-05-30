import { BadgeCheck } from 'lucide-react';
import { LegalPage } from '@/components/legal/LegalPage';
import { buildStaticMetadata, SITE_NAME } from '@/lib/seo';

export const metadata = buildStaticMetadata({
  title: 'Editorial Policy',
  description: `The editorial principles, sourcing standards, and review procedures that govern ${SITE_NAME}.`,
  path: '/legal/eeat',
});

const sections = [
  {
    heading: 'Editorial Mission',
    body: [
      'Wildlife Universe exists to inform and inspire a global audience about the natural world. Our work focuses on species and ecosystems, biodiversity science, conservation policy, the human relationship with wildlife, and the people and organisations that are working to protect what remains of the wild. We aim to take readers beyond surface-level facts toward the kind of contextual understanding that supports informed citizenship and personal conservation commitment.',
      'This Editorial Policy describes the principles by which we choose what to publish, the sourcing standards we apply, the review procedures every article goes through before it reaches a reader, and the commitments we make to accuracy, independence, and reader trust.',
    ],
  },
  {
    heading: 'Editorial Independence',
    body: [
      'Wildlife Universe is editorially independent. No advertiser, no sponsor, no commercial partner, no tourism operator, no conservation organisation, and no government agency has any influence over which articles we publish, how we frame them, or which conclusions we report. Advertising sales, where present, are firewalled from editorial decisions, and the editorial team does not receive briefings on which articles will be commercially useful to display ads against.',
      'Where an article is sponsored or where a relationship exists that a reader might consider relevant — for instance, a tourism operator providing field access for a story, or an organisation supplying a researcher for an interview — that relationship is disclosed in the article itself, in plain language and in a place the reader cannot miss.',
    ],
  },
  {
    heading: 'Editorial Principles',
    body: [
      'Our editorial work is governed by six interlocking principles: accuracy, independence, transparency, conservation ethics, respect for subjects, and reader service. Accuracy means we publish information we can demonstrate to be true; independence means we report what we find regardless of who benefits; transparency means we explain our process and our sourcing; conservation ethics means we never publish information whose practical effect would be to harm wildlife (such as exact poaching-risk coordinates for endangered species); respect for subjects means we treat the human beings in our stories — researchers, rangers, indigenous custodians, local communities — with the same dignity we treat any reader; and reader service means our articles are written for the reader\'s understanding, not for the writer\'s convenience.',
    ],
  },
  {
    heading: 'Commitment to Accuracy',
    body: [
      'Wildlife Universe is committed to factual accuracy in every article we publish. Every claim of fact in our reporting is intended to be supportable by a verifiable source — a peer-reviewed paper, an IUCN Red List entry, a government wildlife agency report, a major conservation NGO publication, a natural-history museum dataset, or an on-record statement from an identifiable researcher. Where a claim is contested in the scientific literature, we describe the contest rather than picking one side and presenting it as settled.',
      'When we discover an error in a published article — whether through internal review or reader feedback — we correct it promptly, mark the correction clearly, and explain what was wrong and what the correct information is. Our Fact-Checking Policy describes the verification process in detail.',
    ],
  },
  {
    heading: 'Research Standards',
    body: [
      'Our research process begins with primary sources. For a species profile, that means the most recent IUCN Red List assessment, the relevant taxonomic registers (ITIS, WoRMS, Catalogue of Life, GBIF), and peer-reviewed papers from journals indexed in Scopus or PubMed. For a conservation report, it means the most recent annual reports of the conservation organisations involved, official protected-area management plans, and government wildlife agency publications. For a tourism guide, it means official park-authority guidance, reputable certification bodies, and the practical experience of ground operators with verifiable conservation credentials.',
      'We do not rely on Wikipedia as a primary source. We do cite Wikipedia in the source list of articles when it provides a useful overview with onward citations to primary literature, but the underlying facts are always checked against the primary source.',
    ],
  },
  {
    heading: 'Source Selection Process',
    body: [
      'Every Wildlife Universe article cites the sources that support its claims. We select sources by the following hierarchy, in descending order of weight: peer-reviewed scientific journals; the IUCN Red List and its specialist-group reports; international convention bodies (CITES, the Convention on Biological Diversity, the Convention on Migratory Species); government wildlife agencies and national park authorities; large international conservation NGOs (WWF, Wildlife Conservation Society, Fauna & Flora International, BirdLife International, Plantlife International); natural-history museums and university research centres; reputable encyclopaedic references (Encyclopedia of Life, Catalogue of Life); and finally, well-regarded specialist journalism and books.',
      'Sources lower in the hierarchy are used only to add context, never to establish a contested fact. If a claim appears only in a less-authoritative source, we either find a stronger source or we present the claim with the appropriate qualifier ("according to a 2021 report by...").',
    ],
  },
  {
    heading: 'Conservation Reporting Standards',
    body: [
      'Conservation reporting carries a special responsibility: an article that misrepresents threat status, conservation progress, or the role of indigenous custodians can affect funding, policy, and on-the-ground decisions about species and ecosystems. We take this responsibility seriously.',
      'We do not publish exact location coordinates of poaching-vulnerable species. We do not romanticise wildlife trade. We do not present recovery as inevitable where the underlying threats remain. We attribute conservation work to the people doing it — not only to international NGOs, but to the local rangers, community organisations, indigenous knowledge holders, and government agencies whose day-to-day decisions actually keep wildlife alive.',
    ],
  },
  {
    heading: 'Wildlife Reporting Standards',
    body: [
      'Our species profiles are written to reflect the current scientific understanding of the species, not anthropomorphic projection or sensational framing. We use scientific names alongside common names; we present behaviour in its ecological context; we describe relationships with other species accurately rather than reducing them to predator-versus-prey clichés; and we are explicit about what we do not yet know.',
      'Where a species is the subject of cultural beliefs, traditional knowledge, or historical persecution, we report that context with care. We do not deride the beliefs of communities that have lived alongside a species for generations, and we do not present any single human relationship with a species as the only valid one.',
    ],
  },
  {
    heading: 'Environmental Responsibility',
    body: [
      'Wildlife Universe is a publication about the natural world, and we behave as an organisation that lives in that world. The site is delivered through cloud infrastructure that operates on renewable energy where available; the editorial team avoids unnecessary travel for stories that can be covered remotely; and our tourism guidance prioritises operators with verifiable low-impact and community-benefit credentials over operators whose advertising is louder than their practice.',
      'We acknowledge that running a global wildlife publication has a non-zero environmental cost. We aim to keep that cost as low as practical and to make our editorial work meaningful enough to justify it.',
    ],
  },
  {
    heading: 'Content Development Process',
    body: [
      'Every article passes through a defined development process: topic selection, research, drafting, image / media sourcing, editorial review, fact-checking, copy-editing, SEO review, and publication. Each step is the responsibility of a specific team member or contributor, and each step leaves a trace in our editorial system so that we can trace any factual claim back to the source it was drawn from.',
      'Articles are not published on a calendar; they are published when they are ready. An article that does not pass fact-checking is sent back for revision, not pushed live to meet a deadline.',
    ],
  },
  {
    heading: 'Expert Consultation',
    body: [
      'Where an article addresses a subject that requires specialist knowledge — taxonomic revision, a new conservation status, the interpretation of a peer-reviewed finding, the ethics of a particular tourism practice — we consult subject-matter experts. Experts we consult are credited in the article, either inline ("According to Dr. X, a primatologist at...") or in an acknowledgements footer.',
      'We do not pay experts for quotes, and we do not edit quotes to mean something the speaker did not say. Where an expert reviews a draft, that review is for accuracy only; editorial decisions remain with Wildlife Universe.',
    ],
  },
  {
    heading: 'Editorial Review Procedures',
    body: [
      'Every article is reviewed by an editor before publication. The reviewing editor is different from the writer and is responsible for verifying that the article meets our editorial standards: that every factual claim is supported by an appropriate source, that the framing is accurate, that the sources cited are the ones actually used, that quotations are faithful, that the article passes fact-checking, that the headline does not over-promise, and that the article reads as a piece of serious wildlife journalism rather than as filler.',
      'Where a reviewing editor disagrees with a writer, the disagreement is resolved by discussion and additional research. If the disagreement cannot be resolved, the article is held until further review by the founder.',
    ],
  },
  {
    heading: 'Content Updates and Reviews',
    body: [
      'Wildlife science moves. A population estimate published in 2020 may have been revised by 2026; a species may have been split, merged, or relocated in the taxonomic tree; a Red List status may have shifted; a conservation project may have succeeded or collapsed. We update published articles when significant new information becomes available, and we mark substantial updates with an "Updated:" date and a brief note explaining what changed.',
      'Minor copy-edits and typo corrections are not separately disclosed, but factual corrections are always disclosed.',
    ],
  },
  {
    heading: 'Transparency Standards',
    body: [
      'We disclose what readers need to know in order to evaluate our work. That includes sources (in every article), expert reviewers (when consulted), funding relationships (where relevant), corrections (when issued), and the identity and credentials of contributing writers (on author profile pages). Where a piece is opinion or commentary, it is labelled as such; where it is reporting, it is held to the reporting standards described in this policy.',
    ],
  },
  {
    heading: 'Sponsored Content Standards',
    body: [
      'Wildlife Universe accepts a limited amount of sponsorship from organisations whose work is consistent with our editorial mission — conservation NGOs, certified wildlife-tourism operators, research institutions, and environmental funders. Sponsorship may take the form of advertising, sponsored sections of the site, or paid placements of organisational announcements.',
      'Sponsored content is always clearly labelled "Sponsored" or "Advertisement" in a prominent position, and is never integrated with editorial articles in a way that could mislead readers. Sponsors do not have editorial input over the rest of the site. We will not accept sponsorship from organisations whose practices contradict our editorial values — for example, operators implicated in wildlife trafficking, in unsustainable habitat conversion, or in greenwashing.',
    ],
  },
  {
    heading: 'Reader Trust Commitment',
    body: [
      'Reader trust is the foundation of everything we do. We will tell you what we know and what we do not. We will tell you where our information comes from. We will tell you when we are wrong. We will not pretend to certainty we have not earned, and we will not allow commercial considerations to dictate what we report. If we ever betray that commitment, we will explain what went wrong and how we plan to do better.',
    ],
  },
  {
    heading: 'Corrections Process',
    body: [
      'When we identify an error — whether internally, through expert review, or through reader feedback — we correct it. Minor copy errors (typos, broken links, formatting) are fixed silently. Factual errors are corrected with a visible correction note at the top or bottom of the article, indicating what was wrong, what is now correct, and the date of the correction. Substantial corrections may also be acknowledged in our newsletter so that readers who read the original have the chance to see the update.',
      'To submit a correction, write to mclean@wildlifeuniverse.org with the article URL, the specific claim you believe is incorrect, and (ideally) a primary source for the correct information. We acknowledge correction requests within five business days and aim to resolve them — either by correcting the article or by explaining why the original is supported — within fourteen days.',
    ],
  },
  {
    heading: 'Contact Information',
    body:
      'For editorial questions, correction requests, story tips, expert outreach, or partnership enquiries, write to Mclean Mbaga at mclean@wildlifeuniverse.org. Editorial enquiries are read and assessed by the editorial team within five business days.',
  },
];

export default function EditorialPolicyPage() {
  return (
    <LegalPage
      title="Editorial Policy"
      icon={BadgeCheck}
      lead="The editorial principles, sourcing standards, and review procedures that govern every Wildlife Universe article."
      effectiveDate="2026-05-31"
      sections={sections}
    />
  );
}
