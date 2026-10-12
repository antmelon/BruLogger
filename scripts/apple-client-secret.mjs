// Makes the client secret that Supabase needs for Sign in with Apple on the website. Apple lets
// one last at most 6 months, so it has to be made again before it expires (see the README's
// "Sign in with Apple" section).
//
//   npm run -s apple:secret -- <team ID> <key ID> <path to AuthKey_XXXX.p8> | wl-copy
//
// The secret goes to stdout and everything else to stderr, so piping it to the clipboard keeps it
// out of the terminal. Paste it into both Supabase projects (production and brulogger-dev).
import { readFileSync } from 'node:fs';
import { appleClientSecret } from '../server/apple.ts';

const SERVICES_ID = 'com.antmelon.brulogger.web';
const DAYS = 180;

const [teamId, keyId, keyPath] = process.argv.slice(2);
if (!teamId || !keyId || !keyPath) {
  console.error('Usage: npm run -s apple:secret -- <team ID> <key ID> <path to .p8 file>');
  process.exit(1);
}

const privateKey = readFileSync(keyPath, 'utf8');
process.stdout.write(appleClientSecret({ teamId, keyId, privateKey }, SERVICES_ID, { days: DAYS }));
const expires = new Date(Date.now() + DAYS * 24 * 60 * 60 * 1000);
console.error(`\nClient secret for ${SERVICES_ID}, valid until ${expires.toDateString()}.`);
