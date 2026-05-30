import { Lock } from 'lucide-react';
import { LegalPage } from '@/components/legal/LegalPage';
import { buildStaticMetadata, SITE_NAME } from '@/lib/seo';

export const metadata = buildStaticMetadata({
  title: 'Privacy Policy',
  description: `How ${SITE_NAME} collects, uses, and safeguards the personal information of readers, subscribers, and contributors.`,
  path: '/legal/privacy',
});

const sections = [
  {
    heading: 'Introduction',
    body: [
      'Wildlife Universe ("we", "us", "our") is an independent wildlife and conservation publication that produces educational articles, species profiles, conservation reporting, and nature-tourism guidance for readers around the world. This Privacy Policy describes the information we collect when you visit wildlifeuniverse.org, subscribe to a newsletter, contact our editorial team, or otherwise interact with our services, and explains how we use, store, share, and protect that information.',
      'Our editorial mission is to inform and inspire people about the natural world, and that mission can only be sustained on a foundation of reader trust. Protecting your privacy is part of that trust. We have written this policy in plain, accessible language because we want every reader — including those who are new to thinking about online privacy — to understand exactly what we do with their data and what choices they have. If anything below is unclear, please contact the address listed at the bottom of this page.',
      'This policy applies to all visitors and to all parts of Wildlife Universe operated under the wildlifeuniverse.org domain. It does not apply to third-party websites that we link to from our articles, even when those links point to peer-reviewed journals, conservation organisations, or government wildlife databases. Each of those sites operates under its own privacy policy, and we encourage you to read them.',
    ],
  },
  {
    heading: 'Information We Collect',
    body: [
      'We collect two broad categories of information: information that you voluntarily provide when you interact with the site, and information that is collected automatically by the technical infrastructure that delivers our pages to your browser. We try to minimise both categories — collecting only what we genuinely need to run a wildlife publication.',
    ],
  },
  {
    heading: 'Information Visitors Voluntarily Provide',
    body: [
      'When you create an account, subscribe to our newsletter, leave a comment, send us a tip, or submit a contact form, you provide personal information directly. The specific fields depend on the action you are taking, but they typically include your name or display name, your email address, and the content of any message you choose to send. If you submit a wildlife observation, a photograph, or a story tip, the information you include in that submission is also covered by this section.',
      'You are never required to provide more information than the form explicitly asks for. We do not require a real name to read articles, and we do not collect demographic information about our readers as a condition of access. Comments and account features are optional features that exist for readers who want to participate beyond passive reading.',
    ],
  },
  {
    heading: 'Information Automatically Collected',
    body: [
      'When you load a page on Wildlife Universe, our servers and our content delivery network record technical information that is necessary to deliver the page and to protect the site from abuse. This information includes your IP address, the type and version of your browser, the operating system you are using, the screen size of your device, the referring page (if any), the URL of the page you requested, and the timestamp of the request.',
      'This data is what every server needs in order to send the correct page back to the correct browser, and it is the same data that any well-operated website logs. We retain raw server logs for up to thirty days for security, abuse detection, and debugging purposes, after which they are deleted or aggregated into non-identifying counts.',
    ],
  },
  {
    heading: 'Cookies and Tracking Technologies',
    body: [
      'Wildlife Universe uses a small number of cookies and similar technologies to operate the site and to understand how readers use it. Cookies are tiny text files that your browser stores on your device when a website asks it to. We use cookies for three purposes: to keep you signed in when you have created an account, to remember your reading preferences (such as light or dark mode), and to gather aggregated, non-identifying analytics that help us understand which articles are reaching readers and where they are coming from.',
      'We do not use cookies to follow you across other websites you visit, and we do not sell or share cookie-based information with data brokers. A more detailed discussion of which cookies we set, why, and how to disable them is available in our Cookie Policy at /legal/cookies.',
    ],
  },
  {
    heading: 'Analytics and Website Performance Monitoring',
    body: [
      'We use privacy-respecting analytics to understand the aggregate behaviour of our audience: which articles are being read, which referring sources bring readers to our site, what countries our audience lives in, and how the site performs on different devices and connection speeds. We use this information to improve the website, to identify articles that should be updated or expanded, and to plan future editorial coverage.',
      'The analytics we use record events at the page level, not at the individual level. We do not build a profile of any single reader\'s browsing history, and we do not combine analytics data with personally identifying information. Where our analytics provider sets a cookie, it is configured to expire after a short period and to anonymise the IP address before storage.',
    ],
  },
  {
    heading: 'Contact Forms',
    body: [
      'If you use a contact form on Wildlife Universe to reach the editorial team, to submit a correction, to pitch a story, or to ask a question, the information you include in that form is delivered to our editorial inbox. We use that information only to respond to your message and to maintain a record of the correspondence in case follow-up is needed.',
      'We do not add the email addresses of people who write to us to our newsletter list automatically. Newsletter subscription is a separate, opt-in action. We also do not share the contents of reader correspondence with third parties except where required by law.',
    ],
  },
  {
    heading: 'Newsletter and Email Communications',
    body: [
      'Our newsletter is a fully opt-in service. When you subscribe, we collect the email address you provide and a record of when you subscribed and from which page. We send a confirmation request to verify that the address belongs to you before any further email is delivered.',
      'You can unsubscribe at any time using the link at the foot of every newsletter we send, or by writing to the contact address at the bottom of this policy. Unsubscribing removes your email from active sending immediately and from our retained subscriber list within thirty days. We do not retain the email addresses of unsubscribed readers in any active list, and we do not transfer them to any third-party marketing list.',
    ],
  },
  {
    heading: 'How Information Is Used',
    body: [
      'We use the information we collect to operate, maintain, and improve Wildlife Universe, and to communicate with readers who have asked us to. The specific uses include: delivering the articles, newsletters, and reader-account features you have requested; understanding which articles are reaching readers so that we can plan further coverage; protecting the site against fraud, scraping, and abuse; responding to questions, corrections, and tips sent to our editorial team; and complying with applicable legal obligations.',
      'We do not use reader data to train artificial-intelligence systems, we do not sell reader data, and we do not transfer reader data to advertising networks for the purpose of cross-site profiling.',
    ],
  },
  {
    heading: 'Data Retention',
    body: [
      'We retain personal information only for as long as it is needed for the purpose it was collected for, or for as long as the law requires. Server logs are retained for up to thirty days. Newsletter subscriptions are retained until you unsubscribe, after which the address is removed from active lists within thirty days. Reader-account information is retained for as long as the account is active; if you ask us to close your account, account data is deleted within thirty days, except for fragments that have already been anonymised into aggregate analytics.',
      'Editorial correspondence is retained for the operational life of the editorial team\'s inbox so that we can follow up on tips, corrections, and reader questions. We do not retain that correspondence indefinitely.',
    ],
  },
  {
    heading: 'Data Security and Protection',
    body: [
      'We take security seriously and use commercially reasonable measures to protect the information you entrust to us. Data in transit between your browser and our servers is encrypted with industry-standard TLS. Stored data is held by infrastructure providers that comply with major international security standards, and access to personal information is restricted to editorial and engineering team members who need it to do their work.',
      'No system connected to the internet can ever be one hundred percent secure, and we will not promise otherwise. If a security incident affects your personal information, we will notify affected readers in good faith and as required by applicable law.',
    ],
  },
  {
    heading: 'Third-Party Services',
    body: [
      'Wildlife Universe relies on a small number of third-party services to operate the website. These include our hosting and infrastructure providers, our database and authentication providers, our email-delivery provider for newsletters and transactional messages, and our analytics provider. Each of these services has access only to the information they need to perform their specific function, and each is bound by data-protection terms that prohibit them from using reader information for any other purpose.',
      'We never sell, rent, or trade personal information with third parties for marketing or advertising purposes. When the law requires us to disclose information in response to a valid legal process — such as a court order or a lawful request from a public authority — we will do so, but we will limit the disclosure to what the law actually requires.',
    ],
  },
  {
    heading: 'External Website Links',
    body: [
      'Our articles frequently link out to authoritative third-party sources: the IUCN Red List, peer-reviewed journals, conservation organisations, government wildlife departments, encyclopaedic references, and natural-history museums. These outbound links exist because they let our readers verify our reporting and continue their research with primary sources.',
      'Wildlife Universe has no control over the privacy practices of those third-party sites, and this policy does not extend to them. When you follow a link out of our site, please review the destination\'s privacy policy if you have concerns about how your information will be handled there.',
    ],
  },
  {
    heading: "Children's Privacy",
    body: [
      'Wildlife Universe is a general-audience educational publication. It is not directed to children under the age of thirteen, and we do not knowingly collect personal information from anyone under that age. If you are a parent or guardian and you believe that a child has provided personal information to us, please write to the contact address below and we will investigate and, where appropriate, delete the information.',
      'School teachers and educators are welcome to use Wildlife Universe in classroom settings; we encourage that use and ask only that any subscription or contact-form interaction be carried out by an adult on behalf of the class.',
    ],
  },
  {
    heading: 'International Visitors',
    body: [
      'Wildlife Universe is read in every part of the world, and we welcome international readers. Our servers are hosted in regions selected by our infrastructure providers, which means your information may be stored or processed in a country other than the one you live in. We rely on standard contractual safeguards and infrastructure-provider commitments to ensure that data is protected to a level comparable with what your home jurisdiction requires.',
      'If you are reading from the European Economic Area, the United Kingdom, California, Brazil, South Africa, or another jurisdiction with comprehensive data-protection legislation, the rights granted to you by those laws apply to your information regardless of where it is stored.',
    ],
  },
  {
    heading: 'User Rights and Choices',
    body: [
      'You have the right to ask us what personal information we hold about you, to correct anything that is inaccurate, to ask us to delete the information we hold (subject to a small number of legal exceptions, such as records we are required to retain for security or accounting reasons), and to ask us to limit how we use the information. You also have the right to withdraw consent for any optional processing at any time.',
      'To exercise any of these rights, write to mclean@wildlifeuniverse.org from the email address on file, or use the contact form on our Contact page. We will respond within thirty days. If you are not satisfied with our response, you have the right to lodge a complaint with the data-protection authority in your country.',
    ],
  },
  {
    heading: 'Policy Updates',
    body: [
      'We may update this Privacy Policy from time to time, either to reflect changes in our practices or to comply with new legal requirements. When we make a material change, we will revise the effective date at the top of the page and, for changes that significantly affect reader privacy, we will provide a more prominent notice (such as a banner on the site or a notification email to subscribers).',
      'We encourage you to review this policy periodically. Continuing to use Wildlife Universe after a policy update has been published indicates that you accept the updated terms.',
    ],
  },
  {
    heading: 'Contact Information',
    body:
      'For any question about this Privacy Policy, about the personal information we hold, or about your rights as a Wildlife Universe reader, please write to Mclean Mbaga at mclean@wildlifeuniverse.org. We aim to acknowledge every privacy-related message within five business days and to provide a substantive response within thirty.',
  },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      icon={Lock}
      lead="How Wildlife Universe collects, uses, and safeguards the information of readers, subscribers, and contributors."
      effectiveDate="2026-05-31"
      sections={sections}
    />
  );
}
