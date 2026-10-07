---
name: add-brew-field
description: Add, rename, or remove a field on a Brew (e.g. "track the grinder used", "add a bloom time", "add a water recipe field", "drop varietal"). Covers every place a Brew field must be wired through — SQL schema, TypeScript type, form, detail screen, and optionally list/search/analytics — so nothing is missed.
---

# Add a field to Brew

A Brew field lives in several places with no codegen connecting them. Work through every step below; skip an optional step only deliberately.

## 1. Decide the shape

- **Column type**: `text` for free text, `numeric` for measurements, `integer` for whole counts/seconds, `text` + `check (... in (...))` for a fixed set of choices, `jsonb` for structured groups (like `flavor_profile`).
- **Name**: snake_case, with a unit suffix for measurements (`_g`, `_c`, `_s`), matching `dose_g`, `water_temp_c`, `brew_time_s`.
- **Required?** Almost always optional. A new required column breaks every existing row.

## 2. Schema: `supabase-schema.sql`

Append (never edit earlier statements; the file doubles as a migration log):

```sql
-- <Field> (run this if adding to an existing table)
alter table public.brews add column if not exists <name> <type>;
```

For a fixed set of choices, add a named check constraint in the same style as `brews_rating_check`.

**Tell the user they must run this in the Supabase SQL editor.** Nothing applies it automatically, and the app will error on save until it's run.

## 3. Type: `types/index.ts`

Add to `Brew` as `<name>?: <TsType> | null;`. For a fixed set of choices, also add a union type and an exported `const` array (like `BrewMethod` / `BREW_METHODS`) so the form and filters can iterate it.

## 4. Form: `components/BrewForm.tsx`

- State, initialized from `initial`: `useState(initial.<name> ?? '')` for text; `initial.<name>?.toString() ?? ''` for numbers; `initial.<name> ?? undefined` for unions.
- Submit payload: blank → `null`, never `undefined` (otherwise clearing the field on edit silently doesn't persist). Text: `x.trim() || null`. Numbers: put them in the `numbers` object so they go through `parseNumberField` validation (`{ integer: true }` for integer columns).
- UI: put it in the matching section ("The Coffee", "Brew Details", "Tasting Notes"). Fixed choices use `SelectPills`; numbers use `keyboardType="numeric"` with a realistic placeholder.

## 5. Detail: `app/brew/[id].tsx`

Add an `InfoRow` in the right section, rendered only when set, with a unit suffix when relevant (`` `${brew.x}g` ``).

## 6. Optional surfaces (ask yourself whether each applies)

- **List card / search** in `app/(tabs)/index.tsx`: add to the `searchable` array if users would search by it; add a `FilterPill` group if it's a fixed set of choices.
- **Analytics** (`app/(tabs)/analytics.tsx`, `lib/analytics.ts`): only if it's worth charting. Put the computation in `lib/analytics.ts` with a test.
- **Glossary** in `CONTEXT.md`: add or extend an entry if it's a new domain concept.
- **README** feature list, if it's user-visible and notable.

## 7. Verify

```sh
npm test && npm run typecheck && npm run lint
```

Add or extend a test when the field has parsing or analytics logic. Finally, remind the user about the SQL from step 2.

## Removing or renaming a field

Do the same steps in reverse. For the schema, append `alter table public.brews drop column if exists ...` or `rename column ... to ...`. Grep the whole repo for the old name, including `__tests__/` and `CONTEXT.md`. Point out to the user that a drop destroys existing data.
