import { Cookie } from 'lucide-react';
import { LegalPage } from '@/components/legal/LegalPage';
import { buildStaticMetadata, SITE_NAME } from '@/lib/seo';

export const metadata = buildStaticMetadata({
  title: 'Cookie Policy',
  description: `Which cookies ${SITE_NAME} sets, what each one is for, and how to control them in your browser.`,
  path: '/legal/cookies',
});

const sections = [
  {
    heading: 'What Cookies Are',
    body: [
      'A cookie is a small text file that a website asks your browser to store on your device. The file usually contains an identifier and an expiry date and is sent back to the originating website on each subsequent request. Cookies were invented in the mid-1990s to let websites remember things between page loads — whether you are signed in, what language you prefer, what items you have in a shopping cart — without requiring the user to manage that state manually.',
      'Modern websites use cookies for a broader set of purposes: authentication, preferences, analytics, security, and advertising. This Cookie Policy describes which of those purposes apply to Wildlife Universe, which cookies we actually set, and how you can control them.',
    ],
  },
  {
    heading: 'Why Wildlife Universe Uses Cookies',
    body: [
      'Our editorial mission is to provide a fast, clean reading experience and to understand at the aggregate level which articles are reaching readers and which need more work. Cookies help us do that without forcing readers to sign in or to enter information every visit. We use the fewest cookies we can; we do not use cookies to follow you around the internet; and we do not sell information derived from cookies.',
    ],
  },
  {
    heading: 'Essential Cookies',
    body: [
      'Essential cookies are required for the site to function. They store information that the site cannot operate without, such as the security token for a signed-in reading session or the temporary identifier of a comment submission. We set essential cookies only after you have taken an action (such as creating an account or submitting a comment) that requires them.',
      'Because essential cookies are necessary to the operation of the service, they cannot be disabled separately from the site itself. If you disable them at the browser level, parts of Wildlife Universe that require sign-in will not function.',
    ],
  },
  {
    heading: 'Functional Cookies',
    body: [
      'Functional cookies remember preferences that improve the experience for returning readers. The most visible example is our light/dark theme preference: if you switch to dark mode, a functional cookie remembers that choice so the site loads in dark mode on your next visit without flicker.',
      'Functional cookies are optional. Disabling them in your browser will not prevent you from reading Wildlife Universe; you will just see the default theme each time you visit.',
    ],
  },
  {
    heading: 'Analytics Cookies',
    body: [
      'Analytics cookies help us understand the aggregate behaviour of our audience — which articles are popular, which referring sources bring readers to the site, what countries our readers live in, and how the site performs on different devices. We use this information at the population level, not at the individual level: we do not build profiles of individual readers, and we do not combine analytics data with personally identifying information.',
      'Where our analytics provider sets a cookie, it is configured to anonymise IP addresses and to expire after a reasonably short period (typically thirty days for a session cookie and up to one year for a persistent visitor identifier). If you prefer not to be counted in analytics at all, you can disable analytics cookies in your browser settings.',
    ],
  },
  {
    heading: 'Performance Cookies',
    body: [
      'Performance cookies record how quickly pages load on your device and connection, so that we can find slow pages and prioritise them for optimisation. The data collected is technical and aggregated — page-load time, time to first byte, time to first contentful paint, and so on — and is not used to identify individual readers.',
      'Performance cookies are optional and can be disabled at the browser level without affecting the ability to read the site.',
    ],
  },
  {
    heading: 'Advertising Cookies',
    body: [
      'Wildlife Universe currently displays a small number of advertisements through reputable advertising networks. Those networks may set their own cookies in your browser to control ad delivery and to limit how often the same advertisement is shown to the same reader (frequency capping).',
      'We do not sell reader information to advertising networks for the purpose of building cross-site profiles, and we do not permit our advertising partners to use our site to harvest information beyond what is needed to deliver and measure an ad impression. You can opt out of personalised advertising on most networks through your operating-system privacy settings or through industry opt-out pages such as the Network Advertising Initiative consumer opt-out and the Digital Advertising Alliance consumer choice page.',
    ],
  },
  {
    heading: 'Third-Party Cookies',
    body: [
      'Some pages on Wildlife Universe embed third-party content — for example, a YouTube video of a species in the field, a Twitter / X embed of a wildlife observation, or a social-share widget. When you load a page containing such an embed, the third-party service may set its own cookies in your browser. Those cookies are controlled by the embedding service under its own policy, not by Wildlife Universe.',
      'Where we use third-party embeds, we try to use privacy-respecting variants where they exist (for example, YouTube\'s privacy-enhanced embed mode). If you prefer to block third-party embeds entirely, most modern browsers offer extensions or built-in settings that allow you to do so.',
    ],
  },
  {
    heading: 'Managing Cookies',
    body: [
      'You can manage cookies in three places. First, every modern browser (Chrome, Firefox, Safari, Edge, Brave, and others) allows you to view stored cookies, delete them, block them from specific sites, and block third-party cookies globally. Second, your operating system\'s privacy settings (on iOS, Android, macOS, and Windows) include controls that affect cookie and tracker behaviour across all browsers. Third, browser extensions such as content blockers can give you finer-grained control over which cookies are accepted from which domains.',
      'Disabling cookies at any of these levels will not prevent you from reading Wildlife Universe articles. Some optional features — sign-in, comment-posting, theme persistence — depend on cookies and will be unavailable if cookies are blocked.',
    ],
  },
  {
    heading: 'Browser Settings',
    list: [
      'Chrome: Settings → Privacy and security → Cookies and other site data.',
      'Firefox: Settings → Privacy & Security → Cookies and Site Data.',
      'Safari (macOS): Settings → Privacy → Manage Website Data.',
      'Safari (iOS): Settings → Safari → Block All Cookies.',
      'Edge: Settings → Cookies and site permissions → Manage and delete cookies and site data.',
      'Brave: Settings → Shields → Trackers & ads blocking → Block third-party cookies.',
    ],
  },
  {
    heading: 'Cookie Retention Periods',
    body: [
      'Cookie retention varies by purpose. Session cookies (used during a single visit) expire automatically when you close your browser. Persistent cookies live longer — typically thirty days for analytics session continuity, up to one year for return-visitor recognition, and up to six months for theme preference. Essential cookies used for sign-in are refreshed each time you visit; if you stop visiting, they expire after thirty days of inactivity.',
      'You can review and delete persistent cookies at any time using the browser settings above. Wildlife Universe will treat your browser as a new visitor on your next visit after a cookie has been deleted.',
    ],
  },
  {
    heading: 'Policy Updates',
    body: [
      'We will revise this Cookie Policy whenever our cookie practices change in a material way — for example, if we add a new analytics provider, if we change the retention period of a category of cookie, or if we adopt a new consent mechanism. The effective date at the top of the page will be updated, and significant changes will be announced more prominently on the site.',
    ],
  },
  {
    heading: 'Contact Information',
    body:
      'For any question about cookies or about how Wildlife Universe handles tracking technologies, please write to Mclean Mbaga at mclean@wildlifeuniverse.org. We are happy to explain in more detail and to help readers who want to limit cookie use to find the right settings.',
  },
];

export default function CookiePolicyPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      icon={Cookie}
      lead="Which cookies Wildlife Universe sets, what each one is for, and how to control them in your browser."
      effectiveDate="2026-05-31"
      sections={sections}
    />
  );
}
