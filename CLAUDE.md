# BruLogger

Personal coffee brew journal. Expo (SDK 55) + Expo Router + React Native Web, backed by Supabase (Postgres + Auth + Storage). Ships to iOS/Android and to the web at brulogger.vercel.app.

Domain glossary: @CONTEXT.md

## Commands

```sh
npm test            # jest (jest-expo preset), tests live in __tests__/
npm run typecheck   # tsc --noEmit (strict)
npm run lint        # eslint (legacy .eslintrc.js, eslint 8)
npm run web         # dev server for the web build
npx expo export --platform web   # production web bundle -> dist/ (good smoke test that everything compiles)
```

Run `npm test && npm run typecheck && npm run lint` before calling a change done.

`sharp` (devDependency, used only by `scripts/generate-icon.js`) fails `npm ci` on machines with a system libvips installed (e.g. Arch, where `appstream` pulls it in): it tries to build from source against it. Fix with `SHARP_IGNORE_GLOBAL_LIBVIPS=1 npm ci`.

Env: `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` (read in `lib/supabase.ts`). Sign-in is Google OAuth only, so authenticated screens can't be driven locally without a real account.

## Layout

- `app/`: Expo Router routes. `_layout.tsx` is the auth gate: it redirects between the landing page (`index.tsx`), `(auth)/login`, and `(tabs)` based on the Supabase session. `auth/callback.tsx` finishes the web OAuth redirect.
- `app/(tabs)/`: My Brews list (search/filter/sort client-side), Analytics, Profile.
- `app/brew/`: detail `[id].tsx`, `new.tsx`, `edit/[id].tsx`. New and edit both render `components/BrewForm.tsx`.
- `lib/brews.ts`: the only data-access layer (CRUD + photo upload/delete). Screens never call `supabase.from` directly.
- `lib/analytics.ts`, `lib/form.ts`: pure helpers, unit-tested.
- `lib/theme.ts`: color tokens. Use `colors.*` and don't hardcode hex values (a few older files still do).
- `types/index.ts`: hand-written `Brew` type. There are no generated Supabase types, so keep it in sync with the schema manually.
- `supabase-schema.sql`: schema plus an append-only log of `alter` statements. It is run by hand in the Supabase SQL editor; nothing applies it automatically.

## Conventions and gotchas

- **null vs undefined**: optional columns are typed `?: T | null`. To clear a column on update, send `null`; `undefined` keys are dropped from the JSON payload, so the old value silently stays.
- **Platform branches**: web and native differ for confirm dialogs (`window.confirm` vs `Alert`), the slider (`<input type="range">` vs community slider), photo upload (Blob vs RN FormData `{uri}`), and the OAuth redirect. When touching one of these, check both paths.
- **Photos** live in the public `brew-photos` bucket under `<user_id>/<timestamp>.<ext>`; `brews.photo_url` stores the public URL. When a photo is replaced or a brew is deleted, delete the old object too (`deleteBrewPhoto`), and do it only after the DB write succeeds.
- **Charts** (radar, rating trend, bars) are hand-rolled with `react-native-svg`. There is no chart library.
- Styles: `StyleSheet.create` at the bottom of each file; prettier config is single quotes, 100 cols, trailing commas.
- Tests mock the Supabase query-builder chain (see `__tests__/brews.test.ts`); extend those mocks rather than hitting a real backend.
- Web deploy: Vercel project `brulogger`, connected to GitHub. Pushing to `main` deploys to production; other branches get preview URLs. Dashboard settings are Node 24.x, build `npx expo export --platform web`, output `dist`, plus an SPA rewrite in `vercel.json`. The Supabase env vars are set separately for Production and for Preview/Development. The CLI is linked (`.vercel/` is gitignored): `vercel ls`, `vercel inspect <url> --logs`.
