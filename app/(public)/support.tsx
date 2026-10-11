import LegalPage, { LegalSection } from '../../components/LegalPage';

// The App Store's required support URL (https://brulogger.com/support). Keep the answers true to
// the app: when sign-in options or platforms change, update them here too.

const UPDATED = 'October 11, 2026';

const INTRO = [
  'Need help with BruLogger, or found something broken? Email support@brulogger.com and you\'ll usually hear back within a few days.',
];

const SECTIONS: LegalSection[] = [
  {
    heading: 'Is BruLogger free?',
    paragraphs: ['Yes. There are no ads and nothing to buy.'],
  },
  {
    heading: 'How do I sign in?',
    paragraphs: [
      'With your Google account. BruLogger never sees your Google password, and your brews are saved to your BruLogger account.',
    ],
  },
  {
    heading: 'Can I use it on Android or a computer?',
    paragraphs: [
      'Yes. Open brulogger.com in your browser and sign in with the same account. On Android, open it in Chrome and tap Install the app, or choose Install app from Chrome\'s menu, to add it to your home screen.',
    ],
  },
  {
    heading: 'Do my brews sync between devices?',
    paragraphs: [
      'Yes. Everything is saved to your account, so the same brews appear on your phone and on the web whenever you\'re signed in with the same account.',
    ],
  },
  {
    heading: 'Who can see my photos?',
    paragraphs: [
      'Only you. Photos are stored privately and can only be opened from your signed-in account.',
    ],
  },
  {
    heading: 'Can I get a copy of my data?',
    paragraphs: ['Email privacy@brulogger.com and we\'ll send you everything we have.'],
  },
  {
    heading: 'How do I delete my account?',
    paragraphs: [
      'Go to Profile and choose Delete Account. It permanently deletes your account, brews and photos. If you can\'t sign in, email privacy@brulogger.com from the address on your account.',
    ],
  },
  {
    heading: 'Something isn\'t working',
    paragraphs: [
      'Email support@brulogger.com with what you were doing and which device you\'re on. Errors are also reported to us automatically, without any personal information, so we often already know about them.',
    ],
  },
];

export default function SupportScreen() {
  return <LegalPage title="Support" updated={UPDATED} intro={INTRO} sections={SECTIONS} />;
}
