import { BREW_METHODS, ROAST_LEVELS, CoffeeInsert, FlavorProfile } from '../types';
import { BrewFields, parseNumberField } from './form';

// Validation for brews created and changed through the HTTP API (api/brews/), used by the Hermes
// Telegram bot. Lenient where an agent is likely to vary (case of enum values, numbers sent as
// strings), strict about unknown keys so a typo like "dose" instead of "dose_g" fails loudly
// instead of being dropped.
//
// A brew's coffee comes as coffee_id, or as its details (coffee_name, roaster, ...), which
// server/coffees.ts matches to one of the user's coffees or saves as a new one.

/** Coffee details by their coffee column names (the API's coffee_name is `name`). */
export type CoffeeDetails = Partial<Omit<CoffeeInsert, 'finished_at'>>;

export type CoffeeRef = { id: string } | { details: CoffeeDetails };

export type BrewApiFields = BrewFields & { created_at?: string };

export type BrewApiInput = { brew: BrewApiFields; coffee: CoffeeRef };

/** A partial update: only what was sent. `coffee` is there when any coffee field was sent. */
export type BrewPatch = { brew: Partial<BrewApiFields>; coffee?: CoffeeRef };

type Result<T> = { ok: true; value: T } | { ok: false; errors: string[] };

const BREW_TEXT = ['grind_size', 'flavor_notes', 'general_notes'] as const;
const BREW_NUMBERS = ['water_temp_c', 'dose_g', 'yield_g'] as const;
const COFFEE_TEXT = ['roaster', 'origin', 'varietal', 'processing_method', 'roaster_notes'] as const;
const COFFEE_FIELDS = ['coffee_name', ...COFFEE_TEXT, 'roast_level', 'roast_date', 'bag_size_g'] as const;
const PROFILE_KEYS: (keyof FlavorProfile)[] = ['aromatics', 'acidity', 'sweetness', 'aftertaste', 'body'];

export const ALLOWED_FIELDS: string[] = [
  'coffee_id', ...COFFEE_FIELDS, 'brew_method', ...BREW_TEXT, ...BREW_NUMBERS,
  'brew_time_s', 'rating', 'flavor_profile', 'created_at',
];

const MAX_TEXT = 2000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function matchEnum<T extends string>(value: unknown, options: readonly T[]): T | undefined {
  if (typeof value !== 'string') return undefined;
  const norm = (s: string) => s.toLowerCase().replace(/[\s_-]/g, '');
  return options.find((o) => norm(o) === norm(value));
}

function toNumber(value: unknown, integer = false): number | null | undefined {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) return undefined;
    return integer ? Math.round(value) : value;
  }
  if (typeof value === 'string') return parseNumberField(value, { integer });
  return undefined;
}

/** Score on the app's 1–5 scale in half steps, or undefined if out of range. */
function toHalfStepScore(value: unknown): number | undefined {
  const n = toNumber(value);
  if (n === null || n === undefined) return undefined;
  const rounded = Math.round(n * 2) / 2;
  return rounded >= 1 && rounded <= 5 ? rounded : undefined;
}

/** 'YYYY-MM-DD' for a real date no later than tomorrow (UTC, so any time zone's today passes). */
function toRoastDate(value: unknown): string | undefined {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const d = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) return undefined;
  return d.getTime() <= Date.now() + 86_400_000 ? value : undefined;
}

type Fields = { brew: Record<string, unknown>; coffee: Record<string, unknown>; coffeeId?: unknown };

/**
 * Validates and normalizes the fields present in `input` (null stays null, meaning cleared).
 * Missing fields are left out, so a create fills in defaults and a patch sends only what it got.
 */
function validate(input: Record<string, unknown>, errors: string[]): Fields {
  const fields: Fields = { brew: {}, coffee: {} };
  const has = (key: string) => key in input && input[key] !== undefined;

  const unknown = Object.keys(input).filter((k) => !ALLOWED_FIELDS.includes(k));
  if (unknown.length) {
    errors.push(`Unknown field(s): ${unknown.join(', ')}. Allowed: ${ALLOWED_FIELDS.join(', ')}.`);
  }

  if (has('coffee_id')) {
    const id = input.coffee_id;
    if (id !== null && (typeof id !== 'string' || !UUID.test(id))) errors.push("coffee_id must be a coffee's id.");
    fields.coffeeId = id;
  }

  for (const [field, target, column] of [
    ['coffee_name', fields.coffee, 'name'],
    ...COFFEE_TEXT.map((f) => [f, fields.coffee, f] as const),
    ...BREW_TEXT.map((f) => [f, fields.brew, f] as const),
  ] as const) {
    if (!has(field)) continue;
    const v = input[field];
    if (v !== null && typeof v !== 'string') errors.push(`${field} must be a string.`);
    else if (typeof v === 'string' && v.length > MAX_TEXT) errors.push(`${field} is too long.`);
    else target[column] = typeof v === 'string' ? v.trim() || null : null;
  }

  if (has('roast_level')) {
    const v = input.roast_level;
    const level = v === null || v === '' ? null : matchEnum(v, ROAST_LEVELS);
    if (level === undefined) errors.push(`roast_level must be one of: ${ROAST_LEVELS.join(', ')}.`);
    else fields.coffee.roast_level = level;
  }

  if (has('roast_date')) {
    const v = input.roast_date;
    const date = v === null ? null : toRoastDate(v);
    if (date === undefined) errors.push('roast_date must be a date (YYYY-MM-DD), not in the future.');
    else fields.coffee.roast_date = date;
  }

  if (has('bag_size_g')) {
    const n = toNumber(input.bag_size_g);
    if (n === undefined || n === 0) errors.push('bag_size_g must be a positive number (grams).');
    else fields.coffee.bag_size_g = n;
  }

  if (has('brew_method')) {
    const method = matchEnum(input.brew_method, BREW_METHODS);
    if (input.brew_method !== null && !method) errors.push(`brew_method must be one of: ${BREW_METHODS.join(', ')}.`);
    else fields.brew.brew_method = method ?? null;
  }

  for (const field of [...BREW_NUMBERS, 'brew_time_s'] as const) {
    if (!has(field)) continue;
    const n = toNumber(input[field], field === 'brew_time_s');
    if (n === undefined) errors.push(`${field} must be a non-negative number.`);
    else fields.brew[field] = n;
  }

  if (has('rating')) {
    const rating = input.rating === null ? null : toHalfStepScore(input.rating);
    if (rating === undefined) errors.push('rating must be between 1 and 5 (half steps allowed).');
    else fields.brew.rating = rating;
  }

  if (has('flavor_profile')) {
    const fp = input.flavor_profile;
    if (fp === null) {
      fields.brew.flavor_profile = null;
    } else if (typeof fp !== 'object' || Array.isArray(fp)) {
      errors.push('flavor_profile must be an object.');
    } else {
      const extra = Object.keys(fp).filter((k) => !PROFILE_KEYS.includes(k as keyof FlavorProfile));
      if (extra.length) errors.push(`Unknown flavor_profile key(s): ${extra.join(', ')}.`);
      const scores = PROFILE_KEYS.map((k) => [k, toHalfStepScore((fp as Record<string, unknown>)[k])] as const);
      const bad = scores.filter(([, v]) => v === undefined).map(([k]) => k);
      if (bad.length) {
        errors.push(`flavor_profile needs all of ${PROFILE_KEYS.join(', ')} scored 1–5; invalid: ${bad.join(', ')}.`);
      } else {
        fields.brew.flavor_profile = Object.fromEntries(scores);
      }
    }
  }

  if (has('created_at')) {
    const v = input.created_at;
    const d = typeof v === 'string' ? new Date(v) : null;
    if (v === null) fields.brew.created_at = null;
    else if (!d || Number.isNaN(d.getTime())) errors.push('created_at must be an ISO 8601 date-time.');
    else if (d.getTime() > Date.now() + 5 * 60_000) errors.push('created_at cannot be in the future.');
    else fields.brew.created_at = d.toISOString();
  }

  if (fields.coffeeId !== undefined && Object.keys(fields.coffee).length) {
    errors.push('Send coffee_id or the coffee details (coffee_name, roaster, ...), not both.');
  }
  return fields;
}

function asObject(body: unknown): Record<string, unknown> | null {
  return typeof body === 'object' && body !== null && !Array.isArray(body) ? body as Record<string, unknown> : null;
}

/** Leaves out null values: on a create, a detail sent as null is the same as one not sent. */
const given = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null));

export function parseBrewInput(body: unknown): Result<BrewApiInput> {
  const input = asObject(body);
  if (!input) return { ok: false, errors: ['Body must be a JSON object.'] };
  const errors: string[] = [];
  const fields = validate(input, errors);

  if (!fields.coffeeId && !fields.coffee.name) errors.push('coffee_id or coffee_name is required.');
  if (!fields.brew.brew_method && !errors.some((e) => e.startsWith('brew_method'))) {
    errors.push(`brew_method must be one of: ${BREW_METHODS.join(', ')}.`);
  }
  if (errors.length) return { ok: false, errors };

  const brew = {
    grind_size: null, flavor_notes: null, general_notes: null,
    water_temp_c: null, dose_g: null, yield_g: null, brew_time_s: null,
    rating: null, flavor_profile: null,
    ...given(fields.brew),
  } as BrewApiFields;
  const coffee: CoffeeRef = fields.coffeeId
    ? { id: fields.coffeeId as string }
    : { details: given(fields.coffee) as CoffeeDetails };
  return { ok: true, value: { brew, coffee } };
}

/** Validation for partial updates (PATCH): only the fields sent change, and null clears one. */
export function parseBrewPatch(body: unknown): Result<BrewPatch> {
  const input = asObject(body);
  if (!input) return { ok: false, errors: ['Body must be a JSON object.'] };
  const errors: string[] = [];
  const fields = validate(input, errors);

  for (const [present, field] of [
    [input.coffee_id === null, 'coffee_id'],
    [input.coffee_name === null || ('name' in fields.coffee && fields.coffee.name === null), 'coffee_name'],
    [input.brew_method === null, 'brew_method'],
    [input.created_at === null, 'created_at'],
  ] as const) {
    if (present) errors.push(`${field} can't be cleared.`);
  }
  if (errors.length) return { ok: false, errors };

  const value: BrewPatch = { brew: fields.brew as Partial<BrewApiFields> };
  if (fields.coffeeId) value.coffee = { id: fields.coffeeId as string };
  else if (Object.keys(fields.coffee).length) value.coffee = { details: fields.coffee as CoffeeDetails };
  return { ok: true, value };
}
