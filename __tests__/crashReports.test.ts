import { redactSecrets, scrubReport } from '../lib/crashReports';

describe('redactSecrets', () => {
  it('removes the token from a signed photo link', () => {
    expect(
      redactSecrets(
        'https://x.supabase.co/storage/v1/object/sign/brew-photos/u1/1.jpg?token=eyJhbGciOi.abc.def',
      ),
    ).toBe('https://x.supabase.co/storage/v1/object/sign/brew-photos/u1/1.jpg?token=[Filtered]');
  });

  it('removes sign-in codes and tokens from callback URLs', () => {
    expect(redactSecrets('https://www.brulogger.com/auth/callback?code=4f1c-9e2a')).toBe(
      'https://www.brulogger.com/auth/callback?code=[Filtered]',
    );
    expect(
      redactSecrets('brulogger://auth/callback#access_token=eyJ.a.b&expires_in=3600&refresh_token=r8x&provider_token=ya29'),
    ).toBe(
      'brulogger://auth/callback#access_token=[Filtered]&expires_in=3600&refresh_token=[Filtered]&provider_token=[Filtered]',
    );
  });
});

describe('scrubReport', () => {
  it('scrubs secrets anywhere in a report and leaves the rest as it was', () => {
    const signed = 'https://x.supabase.co/storage/v1/object/sign/brew-photos/u1/1.jpg?token=eyJ.a.b';
    const report = {
      level: 'error',
      request: { url: 'https://www.brulogger.com/auth/callback?code=abc' },
      exception: { values: [{ type: 'Error', value: `Failed to load ${signed}` }] },
      breadcrumbs: [
        { category: 'fetch', data: { method: 'GET', url: signed, status_code: 200 } },
        { category: 'navigation', data: { from: '/', to: '/brew/42' } },
      ],
      timestamp: 1791757000.5,
    };

    expect(scrubReport(report)).toEqual({
      level: 'error',
      request: { url: 'https://www.brulogger.com/auth/callback?code=[Filtered]' },
      exception: {
        values: [{ type: 'Error', value: 'Failed to load https://x.supabase.co/storage/v1/object/sign/brew-photos/u1/1.jpg?token=[Filtered]' }],
      },
      breadcrumbs: [
        {
          category: 'fetch',
          data: { method: 'GET', url: 'https://x.supabase.co/storage/v1/object/sign/brew-photos/u1/1.jpg?token=[Filtered]', status_code: 200 },
        },
        { category: 'navigation', data: { from: '/', to: '/brew/42' } },
      ],
      timestamp: 1791757000.5,
    });
  });
});
