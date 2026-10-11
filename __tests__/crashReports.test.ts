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

  it('replaces account and brew IDs, so a report can\'t be tied to a person', () => {
    expect(
      redactSecrets('/storage/v1/object/sign/brew-photos/3f1c9a2e-7b4d-4e8a-9c1f-2a6b8d0e4f17/1791.jpg'),
    ).toBe('/storage/v1/object/sign/brew-photos/[id]/1791.jpg');
    expect(redactSecrets('navigated to /brew/edit/0C5395EB-563D-4038-8DC7-39040483629D')).toBe(
      'navigated to /brew/edit/[id]',
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

  it('keeps the debug IDs that match a report to its source maps', () => {
    const report = {
      debug_meta: { images: [{ type: 'sourcemap', code_file: 'app:///entry.js', debug_id: '0f0f93eb-1815-4c59-9b75-1904cd37a09f' }] },
      message: 'failed on /brew/0f0f93eb-1815-4c59-9b75-1904cd37a09f',
    };
    expect(scrubReport(report)).toEqual({
      debug_meta: report.debug_meta,
      message: 'failed on /brew/[id]',
    });
  });
});
