import { ShieldCheck } from 'lucide-react';
import { LegalPage } from '@/components/legal/LegalPage';
import { buildStaticMetadata, SITE_NAME } from '@/lib/seo';

export const metadata = buildStaticMetadata({
  title: 'Fact-Checking Policy',
  description: `How ${SITE_NAME} verifies the claims it publishes, the source hierarchy we follow, and how readers can challenge or correct the record.`,
  path: '/legal/fact-checking',
});

const sections = [
  {
    heading: 'Commitment to Accuracy',
    body: [
      'Wildlife Universe is committed to factual accuracy in every article we publish. Wildlife journalism intersects with science, policy, history, geography, and lived human experience, and a publication that gets the facts wrong risks misleading readers, misrepresenting the work of scientists and rangers, and undermining the conservation case it claims to make. Fact-checking is therefore not an optional extra on our editorial workflow; it is the workflow.',
      'This Fact-Checking Policy describes the discipline we apply to the claims that appear in our articles: where we get our information, how we verify it, how we handle scientific uncertainty, and how we correct ourselves when we discover that we have got something wrong.',
    ],
  },
  {
    heading: 'Fact-Checking Principles',
    body: [
      'Our fact-checking work is governed by four principles. First, every factual claim should be supported by a primary or near-primary source — a peer-reviewed paper, an IUCN assessment, a government wildlife agency publication, a museum dataset, or an on-record statement from an identifiable expert. Second, where a claim is contested in the scientific literature, the contest itself is reported rather than concealed by picking a side. Third, where we are uncertain, we say so; we never paper over a gap in knowledge with confident prose. Fourth, when we discover an error, we correct it openly and explain what was wrong.',
    ],
  },
  {
    heading: 'Verification Procedures',
    body: [
      'Verification begins when a draft enters editorial review and continues until the article is published. The fact-checker — who is a different person from the writer — works through the article claim by claim, identifying each statement of fact, locating the source that supports it, and confirming that the source actually says what the article says it says.',
      'For statements about taxonomy, distribution, behaviour, diet, reproduction, conservation status, and population trend, the fact-checker consults primary scientific sources. For statements about policy, history, geography, and human-society dimensions, the fact-checker consults the appropriate primary documents (government publications, treaty texts, organisational reports, peer-reviewed work in the relevant social-science discipline).',
    ],
  },
  {
    heading: 'Scientific Research Verification',
    body: [
      'When an article relies on a published study, the fact-checker reads the study — not the press release, not the summary, not the abstract alone, but the methodology and results sections. We check that the article\'s description of the study\'s findings matches what the study actually concluded, including any caveats the authors flagged. We check that sample sizes, geographic scope, and time windows are accurately represented. Where a study\'s findings have been challenged in later literature, we report the challenge.',
      'We are particularly careful with preprints and other not-yet-peer-reviewed work. We may report on a preprint when its findings are newsworthy, but we label it as a preprint and we make clear that the conclusions have not yet been peer-reviewed.',
    ],
  },
  {
    heading: 'Wildlife Species Verification',
    body: [
      'Species-level information is checked against authoritative taxonomic databases: the IUCN Red List for conservation status and population trend, the Integrated Taxonomic Information System (ITIS) for North American taxonomy, the World Register of Marine Species (WoRMS) for marine taxa, the Catalogue of Life for general taxonomy, the Global Biodiversity Information Facility (GBIF) for distribution records, and the relevant IUCN Specialist Groups for in-depth species accounts.',
      'Common names are notoriously variable across regions; where regional names differ, we lead with the most widely understood name and acknowledge regional variants. Scientific names are checked against the most recent accepted taxonomy and any pending taxonomic revisions noted in the literature.',
    ],
  },
  {
    heading: 'Conservation Data Verification',
    body: [
      'Conservation statistics — population estimates, range losses, threat assessments, project outcomes — are checked against the most recent authoritative source we can find. Population estimates are the most volatile category: a 2018 figure may have been revised in a 2024 update, and using the older figure when a newer one exists is a factual error. We check Red List assessment dates and update the article when a new assessment supersedes the one originally cited.',
      'Conservation project outcomes are checked against the project\'s own reporting and, where possible, against independent evaluations. We are sceptical of claims of recovery that rest only on a project\'s own press materials.',
    ],
  },
  {
    heading: 'Geographic Verification',
    body: [
      'Geographic claims — range maps, protected-area boundaries, the location of fieldwork — are checked against official sources: national park-authority maps, IUCN World Database on Protected Areas, government land-classification publications, and recent satellite imagery where ground-truth is essential. Place names are checked for current usage, including any name changes adopted since the source we are quoting was written.',
      'For tourism articles, we additionally check that the access information we publish is current: park entry requirements change, road conditions change, operator availability changes. We list the dates of the information and recommend that readers verify directly with the park authority before travelling.',
    ],
  },
  {
    heading: 'Source Hierarchy',
    body: [
      'We rank sources by how directly they connect to the underlying observation. The highest-weight sources are peer-reviewed scientific journals; IUCN Red List assessments and Specialist Group publications; international convention texts (CITES, CBD, CMS); government wildlife agency reports; and recognised long-form scientific monographs. Mid-weight sources include large international conservation NGO publications, natural-history museum datasets, and well-known reference works (Encyclopedia of Life, Handbook of the Mammals of the World, Birds of the World). Lower-weight sources — used for context but never for establishing a contested fact — include general encyclopaedias (Wikipedia, Britannica), well-regarded specialist journalism, and books for general audiences.',
      'A claim that appears only in a lower-weight source is either upgraded by finding a higher-weight source, or it is presented in the article with the appropriate qualifier ("a 2021 BBC Earth feature reported that...").',
    ],
  },
  {
    heading: 'Peer-Reviewed Research Standards',
    body: [
      'A peer-reviewed paper is not automatically correct, but it carries the institutional weight of having been read and critiqued by other working scientists before publication. We weight peer-reviewed work above non-peer-reviewed work, and we weight papers in widely-respected journals above papers in less-rigorous outlets.',
      'We are alert to the limitations of peer review. Papers can be retracted; methodologies can be challenged; replication failures can revise earlier findings. Where we know of a relevant retraction, methodological challenge, or replication failure, we report it. Where a paper is the only source for a striking claim, we are explicit that the claim rests on a single study.',
    ],
  },
  {
    heading: 'Expert Consultation Procedures',
    body: [
      'For articles that touch on subjects with active scientific debate, on emerging conservation issues, or on questions where the published literature is sparse, we consult subject-matter experts. Experts are identified by their published record, their institutional affiliation, and their accessibility for fact-checking enquiries. Where an expert agrees to be quoted on the record, the quote is verified with them before publication.',
      'Experts who review a draft do so under a non-restrictive arrangement: they may correct factual errors and flag missing nuance, but they do not have editorial control over the article. Their review is acknowledged in the article where the contribution is substantive.',
    ],
  },
  {
    heading: 'Cross-Referencing Requirements',
    body: [
      'Important factual claims — particularly numerical claims (population figures, range sizes, project budgets, dates) and contested claims (the role of a particular threat in a particular decline) — are cross-referenced against at least two independent sources. Independent here means sources that do not derive from each other: a number that appears in three press releases all citing the same primary report is one source, not three.',
      'Where cross-referencing reveals a discrepancy between sources, we report the discrepancy rather than picking one number and presenting it as definitive.',
    ],
  },
  {
    heading: 'Handling Scientific Uncertainty',
    body: [
      'Scientific uncertainty is the normal state of much wildlife knowledge. Population estimates for cryptic species are often expressed as ranges with wide confidence intervals; behaviour studies are often based on small numbers of individuals or limited geographic samples; emerging threats (climate change, disease, microplastics) are areas of active investigation where consensus has not yet formed.',
      'We do not hide this uncertainty behind confident prose. Where an estimate is a range, we report the range. Where a finding is preliminary, we say so. Where two reputable groups of scientists disagree, we report both positions and explain what would need to be true for each to be correct.',
    ],
  },
  {
    heading: 'Reader Feedback and Corrections',
    body: [
      'Readers play an important role in keeping Wildlife Universe accurate. If you spot an error in any of our articles — a misstated population figure, a mistaken scientific name, a misattributed quote, a mis-described behaviour, a mislocated park — we want to know. Send the article URL, the specific claim you believe is incorrect, and (ideally) a primary source for the correct information to mclean@wildlifeuniverse.org.',
      'We acknowledge correction requests within five business days. We typically resolve them — either by correcting the article or by explaining why the original is supported — within fourteen days. The correction is then issued with a visible note at the top or bottom of the article, the editorial team is informed so the same error is not repeated elsewhere, and substantial corrections are noted in the next newsletter.',
    ],
  },
  {
    heading: 'Updating Published Content',
    body: [
      'Wildlife knowledge changes. A species\' IUCN status can be revised; a population estimate can be updated; a previously-unknown subspecies can be described. When significant new information about a subject we have covered becomes available, we update the relevant article and mark the update with a visible "Updated:" date and a short note describing what changed.',
      'Minor edits — typo fixes, small clarifications, formatting changes — are made silently. Significant factual updates are always disclosed.',
    ],
  },
  {
    heading: 'Transparency and Accountability',
    body: [
      'We make our verification process visible by listing the sources behind each article in a "Sources & Attribution" section at the foot of the piece, and by inline-citing the most important sources within the article body. Where an article relies on an interview, the interviewee is named. Where the writer has a relevant disclosure (such as fieldwork supported by a particular institution), the disclosure is included.',
      'Accountability means readers can hold us to our standards. If you believe we have fallen short — published a claim without adequate verification, failed to correct an error promptly, presented contested science as settled, or failed to disclose a relevant relationship — write to mclean@wildlifeuniverse.org with specifics and we will investigate.',
    ],
  },
  {
    heading: 'Contact Information',
    body:
      'For corrections, fact-checking enquiries, source disputes, or any question about how Wildlife Universe verifies the claims it publishes, write to Mclean Mbaga at mclean@wildlifeuniverse.org. The editorial team reads every correction request and responds within fourteen days.',
  },
];

export default function FactCheckingPolicyPage() {
  return (
    <LegalPage
      title="Fact-Checking Policy"
      icon={ShieldCheck}
      lead="How Wildlife Universe verifies the claims it publishes, the source hierarchy we follow, and how readers can challenge the record."
      effectiveDate="2026-05-31"
      sections={sections}
    />
  );
}
