import { BrewInsert, BrewMethod, FlavorProfile, RoastLevel } from '../types';

/**
 * Parses an optional numeric text field.
 * Returns null for blank input, a number for valid input (comma decimals accepted),
 * or undefined when the input is not a valid number.
 */
export function parseNumberField(text: string, { integer = false } = {}): number | null | undefined {
  const trimmed = text.trim().replace(',', '.');
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return integer ? Math.round(n) : n;
}

/** Brew form fields as the user typed them. Numbers stay text until submit. */
export interface BrewFormValues {
  coffeeName: string;
  roaster: string;
  origin: string;
  roastLevel: RoastLevel | null;
  varietal: string;
  processingMethod: string;
  brewMethod: BrewMethod | null;
  grindSize: string;
  waterTemp: string;
  dose: string;
  yieldG: string;
  brewTime: string;
  flavorNotes: string;
  generalNotes: string;
  rating: number; // 0 = unrated
  profile: FlavorProfile | null; // null = not scored
  photoUrl: string | null;
}

export type BrewFormResult = { ok: true; value: BrewInsert } | { ok: false; error: string };

const optionalText = (s: string) => s.trim() || null;

/** Builds the save payload. Blank fields become null (not undefined) so clearing one on edit persists. */
export function toBrewInsert(v: BrewFormValues): BrewFormResult {
  if (!v.coffeeName.trim()) return { ok: false, error: 'Coffee name is required.' };
  if (!v.brewMethod) return { ok: false, error: 'Please select a brew method.' };

  const numbers = {
    water_temp_c: parseNumberField(v.waterTemp),
    dose_g: parseNumberField(v.dose),
    yield_g: parseNumberField(v.yieldG),
    brew_time_s: parseNumberField(v.brewTime, { integer: true }),
  };
  if (Object.values(numbers).some((n) => n === undefined)) {
    return { ok: false, error: 'Water temp, dose, yield, and brew time must be numbers.' };
  }

  return {
    ok: true,
    value: {
      coffee_name: v.coffeeName.trim(),
      roaster: optionalText(v.roaster),
      origin: optionalText(v.origin),
      roast_level: v.roastLevel,
      varietal: optionalText(v.varietal),
      processing_method: optionalText(v.processingMethod),
      brew_method: v.brewMethod,
      grind_size: optionalText(v.grindSize),
      water_temp_c: numbers.water_temp_c ?? null,
      dose_g: numbers.dose_g ?? null,
      yield_g: numbers.yield_g ?? null,
      brew_time_s: numbers.brew_time_s ?? null,
      flavor_notes: optionalText(v.flavorNotes),
      general_notes: optionalText(v.generalNotes),
      rating: v.rating || null,
      flavor_profile: v.profile,
      photo_url: v.photoUrl,
    },
  };
}
