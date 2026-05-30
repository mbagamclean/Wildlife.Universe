import { Users } from 'lucide-react';
import { LegalPage } from '@/components/legal/LegalPage';
import { buildStaticMetadata, SITE_NAME } from '@/lib/seo';

export const metadata = buildStaticMetadata({
  title: 'Wildlife Universe Team',
  description: `The editors, writers, researchers, and fact-checkers behind ${SITE_NAME}.`,
  path: '/legal/team',
});

const sections = [
  {
    heading: 'Introduction to Wildlife Universe',
    body: [
      'Wildlife Universe is an independent editorial publication dedicated to wildlife, biodiversity, conservation, ecosystems, nature tourism, environmental awareness, animal behaviour, endangered species, wildlife research, and natural habitats. We publish for a global audience: students discovering the natural world for the first time, educators looking for reliable classroom resources, conservation professionals tracking what is happening in the field, naturalists deepening their knowledge, and travellers planning their next encounter with the wild.',
      'The team behind Wildlife Universe is a small group of editors, writers, researchers, and fact-checkers who treat wildlife journalism as serious work. We are not a content farm; we are a publication. Every article we publish carries a named author, passes through editorial review, and is verified by a fact-checker before it reaches a reader.',
    ],
  },
  {
    heading: 'Our Mission',
    body: [
      'Our mission is to educate, inspire, and connect people with nature through trustworthy, accurate, and engaging content. We believe that informed citizens are better citizens of the planet — that someone who understands why a wetland matters is more likely to defend it, that someone who recognises a species in their own region is more likely to value it, and that someone who reads honest reporting about conservation challenges is more likely to support the people doing the work.',
      'We pursue that mission through long-form articles, species profiles, conservation reporting, and tourism guidance. Everything we publish is meant to outlast the news cycle.',
    ],
  },
  {
    heading: 'Our Vision',
    body: [
      'Our vision is for Wildlife Universe to become a publication that conservation professionals trust, that educators recommend, that travellers consult before they pack, and that general readers return to when they want to understand the natural world. We want our reporting to be cited by other journalists, used in classrooms, referenced by tour operators, and read by the rangers, biologists, and community custodians whose work we cover.',
      'Building that kind of publication takes years and consistency. We measure our progress in articles published with care, in corrections issued openly, in expert relationships maintained over time, and in the slow accumulation of a reputation that is earned rather than claimed.',
    ],
  },
  {
    heading: 'Founder Profile — Mclean Mbaga',
    body: [
      'Mclean Mbaga is the founder of Wildlife Universe. Born and raised within reach of some of the world\'s most extraordinary wildlife landscapes in Tanzania, Mclean has spent his working life at the intersection of wildlife education, technology, and conservation communication. He founded Wildlife Universe to build the kind of publication he wished had existed when he was first learning about the natural world: rigorous, accessible, written for the curious general reader, and unafraid to discuss the difficult realities of modern conservation alongside its triumphs.',
      'Mclean directs the editorial vision of Wildlife Universe, oversees the team of writers and contributors, and personally reviews coverage of his region of expertise — the wildlife and conservation work of East Africa. He believes that storytelling, when done with discipline, is one of the most powerful tools available to conservation: a single well-told article can do more to shift attitudes than a great deal of statistical reporting.',
      'Beyond his editorial work, Mclean is committed to building Wildlife Universe as a publication that gives space to African voices in conservation — to the rangers, community organisations, indigenous knowledge holders, and African scientists whose work is too often overshadowed in international wildlife coverage.',
    ],
  },
  {
    heading: 'Editorial Team',
    body: [
      'The editorial team is responsible for the day-to-day publication of Wildlife Universe. Editors assign and commission articles, work with writers through draft and revision, ensure that every piece meets our editorial standards before publication, and maintain the long-term quality of the catalogue.',
      'Each editor brings specialised knowledge to their work. The team includes editors with backgrounds in conservation biology, wildlife science writing, ecological journalism, and natural-history publishing. Editors operate independently of the commercial side of the publication; advertising and partnerships have no influence on which articles are commissioned or how they are framed.',
    ],
  },
  {
    heading: 'Research Team',
    body: [
      'Behind every Wildlife Universe article is research — sometimes weeks of it. The research team identifies the most authoritative sources for each topic, retrieves primary literature from scientific journals, consults specialised taxonomic and conservation databases, and prepares the source dossier that the writer works from.',
      'For species profiles, the research team builds a structured profile of taxonomy, distribution, habitat, behaviour, conservation status, and threat assessment, anchored in the most recent IUCN Red List assessment and the relevant Specialist Group reporting. For conservation features, the team identifies the relevant organisational reports, government publications, and on-record experts. For tourism guidance, the team verifies park-authority guidance, certification claims, and operator credentials.',
    ],
  },
  {
    heading: 'Writers and Contributors',
    body: [
      'Wildlife Universe articles are written by a team of named contributors with backgrounds in wildlife biology, ornithology, herpetology, botany, marine science, conservation, and nature writing. Each contributor brings field experience or academic training relevant to the subjects they cover, and each is publicly attributed on the articles they write. You can read more about our contributors on the /author index page.',
      'We commission writers because we want articles to carry a real human perspective — the kind of perspective that comes from time spent with the subject, whether that time is in the field, in the literature, or both. Anonymous filler articles are not part of our model.',
    ],
  },
  {
    heading: 'Fact-Checking Team',
    body: [
      'The fact-checking team is the last line of defence before publication. A fact-checker — always a different person from the writer — works through every claim in a draft, locates the source that supports it, and verifies that the source actually says what the article says it says.',
      'Our fact-checking standards are described in detail at /legal/fact-checking. In short: every numerical claim is cross-referenced against at least two independent sources; every species-level claim is checked against authoritative taxonomic and conservation databases; every quotation is verified with the speaker where possible; and every contested scientific question is reported as a contest, not as a settled answer.',
    ],
  },
  {
    heading: 'Content Review Process',
    body: [
      'Every Wildlife Universe article goes through a defined review process before it is published. The process begins with a topic brief, in which the assigning editor and the writer agree on the angle, the sources to consult, and the scope of the piece. Research then produces a source dossier, the writer drafts the article from that dossier, the assigning editor reviews the draft for editorial standards, the fact-checker verifies every factual claim, a copy-editor reviews for clarity and style, and finally the article passes a publication-readiness check (cover image, SEO metadata, internal links, sources list) before it goes live.',
      'No article skips a step. An article that cannot pass fact-checking is sent back for revision; an article that has been rushed for time is held until it is ready.',
    ],
  },
  {
    heading: 'Editorial Workflow',
    list: [
      'Topic Brief — editor and writer agree on scope, angle, and primary sources.',
      'Research — primary literature, taxonomic databases, conservation reports, expert outreach.',
      'Draft — writer composes the article from the research dossier.',
      'Editorial Review — assigning editor checks framing, balance, completeness, and tone.',
      'Fact-Check — independent fact-checker verifies every claim against the cited source.',
      'Copy-Edit — review for clarity, style, and consistency with our editorial voice.',
      'Publication-Readiness — cover image, SEO metadata, internal links, sources list, schema.',
      'Publication — article goes live, listed in the appropriate category and sitemap.',
      'Post-Publication — reader corrections accepted, significant updates dated, ongoing maintenance.',
    ],
  },
  {
    heading: 'Core Values',
    body: [
      'Six values guide everything Wildlife Universe does. Together they form the standard against which we measure every editorial decision.',
    ],
  },
  {
    heading: 'Conservation',
    body: 'Wildlife Universe exists to support the conservation of the natural world. We commission articles, frame stories, and select coverage that contribute to public understanding of conservation issues — never coverage that would knowingly harm wildlife (for example, the publication of poaching-vulnerable location coordinates) or that would launder the reputation of organisations whose practices contradict conservation values.',
  },
  {
    heading: 'Education',
    body: 'Every Wildlife Universe article aims to leave the reader better-informed than when they began reading. We do not write down to readers, we do not pad articles with filler, and we do not hide the complexity of a subject behind reassuring simplifications. Education is the goal, and respect for the reader\'s intelligence is the path.',
  },
  {
    heading: 'Accuracy',
    body: 'A wildlife publication that gets the facts wrong undermines the conservation case it claims to make. We treat factual accuracy as a non-negotiable foundation: every claim is sourced, every source is verified, every error is corrected. Our Fact-Checking Policy describes the discipline in detail.',
  },
  {
    heading: 'Integrity',
    body: 'Editorial integrity means we report what we find regardless of who benefits and who is inconvenienced. Sponsors, advertisers, conservation organisations, tour operators, and government agencies have no influence over which articles we publish or how we frame them. Sponsored content is always labelled, and editorial relationships are always disclosed.',
  },
  {
    heading: 'Transparency',
    body: 'Readers can see how we work: our sources are listed in every article, our authors are named on every byline, our editorial principles are published on this site, our corrections are visible, and our funding relationships (where they exist) are disclosed. Transparency is not a marketing claim for us; it is built into the publication.',
  },
  {
    heading: 'Responsibility',
    body: 'We accept responsibility for what we publish. When we are right, we stand behind our reporting. When we are wrong, we correct it openly and explain what went wrong. We take seriously the trust readers place in us and the influence — small but real — that a wildlife publication has on conservation outcomes.',
  },
  {
    heading: 'Why Readers Trust Wildlife Universe',
    body: [
      'Readers trust Wildlife Universe for three reasons. First, our work is rigorous: every article is researched against primary sources, reviewed by an editor, and fact-checked before publication. Second, our process is transparent: every article is signed by a named author, every claim is sourced, and every correction is disclosed. Third, our independence is real: no advertiser, sponsor, or commercial partner shapes our editorial choices.',
      'Trust is built slowly. We have been building it one article at a time, and we plan to keep building it the same way.',
    ],
  },
  {
    heading: 'Commitment to Conservation Awareness',
    body: [
      'Wildlife Universe is committed to building conservation awareness in the readers it reaches. That commitment shows up in everything we publish: in the depth of our species coverage; in our reporting on the people doing the work, not only on the species; in our coverage of conservation triumphs and conservation failures alike; in our willingness to publish difficult stories about wildlife trade, habitat loss, and community-level conflict; and in our refusal to romanticise either nature or the people who protect it.',
      'We also commit to using Wildlife Universe as a platform for under-covered voices in conservation — particularly the African scientists, rangers, and community organisations whose work is essential to the conservation of the continent\'s wildlife but is often eclipsed by international coverage.',
    ],
  },
  {
    heading: 'Future Goals',
    body: [
      'Wildlife Universe is a long-term project. Over the coming years we plan to deepen our coverage of under-reported species and ecosystems, expand our newsletter into a more substantial format, build relationships with conservation organisations and educational institutions for partnership and content-sharing, develop a small set of free educational resources for schools, and explore translation of selected articles into additional languages to reach readers who are currently underserved by English-language wildlife journalism.',
      'These goals are ambitions, not commitments. We will pursue them as resources and the editorial calendar allow, and we will not rush them at the expense of the day-to-day quality of the publication.',
    ],
  },
  {
    heading: 'Contact the Team',
    body:
      'You can reach the Wildlife Universe team via mclean@wildlifeuniverse.org for editorial enquiries, story tips, expert outreach, corrections, partnership proposals, and any general question about the publication. Substantive enquiries receive a substantive response within fourteen days.',
  },
];

export default function TeamPage() {
  return (
    <LegalPage
      title="Wildlife Universe Team"
      icon={Users}
      lead="The editors, writers, researchers, and fact-checkers behind Wildlife Universe."
      effectiveDate="2026-05-31"
      sections={sections}
    />
  );
}
