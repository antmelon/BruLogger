import { Brew, BrewInsert, BrewMethod, Coffee, CoffeeInsert, FlavorProfile, RoastLevel } from '../types';
import { formatRoastDate } from './coffeeStats';

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

/** Brew form fields as the user typed them. Numbers stay text until submit. The coffee is chosen separately. */
export interface BrewFormValues {
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
  photoPath: string | null; // the saved photo's storage path, if it is kept
}

/** A brew's own fields: everything but which coffee it was. */
export type BrewFields = Omit<BrewInsert, 'coffee_id'>;

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

const optionalText = (s: string) => s.trim() || null;

/** Builds the save payload. Blank fields become null (not undefined) so clearing one on edit persists. */
export function toBrewFields(v: BrewFormValues): Result<BrewFields> {
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
      photo_path: v.photoPath,
    },
  };
}

/**
 * A new brew's starting values from a past one (Brew Again): its coffee, method and recipe, and
 * nothing about how it tasted. A finished coffee isn't carried over, since that bag is used up, so
 * the form starts with its usual choice instead.
 */
export function brewAgainFrom(brew: Brew): Partial<BrewInsert> {
  return {
    ...(brew.coffee.finished_at ? {} : { coffee_id: brew.coffee_id }),
    brew_method: brew.brew_method,
    grind_size: brew.grind_size,
    water_temp_c: brew.water_temp_c,
    dose_g: brew.dose_g,
    yield_g: brew.yield_g,
    brew_time_s: brew.brew_time_s,
  };
}

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

/** 1–12 for a month name or an abbreviation of at least three letters ("Sep", "Sept"). */
function monthNumber(word: string): number | undefined {
  if (word.length < 3) return undefined;
  const i = MONTHS.findIndex((m) => m.startsWith(word));
  return i >= 0 ? i + 1 : undefined;
}

const pad = (n: number) => String(n).padStart(2, '0');
const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/**
 * Reads a roast date as people write it: "2026-10-05", "10/5" or "10/5/26" (US order), "Oct 5",
 * "5 October 2026", "today", "yesterday". Returns 'YYYY-MM-DD', null when blank, or undefined
 * when it isn't a date, doesn't exist, or is in the future. Without a year, it's the latest such
 * date that isn't ahead of `today`.
 */
export function parseRoastDate(text: string, today = new Date()): string | null | undefined {
  const s = text.trim().toLowerCase();
  if (!s) return null;
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (s === 'today') return isoDate(todayDate);
  if (s === 'yesterday') return isoDate(new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate() - 1));

  let year: number | undefined;
  let month: number | undefined;
  let day: number | undefined;
  let m: RegExpMatchArray | null;
  if ((m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/))) {
    [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  } else if ((m = s.match(/^(\d{1,2})[/.](\d{1,2})(?:[/.](\d{2}|\d{4}))?$/))) {
    [month, day] = [Number(m[1]), Number(m[2])];
    year = m[3] ? Number(m[3]) : undefined;
  } else if ((m = s.match(/^([a-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?(?:\s+(\d{4}))?$/))) {
    [month, day] = [monthNumber(m[1]), Number(m[2])];
    year = m[3] ? Number(m[3]) : undefined;
  } else if ((m = s.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)\.?,?(?:\s+(\d{4}))?$/))) {
    [day, month] = [Number(m[1]), monthNumber(m[2])];
    year = m[3] ? Number(m[3]) : undefined;
  }
  if (!month || !day) return undefined;
  if (year !== undefined && year < 100) year += 2000;

  const make = (y: number) => {
    const d = new Date(y, month - 1, day);
    return d.getMonth() === month - 1 && d.getDate() === day ? d : undefined; // no Feb 30
  };
  let date = make(year ?? todayDate.getFullYear());
  if (year === undefined && date && date > todayDate) date = make(todayDate.getFullYear() - 1);
  if (!date || date > todayDate) return undefined;
  return isoDate(date);
}

/** Coffee form fields as the user typed them. */
export interface CoffeeFormValues {
  name: string;
  roaster: string;
  origin: string;
  roastLevel: RoastLevel | null;
  varietal: string;
  processingMethod: string;
  roasterNotes: string;
  roastDate: string;
  bagSize: string;
}

/** The form's starting values: blank for a new coffee, or a saved one's. */
export function coffeeFormValues(coffee: Coffee | null | undefined): CoffeeFormValues {
  return {
    name: coffee?.name ?? '',
    roaster: coffee?.roaster ?? '',
    origin: coffee?.origin ?? '',
    roastLevel: coffee?.roast_level ?? null,
    varietal: coffee?.varietal ?? '',
    processingMethod: coffee?.processing_method ?? '',
    roasterNotes: coffee?.roaster_notes ?? '',
    roastDate: coffee?.roast_date ? formatRoastDate(coffee.roast_date) : '',
    bagSize: coffee?.bag_size_g?.toString() ?? '',
  };
}

/** Builds a coffee's save payload. Blank fields become null so clearing one on edit persists. */
export function toCoffeeInsert(v: CoffeeFormValues, today = new Date()): Result<CoffeeInsert> {
  if (!v.name.trim()) return { ok: false, error: 'Coffee name is required.' };
  const roastDate = parseRoastDate(v.roastDate, today);
  if (roastDate === undefined) {
    return { ok: false, error: 'Roast date should be a date like Oct 5 or 10/5, and not in the future.' };
  }
  const bagSize = parseNumberField(v.bagSize);
  if (bagSize === undefined || bagSize === 0) return { ok: false, error: 'Bag size should be a number of grams.' };

  return {
    ok: true,
    value: {
      name: v.name.trim(),
      roaster: optionalText(v.roaster),
      origin: optionalText(v.origin),
      roast_level: v.roastLevel,
      varietal: optionalText(v.varietal),
      processing_method: optionalText(v.processingMethod),
      roaster_notes: optionalText(v.roasterNotes),
      roast_date: roastDate,
      bag_size_g: bagSize,
    },
  };
}
