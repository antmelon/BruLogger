import { BREW_METHODS, ROAST_LEVELS, BrewInsert, FlavorProfile } from '../types';
import { parseNumberField } from './form';

// Validation for brews created through the HTTP API (api/brews.ts). Lenient where an
// agent is likely to vary (case of enum values, numbers sent as strings), strict about
// unknown keys so a typo like "dose" instead of "dose_g" fails loudly instead of being dropped.

export type BrewApiInput = BrewInsert & { created_at?: string };

type Result = { ok: true; value: BrewApiInput } | { ok: false; errors: string[] };

const TEXT_FIELDS = [
  'roaster', 'origin', 'varietal', 'processing_method', 'grind_size', 'flavor_notes', 'general_notes',
] as const;
const NUMBER_FIELDS = ['water_temp_c', 'dose_g', 'yield_g'] as const;
const PROFILE_KEYS: (keyof FlavorProfile)[] = ['aromatics', 'acidity', 'sweetness', 'aftertaste', 'body'];

export const ALLOWED_FIELDS = [
  'coffee_name', 'brew_method', 'roast_level', ...TEXT_FIELDS, ...NUMBER_FIELDS,
  'brew_time_s', 'rating', 'flavor_profile', 'created_at',
];

const MAX_TEXT = 2000;

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

export function parseBrewInput(body: unknown): Result {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, errors: ['Body must be a JSON object.'] };
  }
  const input = body as Record<string, unknown>;
  const errors: string[] = [];

  const unknown = Object.keys(input).filter((k) => !ALLOWED_FIELDS.includes(k));
  if (unknown.length) {
    errors.push(`Unknown field(s): ${unknown.join(', ')}. Allowed: ${ALLOWED_FIELDS.join(', ')}.`);
  }

  const coffeeName = typeof input.coffee_name === 'string' ? input.coffee_name.trim() : '';
  if (!coffeeName) errors.push('coffee_name is required.');

  const brewMethod = matchEnum(input.brew_method, BREW_METHODS);
  if (!brewMethod) errors.push(`brew_method must be one of: ${BREW_METHODS.join(', ')}.`);

  let roastLevel: BrewInsert['roast_level'] = null;
  if (input.roast_level != null && input.roast_level !== '') {
    roastLevel = matchEnum(input.roast_level, ROAST_LEVELS) ?? null;
    if (!roastLevel) errors.push(`roast_level must be one of: ${ROAST_LEVELS.join(', ')}.`);
  }

  const text: Partial<Record<(typeof TEXT_FIELDS)[number], string | null>> = {};
  for (const field of [...TEXT_FIELDS, 'coffee_name'] as const) {
    const v = input[field];
    if (v != null && typeof v !== 'string') errors.push(`${field} must be a string.`);
    else if (typeof v === 'string' && v.length > MAX_TEXT) errors.push(`${field} is too long.`);
    if (field !== 'coffee_name') text[field] = typeof v === 'string' ? v.trim() || null : null;
  }

  const numbers: Partial<Record<(typeof NUMBER_FIELDS)[number] | 'brew_time_s', number | null>> = {};
  for (const field of [...NUMBER_FIELDS, 'brew_time_s'] as const) {
    const n = toNumber(input[field], field === 'brew_time_s');
    if (n === undefined) errors.push(`${field} must be a non-negative number.`);
    else numbers[field] = n;
  }

  let rating: number | null = null;
  if (input.rating != null) {
    rating = toHalfStepScore(input.rating) ?? null;
    if (rating === null) errors.push('rating must be between 1 and 5 (half steps allowed).');
  }

  let flavorProfile: FlavorProfile | null = null;
  if (input.flavor_profile != null) {
    const fp = input.flavor_profile as Record<string, unknown>;
    if (typeof fp !== 'object' || Array.isArray(fp)) {
      errors.push('flavor_profile must be an object.');
    } else {
      const extra = Object.keys(fp).filter((k) => !PROFILE_KEYS.includes(k as keyof FlavorProfile));
      if (extra.length) errors.push(`Unknown flavor_profile key(s): ${extra.join(', ')}.`);
      const scores = PROFILE_KEYS.map((k) => [k, toHalfStepScore(fp[k])] as const);
      const bad = scores.filter(([, v]) => v === undefined).map(([k]) => k);
      if (bad.length) {
        errors.push(`flavor_profile needs all of ${PROFILE_KEYS.join(', ')} scored 1–5; invalid: ${bad.join(', ')}.`);
      } else {
        flavorProfile = Object.fromEntries(scores) as unknown as FlavorProfile;
      }
    }
  }

  let createdAt: string | undefined;
  if (input.created_at != null) {
    const d = typeof input.created_at === 'string' ? new Date(input.created_at) : null;
    if (!d || Number.isNaN(d.getTime())) errors.push('created_at must be an ISO 8601 date-time.');
    else if (d.getTime() > Date.now() + 5 * 60_000) errors.push('created_at cannot be in the future.');
    else createdAt = d.toISOString();
  }

  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    value: {
      coffee_name: coffeeName,
      brew_method: brewMethod!,
      roast_level: roastLevel,
      ...text,
      ...numbers,
      rating,
      flavor_profile: flavorProfile,
      ...(createdAt ? { created_at: createdAt } : {}),
    },
  };
}
