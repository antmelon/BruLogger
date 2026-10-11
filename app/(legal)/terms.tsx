import LegalPage, { LegalSection } from '../../components/LegalPage';

// Linked from the landing page, sign-in and Profile (https://brulogger.com/terms).

const UPDATED = 'October 11, 2026';

const INTRO = [
  'These terms are the agreement between you and Anthony Longo, the independent developer who makes BruLogger ("we"). By using BruLogger, you agree to them. If you don\'t agree, please don\'t use it.',
];

const SECTIONS: LegalSection[] = [
  {
    heading: 'The service',
    paragraphs: [
      'BruLogger is a free coffee journal for logging, rating and looking back on your brews. We may change, add or remove features. If we ever shut BruLogger down, we\'ll give you at least 30 days\' notice so you can save what you want to keep.',
    ],
  },
  {
    heading: 'Your account',
    paragraphs: [
      'You need to be at least 13, or the minimum age in your country, to use BruLogger. You sign in with your own Google account, and you\'re responsible for what happens on your BruLogger account. Keep your Google account secure.',
    ],
  },
  {
    heading: 'Your content',
    paragraphs: [
      'Your brews, notes and photos belong to you. You give us permission to store them and show them to you, only so that BruLogger can work. That permission ends when you delete them or your account.',
      'Only add things you have the right to share. Don\'t upload anything illegal, or other people\'s private information.',
    ],
  },
  {
    heading: 'Fair use',
    paragraphs: [
      'Don\'t misuse BruLogger. For example, don\'t try to reach other people\'s data, overload or attack the service, get around its limits, or use it to break the law. We may suspend or close accounts that do.',
    ],
  },
  {
    heading: 'No guarantees',
    paragraphs: [
      'BruLogger is provided "as is", for free, without warranties of any kind. We work to keep it running and back it up every night, but we can\'t promise it will always be available or that data will never be lost. Keep your own copy of anything you can\'t afford to lose.',
    ],
  },
  {
    heading: 'Limit of liability',
    paragraphs: [
      'To the extent the law allows, we aren\'t liable for any indirect or consequential losses arising from your use of BruLogger. Our total liability to you for any claim is limited to $50. Some places don\'t allow these limits, so they may not apply to you.',
    ],
  },
  {
    heading: 'Ending',
    paragraphs: [
      'You can stop using BruLogger and delete your account at any time from Profile. Deleting it removes your data as described in the Privacy Policy.',
    ],
  },
  {
    heading: 'Changes to these terms',
    paragraphs: [
      'If these terms change, we\'ll update this page and the date at the top. If the change is significant, we\'ll also tell you in the app before it takes effect. If you keep using BruLogger after that, you accept the new terms.',
    ],
  },
  {
    heading: 'Contact',
    paragraphs: ['Questions about these terms: support@brulogger.com.'],
  },
];

export default function TermsScreen() {
  return <LegalPage title="Terms of Service" updated={UPDATED} intro={INTRO} sections={SECTIONS} />;
}
