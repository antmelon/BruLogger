import { ROAST_LEVELS, RoastLevel } from '../types';
import { CoffeeFormValues } from './form';
import { formatRoastDate } from './coffeeStats';

// Snap the bag: what the model read off a coffee bag (server/bagScan.ts asks for it), turned into
// the coffee form's fields. The model copies the bag; the checks and conversions happen here.

/** What the model reads off the photo. Every field is null when the bag doesn't show it. */
export interface BagScan {
  is_coffee_bag: boolean;
  name: string | null;
  roaster: string | null;
  origin: string | null;
  roast_level: RoastLevel | null;
  varietal: string | null;
  process: string | null;
  tasting_notes: string | null;
  /** YYYY-MM-DD */
  roast_date: string | null;
  /** As printed: "12 oz", "250 g" */
  bag_size: string | null;
}

const GRAMS_PER: Record<string, number> = {
  g: 1, gr: 1, gram: 1, grams: 1, kg: 1000, kgs: 1000, oz: 28.3495, ozs: 28.3495, lb: 453.592, lbs: 453.592,
};

// The smallest and largest bags worth believing: a sample pack to a 5 lb bag, with room either side
const MIN_BAG_G = 30;
const MAX_BAG_G = 5000;

/** Grams in a bag from its printed weight ("12 oz", "250 g", "1 kg"), or null. The first weight wins. */
export function parseBagSize(text: string | null): number | null {
  const match = text?.toLowerCase().match(/(\d+(?:[.,]\d+)?)\s*(kgs?|grams?|gr|g|ozs?|lbs?)\b/);
  if (!match) return null;
  const grams = Math.round(Number(match[1].replace(',', '.')) * GRAMS_PER[match[2]]);
  return grams >= MIN_BAG_G && grams <= MAX_BAG_G ? grams : null;
}

const MAX_ROAST_AGE_DAYS = 730;

/** A YYYY-MM-DD roast date that exists, isn't after `today` and isn't years old, else null. */
function roastDate(iso: string | null, today: Date): string | null {
  const m = iso?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  if (date.getMonth() !== mo - 1 || date.getDate() !== d) return null; // no Feb 30
  const day = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const ageDays = Math.round((day.getTime() - date.getTime()) / 86_400_000);
  return ageDays >= 0 && ageDays <= MAX_ROAST_AGE_DAYS ? iso! : null;
}

const text = (s: string | null) => s?.replace(/\s+/g, ' ').trim() || null;

/**
 * The coffee form fields a scan fills in. Only what the bag showed is included, so filling the
 * form with it keeps anything the person typed in the other fields.
 */
export function scanToCoffeeFields(scan: BagScan, today = new Date()): Partial<CoffeeFormValues> {
  const fields: Partial<CoffeeFormValues> = {};
  const set = <K extends keyof CoffeeFormValues>(key: K, value: CoffeeFormValues[K] | null) => {
    if (value !== null) fields[key] = value;
  };
  set('name', text(scan.name));
  set('roaster', text(scan.roaster));
  set('origin', text(scan.origin));
  set('roastLevel', scan.roast_level && ROAST_LEVELS.includes(scan.roast_level) ? scan.roast_level : null);
  set('varietal', text(scan.varietal));
  set('processingMethod', text(scan.process));
  set('roasterNotes', text(scan.tasting_notes));
  const roasted = roastDate(scan.roast_date, today);
  set('roastDate', roasted && formatRoastDate(roasted));
  const grams = parseBagSize(scan.bag_size);
  set('bagSize', grams === null ? null : String(grams));
  return fields;
}
