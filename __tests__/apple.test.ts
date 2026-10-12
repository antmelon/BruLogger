/**
 * @jest-environment node
 */
import { generateKeyPairSync, verify } from 'node:crypto';
import { appleClientSecret } from '../server/apple';

// A stand-in for the .p8 signing key downloaded from Apple (an EC P-256 key in PKCS#8 PEM)
const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
const KEY = {
  teamId: 'TEAM123456',
  keyId: 'KEY7890ABC',
  privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }) as string,
};

const decode = (part: string) => JSON.parse(Buffer.from(part, 'base64url').toString());

describe('appleClientSecret', () => {
  it('is a JWT signed with the key (ES256) that names the team, key and client', () => {
    const secret = appleClientSecret(KEY, 'com.antmelon.brulogger', {
      now: new Date('2026-10-12T00:00:00Z'),
      days: 180,
    });

    const [header, payload, signature] = secret.split('.');
    expect(decode(header)).toEqual({ alg: 'ES256', kid: 'KEY7890ABC' });
    expect(decode(payload)).toEqual({
      iss: 'TEAM123456',
      sub: 'com.antmelon.brulogger',
      aud: 'https://appleid.apple.com',
      iat: 1791763200,
      exp: 1791763200 + 180 * 24 * 60 * 60,
    });
    const signed = verify(
      'sha256',
      Buffer.from(`${header}.${payload}`),
      { key: publicKey, dsaEncoding: 'ieee-p1363' },
      Buffer.from(signature, 'base64url'),
    );
    expect(signed).toBe(true);
  });

  it('refuses to outlive the six months Apple allows', () => {
    expect(() => appleClientSecret(KEY, 'com.antmelon.brulogger', { days: 183 })).toThrow(/6 months/);
  });
});
