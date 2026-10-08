---
name: add-brew-field
description: Add, rename, or remove a field on a Brew (e.g. "track the grinder used", "add a bloom time", "add a water recipe field", "drop varietal"). Covers every place a Brew field must be wired through — SQL schema, TypeScript type, form, detail screen, and optionally list/search/analytics — so nothing is missed.
---

# Add a field to Brew

A Brew field lives in several places, and only the database types are generated. Work through every step below; skip an optional step only deliberately.

## 1. Decide the shape

- **Column type**: `text` for free text, `numeric` for measurements, `integer` for whole counts/seconds, `text` + `check (... in (...))` for a fixed set of choices, `jsonb` for structured groups (like `flavor_profile`).
- **Name**: snake_case, with a unit suffix for measurements (`_g`, `_c`, `_s`), matching `dose_g`, `water_temp_c`, `brew_time_s`.
- **Required?** Almost always optional. A new required column breaks every existing row.

## 2. Schema: a new migration

`npx supabase migration new add_<name>` creates `supabase/migrations/<timestamp>_add_<name>.sql`. Never edit a migration that has already been pushed.

```sql
alter table public.brews add column <name> <type>;
```

For a fixed set of choices, add a named check constraint in the same style as `brews_brew_method_check`.

**Show the user the SQL and get their OK before applying it to production** with `npx supabase db push` (needs `SUPABASE_DB_PASSWORD`, kept in the gitignored `.env.supabase`). The app will error on save until it's applied.

## 3. Types

Run `npm run db:types` after the push to regenerate `types/database.ts`; `Brew` and `BrewInsert` in `types/index.ts` derive from it. For a fixed set of choices or a `jsonb` column, the generated type is just `string` / `Json`: add a union type and an exported `const` array (like `BrewMethod` / `BREW_METHODS`) and narrow the column in `BrewColumns` in `types/index.ts`.

## 4. Form: `components/BrewForm.tsx`

- State, initialized from `initial`: `useState(initial.<name> ?? '')` for text; `initial.<name>?.toString() ?? ''` for numbers; `initial.<name> ?? undefined` for unions.
- Submit payload: blank → `null`, never `undefined` (otherwise clearing the field on edit silently doesn't persist). Text: `x.trim() || null`. Numbers: put them in the `numbers` object so they go through `parseNumberField` validation (`{ integer: true }` for integer columns).
- UI: put it in the matching section ("The Coffee", "Brew Details", "Tasting Notes"). Fixed choices use `SelectPills`; numbers use `keyboardType="numeric"` with a realistic placeholder.

## 5. Detail: `app/brew/[id].tsx`

Add an `InfoRow` in the right section, rendered only when set, with a unit suffix when relevant (`` `${brew.x}g` ``).

## 6. HTTP API and Hermes skill

- `lib/brewInput.ts`: add the field to `TEXT_FIELDS` / `NUMBER_FIELDS` (or handle it explicitly, for enums and objects) so `POST /api/brews` accepts it. Unknown keys are rejected. Add a case to `__tests__/brewInput.test.ts`.
- `integrations/hermes/log-brew/SKILL.md`: add a row to the Fields table so the bot knows to fill it in. Tell the user that Hermes's copy of the skill on melchior needs updating too.

## 7. Optional surfaces (ask yourself whether each applies)

- **List card / search** in `app/(tabs)/index.tsx`: add to the `searchable` array if users would search by it; add a `FilterPill` group if it's a fixed set of choices.
- **Analytics** (`app/(tabs)/analytics.tsx`, `lib/analytics.ts`): only if it's worth charting. Put the computation in `lib/analytics.ts` with a test.
- **Glossary** in `CONTEXT.md`: add or extend an entry if it's a new domain concept.
- **README** feature list, if it's user-visible and notable.

## 8. Verify

```sh
npm test && npm run typecheck && npm run lint
```

Add or extend a test when the field has parsing or analytics logic. Test fixtures typed as `Brew` need the new column too (as `null`).

## Removing or renaming a field

Do the same steps in reverse. For the schema, write a migration with `alter table public.brews drop column ...` or `rename column ... to ...`. Grep the whole repo for the old name, including `__tests__/` and `CONTEXT.md`. Point out to the user that a drop destroys existing data.
