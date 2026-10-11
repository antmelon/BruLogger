// Crash reporting (Sentry). Reports must never carry anything that grants access: signed photo
// links (a token that opens the photo for an hour) and OAuth sign-in codes and tokens end up in
// breadcrumb URLs, so every report is scrubbed before it leaves the device.

// token: signed photo links. code: the PKCE sign-in code. The rest: tokens in an OAuth fragment.
const SECRET_PARAM = /([?&#](?:token|code|access_token|refresh_token|provider_token|provider_refresh_token)=)[^&#\s"']+/g;

/** The same text with secret query values replaced by "[Filtered]". */
export function redactSecrets(text: string): string {
  return text.replace(SECRET_PARAM, '$1[Filtered]');
}

/**
 * A copy of a report (Sentry event or breadcrumb) with secrets redacted from every string in it,
 * wherever they are: request URL, breadcrumb URLs, error messages.
 */
export function scrubReport<T>(report: T): T {
  if (typeof report === 'string') return redactSecrets(report) as T;
  if (Array.isArray(report)) return report.map(scrubReport) as T;
  // Only plain objects are rebuilt; anything else (a Date, an Error) is passed through as it is
  if (report && typeof report === 'object' && Object.getPrototypeOf(report) === Object.prototype) {
    return Object.fromEntries(Object.entries(report).map(([k, v]) => [k, scrubReport(v)])) as T;
  }
  return report;
}
