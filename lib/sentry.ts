import * as Sentry from '@sentry/react-native';
import { scrubReport } from './crashReports';

// Crash and error reports from the app (iOS, Android, web) to Sentry. Off unless
// EXPO_PUBLIC_SENTRY_DSN is set at build time, which only production builds do, so local
// development and preview deploys report nothing.
//
// What's sent is limited on purpose, and the privacy policy says so: errors only (no performance
// tracing, no session tracking, no session replay, no screenshots), no IP address or other
// personal data, and nothing that grants access (scrubReport). Turning any of these on is a privacy
// policy change: the policy promises no analytics.

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

export function initCrashReports() {
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT ?? 'production',
    sendDefaultPii: false,
    tracesSampleRate: 0,
    enableAutoSessionTracking: false,
    attachScreenshot: false,
    attachViewHierarchy: false,
    beforeSend: (event) => scrubReport(event),
    beforeBreadcrumb: (breadcrumb) => scrubReport(breadcrumb),
  });
}

/** Wraps the root component so render errors and touch breadcrumbs are reported. */
export const withCrashReports = Sentry.wrap;
