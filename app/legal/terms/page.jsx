import { ScrollText } from 'lucide-react';
import { LegalPage } from '@/components/legal/LegalPage';
import { buildStaticMetadata, SITE_NAME } from '@/lib/seo';

export const metadata = buildStaticMetadata({
  title: 'Terms of Service',
  description: `The terms that govern access to and use of ${SITE_NAME}, an independent wildlife and conservation publication.`,
  path: '/legal/terms',
});

const sections = [
  {
    heading: 'Acceptance of Terms',
    body: [
      'These Terms of Service ("Terms") govern your access to and use of Wildlife Universe at wildlifeuniverse.org and the related services we operate under that domain. By visiting the site, reading our articles, subscribing to the newsletter, leaving a comment, creating an account, or otherwise interacting with our content, you agree to these Terms.',
      'If you do not agree with any part of these Terms, please discontinue use of the site. The Terms are written in plain language and are designed to be read by ordinary readers, not only by lawyers. Where a clause includes legal terminology, we have tried to provide an explanation alongside it.',
    ],
  },
  {
    heading: 'Purpose of the Website',
    body: [
      'Wildlife Universe is an independent editorial publication that produces articles, species profiles, conservation reporting, and nature-tourism guidance covering animals, birds, insects and other invertebrates, plants, ecosystems, biodiversity policy, and the people and organisations working to protect the natural world.',
      'The website exists to inform and inspire a global audience of readers, students, educators, naturalists, and conservation professionals. We are not a research institution, a government wildlife agency, or a primary scientific publisher; we are a publication that synthesises and reports on the work of those bodies in a form accessible to general readers.',
    ],
  },
  {
    heading: 'User Responsibilities',
    body: [
      'By using Wildlife Universe you agree to behave in a manner consistent with a serious educational publication. You will not attempt to disrupt the site, scrape it at industrial scale, evade our security measures, harass other readers, post unlawful or harmful material in comments or submitted content, or use the site to spread misinformation.',
      'You are responsible for the accuracy of any information you provide to us, including your email address when you subscribe to the newsletter and your contact details when you write to the editorial team. You are also responsible for keeping the credentials of any account you create reasonably secure and for notifying us promptly if you believe your account has been compromised.',
    ],
  },
  {
    heading: 'Intellectual Property Rights',
    body: [
      'All content published on Wildlife Universe — articles, photographs, illustrations, audio narrations, video, code, graphics, design elements, and the overall look and feel of the site — is the property of Wildlife Universe or of the contributors who have granted us a licence to publish it. The collective work is protected by copyright, trademark, and other intellectual-property laws in Tanzania, the United States, the United Kingdom, the European Union, and the other jurisdictions where it is read.',
      'Wildlife Universe respects the intellectual property of others. Where our articles include third-party images, quotations, or excerpts, they are used either with permission, under a clearly indicated licence (such as Creative Commons), or under principles of fair use / fair dealing for the purpose of journalism, criticism, education, or comment. If you believe that material on this site infringes a copyright you own, please write to the contact address at the end of this page with sufficient detail to identify the work in question.',
    ],
  },
  {
    heading: 'Copyright and Content Ownership',
    body: [
      'You may not copy, redistribute, modify, sell, or commercially exploit Wildlife Universe content without our prior written permission. You may, of course, link to our articles freely; you may share short excerpts on social media with proper attribution; and educators and researchers may quote brief passages in classroom and academic contexts under standard fair-use / fair-dealing principles.',
      'If you would like to license a Wildlife Universe article — for example, for inclusion in a textbook, a documentary, a museum exhibit, a corporate sustainability report, or an organisational newsletter — please contact us. We respond to licensing enquiries and are usually able to grant reasonable requests on reasonable terms.',
    ],
  },
  {
    heading: 'Educational Nature of Content',
    body: [
      'Wildlife Universe is an educational publication, not a substitute for professional advice. Our species profiles, conservation reports, and tourism guides are written carefully and reviewed before publication, but they are general educational resources. They are not field-guide identifications, veterinary advice, regulatory guidance, or legal guidance.',
      'If you are planning a wildlife encounter, a safari, a wilderness expedition, a research project, or any other activity that involves a real-world decision with safety, ecological, or legal consequences, please consult qualified professionals and the relevant authorities in your jurisdiction. Wildlife Universe articles can give you context and starting points but cannot replace expert judgement on the ground.',
    ],
  },
  {
    heading: 'User Conduct and Acceptable Use',
    list: [
      'You will not attempt to gain unauthorised access to any part of the site, its servers, or any related infrastructure.',
      'You will not deploy automated scraping tools that interfere with normal operation of the site, that ignore standard robots.txt directives, or that consume server resources beyond the level needed for ordinary reading.',
      'You will not upload, submit, or post unlawful content, hate speech, harassment, sexually explicit material, threats of violence, spam, malware, or content that infringes the rights of others.',
      'You will not impersonate Wildlife Universe staff, contributors, or any other person.',
      'You will not use Wildlife Universe in any manner that would expose Wildlife Universe, its readers, or its contributors to legal liability.',
    ],
  },
  {
    heading: 'Third-Party Links',
    body: [
      'Wildlife Universe links to many external resources: the IUCN Red List, peer-reviewed journal articles, government wildlife agencies, conservation NGOs, natural-history museums, and reference encyclopaedias. These links exist so that our readers can verify our reporting and continue their research with primary sources.',
      'We do not control these third-party sites and we are not responsible for their content, their policies, or their availability. Following a link out of Wildlife Universe means you are leaving our site and entering one operated by a separate organisation under separate terms.',
    ],
  },
  {
    heading: 'Disclaimer of Warranties',
    body: [
      'Wildlife Universe is provided "as is" and "as available". We work hard to publish accurate, well-researched, and up-to-date content, but we do not warrant that the site or any specific article will be free from errors, will be uninterrupted, will meet your particular educational or research needs, or will be available at any specific time.',
      'To the maximum extent permitted by law, we disclaim all warranties of any kind, express or implied, including warranties of merchantability, fitness for a particular purpose, accuracy, and non-infringement. The disclaimer does not deprive you of any consumer-protection right that cannot be waived by contract in your jurisdiction.',
    ],
  },
  {
    heading: 'Limitation of Liability',
    body: [
      'To the maximum extent permitted by law, Wildlife Universe, its founder, its editorial team, its contributors, and its infrastructure providers shall not be liable for any indirect, incidental, consequential, special, exemplary, or punitive damages arising out of or in connection with your use of the site, even if we have been advised of the possibility of such damages.',
      'Where liability cannot be excluded by law, our aggregate liability to any reader for any cause whatsoever shall not exceed the amount you have paid us in the twelve months preceding the event giving rise to the claim, or one hundred United States dollars, whichever is greater. Most of our readers pay nothing to access the site, in which case the second figure applies.',
    ],
  },
  {
    heading: 'Website Availability',
    body: [
      'We aim to keep Wildlife Universe available twenty-four hours a day, every day of the year, and our infrastructure providers are selected for reliability. However, the site may occasionally be unavailable due to scheduled maintenance, technical incidents on our infrastructure or on the wider internet, or for reasons beyond our reasonable control.',
      'We are not obligated to provide advance notice of downtime, and we will not be liable for losses arising from temporary unavailability of the site.',
    ],
  },
  {
    heading: 'Content Accuracy',
    body: [
      'Wildlife Universe is committed to accuracy. Our editorial workflow includes research, drafting, editorial review, and fact-checking before publication, and we welcome reader corrections after publication. The full process is described in our Editorial Policy and Fact-Checking Policy.',
      'Despite this discipline, no publication is perfect. Wildlife science is also an actively-developing field: a species\' IUCN status can change, a population estimate can be updated, a behaviour previously thought unique to one species can be reported in another. We aim to update articles when significant new information becomes available, but we cannot guarantee that every article reflects the most recent scientific consensus at every moment.',
    ],
  },
  {
    heading: 'Changes to Services',
    body: [
      'Wildlife Universe is an evolving publication. We may add new articles, sections, features, or services; we may modify the layout and design of the site; and we may discontinue particular features that are no longer serving our readers well. We do not need to notify you in advance of these changes, although we will do so when a change is significant.',
      'If a feature you depended on has been removed and you have not been able to find a replacement, please write to us. We try to balance editorial direction with reader needs and we will consider feedback seriously.',
    ],
  },
  {
    heading: 'Termination of Access',
    body: [
      'We reserve the right to suspend or terminate access for any reader who violates these Terms, who behaves in a manner that endangers the security or integrity of the site, or who repeatedly uses the comment system or contact forms in a manner inconsistent with serious editorial dialogue.',
      'Termination is a last resort. In most cases, we will warn before acting, and we will explain what behaviour needs to change. Persistent or egregious behaviour may, however, lead to immediate termination without warning.',
    ],
  },
  {
    heading: 'Governing Law',
    body: [
      'These Terms are governed by the laws of the United Republic of Tanzania, without regard to its conflict-of-laws principles. Any dispute arising out of or in connection with these Terms or your use of Wildlife Universe shall be subject to the exclusive jurisdiction of the competent courts of Tanzania, except where mandatory consumer-protection law in your country of residence provides otherwise.',
      'Where you are a consumer in a jurisdiction that grants you the right to sue or be sued in your local courts and to rely on the consumer-protection law of your country, nothing in these Terms is intended to take those rights away.',
    ],
  },
  {
    heading: 'Updates to Terms',
    body: [
      'We may revise these Terms from time to time. Material changes will be announced at the top of this page with an updated effective date, and for the most significant changes we may also send a notification email to newsletter subscribers or post a notice on the site.',
      'Continuing to use Wildlife Universe after a revision has been published constitutes your acceptance of the revised Terms. If you do not accept a revision, please stop using the site.',
    ],
  },
  {
    heading: 'Contact Information',
    body:
      'For any question about these Terms, including licensing enquiries, copyright concerns, and reports of misuse, please write to Mclean Mbaga at mclean@wildlifeuniverse.org. Acknowledgement is usually within five business days; substantive response, within thirty.',
  },
];

export default function TermsOfServicePage() {
  return (
    <LegalPage
      title="Terms of Service"
      icon={ScrollText}
      lead="The terms that govern access to and use of Wildlife Universe, an independent wildlife and conservation publication."
      effectiveDate="2026-05-31"
      sections={sections}
    />
  );
}
