import LegalPage, { LegalSection } from '../../components/LegalPage';

// Linked from the landing page, sign-in, Profile, and the App Store listing (as
// https://brulogger.com/privacy). Keep it true to what the app does: update it, and the date,
// before shipping anything that collects something new (AI photo parsing, another sign-in
// provider).

const UPDATED = 'October 14, 2026';

const INTRO = [
  'BruLogger is a coffee journal. This policy explains what BruLogger stores about you, why, who else handles it, and how to delete it.',
  'BruLogger is made by Anthony Longo, an independent developer in the United States ("we"). If you have a question about your data, email privacy@brulogger.com.',
];

const SECTIONS: LegalSection[] = [
  {
    heading: 'What we store',
    bullets: [
      'Your account. When you sign in with Apple, Apple shares your email address (or, if you choose Hide My Email, a private address that forwards to yours) and, if you choose to share it, your name. When you sign in with Google, Google shares your name, email address and profile picture. Either way, we also get an ID that links that account to BruLogger.',
      'Your brews. Everything you enter: the coffee, how you brewed it, ratings, flavor profiles and notes, and when you logged each brew.',
      'Your photos. Photos you add to brews are stored privately. Only your account can see them, through links that expire after an hour.',
      'Bag scans. If you use Scan the Bag, the photo of the bag is sent to Anthropic\'s Claude to read its label, then discarded: we don\'t store it. We keep a record of each scan (when it happened and how much AI processing it took) to apply the daily limit.',
      'Technical logs. Our hosting and sign-in providers record technical details such as IP address, browser or device type, and the time of each request, to keep the service running and secure. These logs are kept for a short time.',
      'Crash reports. When the app or website runs into an error, it sends us a report so we can fix it: what went wrong and where in the code, the steps just before it, the app version, and your device type and operating system. Reports don\'t include your name, email address, IP address or anything else that identifies you or your account, and anything that would give access to your account or photos is removed before they\'re sent.',
    ],
  },
  {
    heading: 'What we don\'t do',
    bullets: [
      'No ads, no analytics, and no tracking across other apps or websites.',
      'We don\'t sell your data or share it with anyone for advertising.',
      'We don\'t use your brews or photos to train AI models.',
      'We don\'t send marketing email.',
    ],
  },
  {
    heading: 'How we use it',
    paragraphs: [
      'Only to run BruLogger: to sign you in, to store and show you your brews and photos, to read the coffee bags you scan, and to work out your stats. We may contact you about your account or about changes to this policy.',
    ],
  },
  {
    heading: 'Who else handles it',
    paragraphs: [
      'These companies run parts of BruLogger for us. They may only use your data to provide their service to us.',
    ],
    bullets: [
      'Supabase: the database, sign-in and photo storage.',
      'Vercel: hosts the website and its servers.',
      'Apple and Google: sign you in, under their own privacy policies.',
      'Backblaze: stores our encrypted backups.',
      'Sentry: receives crash reports.',
      'Anthropic, through Vercel\'s AI Gateway: reads the coffee bag photos you choose to scan.',
    ],
  },
  {
    heading: 'Where it\'s stored',
    paragraphs: [
      'In the United States. If you use BruLogger from another country, your data is transferred to and stored in the United States.',
    ],
  },
  {
    heading: 'How long we keep it',
    paragraphs: [
      'Until you delete your account. Deleting it removes your data from BruLogger right away. Copies in our encrypted backups are deleted as those backups expire, within six months.',
    ],
  },
  {
    heading: 'Deleting your account',
    paragraphs: [
      'In the app or at brulogger.com, go to Profile and choose Delete Account. That permanently deletes your account, your brews and your photos. If you signed in with Apple, the iPhone app also asks you to confirm with Apple, then removes BruLogger from the apps using your Apple Account. If you delete your account on the website, you can remove BruLogger there yourself, in your Apple Account settings under Sign in with Apple.',
      'If you can\'t sign in, email privacy@brulogger.com from the address on your account and we\'ll delete it for you.',
    ],
  },
  {
    heading: 'Your rights',
    paragraphs: [
      'You can see, change and delete your brews in the app at any time. For a copy of everything we have about you, or anything else about your data, email privacy@brulogger.com and we\'ll reply within 30 days.',
      'Depending on where you live (for example the EU, the UK or California), the law may give you more rights over your data. We honor these requests from everyone, wherever they live. You can also complain to your local data protection authority.',
    ],
  },
  {
    heading: 'Security',
    paragraphs: [
      'All connections to BruLogger are encrypted. Each account can only reach its own brews and photos, and our backups are encrypted. No system is perfectly secure, but we\'ll tell you promptly if your data is ever exposed.',
    ],
  },
  {
    heading: 'Children',
    paragraphs: [
      'BruLogger isn\'t meant for children under 13, or under the minimum age in your country, and we don\'t knowingly collect their data. If you think a child has signed up, email privacy@brulogger.com and we\'ll delete the account.',
    ],
  },
  {
    heading: 'Changes to this policy',
    paragraphs: [
      'If this policy changes, we\'ll update this page and the date at the top. If the change is significant, we\'ll also tell you in the app before it takes effect.',
    ],
  },
];

export default function PrivacyScreen() {
  return <LegalPage title="Privacy Policy" updated={UPDATED} intro={INTRO} sections={SECTIONS} />;
}
