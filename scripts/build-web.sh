#!/usr/bin/env bash
# The production web build: Vercel's build command (vercel.json). It's `npx expo export --platform web`
# plus source maps for Sentry. When SENTRY_AUTH_TOKEN is set (Vercel Production only), the maps are
# uploaded so crash reports show real file names and lines; Metro's Sentry config (metro.config.js)
# stamps each bundle with the debug ID that matches it to its map. The maps are then deleted so they
# aren't served.
set -euo pipefail

npx expo export --platform web --source-maps

if [ -n "${SENTRY_AUTH_TOKEN:-}" ]; then
  npx sentry-cli sourcemaps upload --org "${SENTRY_ORG:?}" --project "${SENTRY_PROJECT:?}" dist
fi

find dist -name '*.map' -delete
