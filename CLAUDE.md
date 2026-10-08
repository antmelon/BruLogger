# BruLogger

Personal coffee brew journal. Expo (SDK 57, React Native 0.86) + Expo Router + React Native Web, backed by Supabase (Postgres + Auth + Storage). Ships to iOS/Android and to the web at brulogger.vercel.app.

Domain glossary: @CONTEXT.md

## Commands

```sh
npm test            # jest (jest-expo preset), tests live in __tests__/
npm run typecheck   # tsc --noEmit (strict)
npm run lint        # expo lint (ESLint 9 flat config: eslint.config.js)
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
- `lib/brewQueries.ts`: TanStack Query hooks over `lib/brews.ts`, which is how screens read and write brews (`useBrews`, `useBrew`, `useCreateBrew`/`useUpdateBrew`/`useDeleteBrew`). One `['brews']` list query is shared by every screen; details live under `['brews', id]`. Stale data refetches when a screen or the app regains focus (30s `staleTime`), which is how bot-logged brews appear. The update/delete mutations own the old-photo cleanup.
- `lib/analytics.ts`, `lib/brewList.ts` (list search/filter/sort), `lib/form.ts`: pure helpers, unit-tested. Keep logic like this out of screens so it can be tested.
- `lib/theme.ts`: `colors.*` and `shadows.*` (card, raised, button) tokens. Don't hardcode hex values or copy shadow blocks.
- `api/brews/`: Vercel Node functions, the HTTP API used by the Hermes Telegram bot. `index.ts`: `GET` list (`limit`, `since`, `q` search), `POST` create with an optional base64 photo, `?dry_run=1`, and an `Idempotency-Key` header (stored in `brews.idempotency_key`; a repeat returns the saved brew). `[id].ts`: `GET`, `PATCH` (partial; `null` clears; `photo` replaces/removes), `DELETE`. Shared auth/response/photo helpers live in `server/api.ts`, outside `api/` so they aren't deployed as a function. Single-user: a bearer token (`BRULOGGER_API_TOKEN`) maps to `BRULOGGER_USER_ID`, and it writes with `SUPABASE_SERVICE_ROLE_KEY`, so the handlers (not RLS) scope every query to that user. Input validation lives in `lib/brewInput.ts` (`parseBrewInput`, `parseBrewPatch`). The bot's skill is `integrations/hermes/log-brew/SKILL.md`; keep it in sync when fields change.
- `types/database.ts`: generated from the live schema by `npm run db:types`; never edit it. `types/index.ts` derives `Brew`/`BrewInsert` from it and narrows the columns Postgres only knows as text/jsonb (`brew_method`, `roast_level`, `flavor_profile`). Both Supabase clients are typed with it.
- `supabase/migrations/`: the schema, managed with the Supabase CLI (a devDependency, so `npx supabase ...`). The project is linked to production ("Coffee App", ref `gnrjhylsbfzqfeenoxwa`). New schema change: `npx supabase migration new <name> </dev/null` (it reads the migration body from stdin when stdin isn't a TTY, so without the redirect it hangs), then `npx supabase db push` (reads `SUPABASE_DB_PASSWORD`; the user keeps it in the gitignored `.env.supabase`, load it with `set -a; . ./.env.supabase; set +a`), then `npm run db:types`. Always show the user the SQL and get their OK before pushing to production; the auto-mode classifier blocks `db push` from here, so the user runs it (their shell is fish: `! bash -c 'set -a; . ./.env.supabase; set +a; npx supabase db push --yes'`). Then apply the same migration to the dev project too (see the Web deploy note): `npx supabase db push --db-url "postgresql://postgres.nzqgtqpvdkmtqjbttegi:$SUPABASE_DEV_DB_PASSWORD@aws-1-us-east-1.pooler.supabase.com:5432/postgres"` (also in `.env.supabase`); this doesn't change the repo's link to production. `db pull`/`db diff` need Docker, which isn't usable on this machine; local `pg_dump`/`psql` against the session pooler (see `supabase/.temp/pooler-url`) work instead.

## Conventions and gotchas

- **null vs undefined**: on a `Brew` (a row), optional columns are `T | null`; on a `BrewInsert` they are `?: T | null`. To clear a column on update, send `null`; `undefined` keys are dropped from the JSON payload, so the old value silently stays.
- **Platform branches**: `Alert.alert` is a silent no-op in react-native-web, so anything that asks the user something needs a web path. Web and native differ for confirm dialogs (`window.confirm` vs `Alert`), the photo source picker (web opens the file picker directly), the slider (`<input type="range">` vs community slider), photo upload (Blob vs RN FormData `{uri}`), and the OAuth redirect. When touching one of these, check both paths.
- **Photos** live in the public `brew-photos` bucket under `<user_id>/<timestamp>.<ext>`; `brews.photo_url` stores the public URL. The form shrinks a photo when it's picked (`prepareForUpload` in `lib/photos.ts`: 1600px longest edge, JPEG 0.8). Bot photos arrive already compressed by Telegram. When a photo is replaced or a brew is deleted, delete the old object too (`deleteBrewPhoto`), and do it only after the DB write succeeds (the mutations in `lib/brewQueries.ts` do this).
- **Dependencies**: keep Expo packages at the SDK's versions with `npx expo install --fix` (check with `npx expo install --check` and `npx expo-doctor`). `react-native-reanimated`, `react-native-worklets`, `react-native-gesture-handler` and `@react-native-masked-view/masked-view` aren't used by the app: Expo Router's drawer requires them as peers, and autolinking compiles them into native builds, so they are pinned to the SDK's versions instead of whatever npm resolves. On an SDK upgrade, a `^`/`~` jump across majors tends to hit npm peer conflicts from stale lockfile entries; write the expected versions into package.json and reinstall with a fresh lockfile.
- **URL scheme** is `brulogger` (lowercase is required). Native OAuth redirects to `brulogger://auth/callback`, so each Supabase project's redirect URLs need `brulogger://**`; Expo Go uses `exp://**` instead.
- **Charts** (radar, rating trend, bars) are hand-rolled with `react-native-svg`. There is no chart library.
- Styles: `StyleSheet.create` at the bottom of each file; prettier config is single quotes, 100 cols, trailing commas.
- Tests mock the Supabase query-builder chain (see `__tests__/brews.test.ts`); extend those mocks rather than hitting a real backend. Build `Brew` fixtures from `BASE_BREW` in `__tests__/fixtures.ts`.
- Web deploy: Vercel project `brulogger`, connected to GitHub. Pushing to `main` deploys to production; other branches get preview URLs. Dashboard settings are Node 24.x, build `npx expo export --platform web`, output `dist`, plus an SPA rewrite in `vercel.json`. The Supabase env vars are set separately: Production uses "Coffee App"; Preview and Development use a separate Supabase project, "brulogger-dev" (ref `nzqgtqpvdkmtqjbttegi`), so previews and local dev never touch real brews. Keep its schema in step with production's migrations. It's on the free plan and pauses after about a week without use; restore it in the Supabase dashboard if previews fail with `ERR_NAME_NOT_RESOLVED`. Its Auth redirect URLs include the preview pattern `https://brulogger-*-alongo0925-4877s-projects.vercel.app/**`. The bot's API env vars (`BRULOGGER_*`, `SUPABASE_SERVICE_ROLE_KEY`) exist only in Production. The CLI is linked (`.vercel/` is gitignored): `vercel ls`, `vercel inspect <url> --logs`.
