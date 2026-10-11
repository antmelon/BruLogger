// Crash reporting (Sentry). Reports must never carry anything that grants access: signed photo
// links (a token that opens the photo for an hour) and OAuth sign-in codes and tokens end up in
// breadcrumb URLs, so every report is scrubbed before it leaves the device. They also stay
// anonymous, as the App Store privacy answers say ("not linked to you"): IDs are removed too, since
// a brew ID or the user ID in a photo path would tie a report to an account.

// token: signed photo links. code: the PKCE sign-in code. The rest: tokens in an OAuth fragment.
const SECRET_PARAM = /([?&#](?:token|code|access_token|refresh_token|provider_token|provider_refresh_token)=)[^&#\s"']+/g;

// Account (user) and brew IDs are UUIDs
const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

/** The same text with secret query values replaced by "[Filtered]" and IDs by "[id]". */
export function redactSecrets(text: string): string {
  return text.replace(SECRET_PARAM, '$1[Filtered]').replace(UUID, '[id]');
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
    return Object.fromEntries(
      // debug_meta holds the bundles' debug IDs (UUIDs), which match a report to its source maps
      Object.entries(report).map(([k, v]) => [k, k === 'debug_meta' ? v : scrubReport(v)]),
    ) as T;
  }
  return report;
}
