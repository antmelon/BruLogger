import { Coffee } from '../types';
import type { CoffeeDetails } from './brewInput';

// How the HTTP API turns coffee details sent with a brew into one of the user's coffees
// (server/coffees.ts): the Telegram bot names coffees, it doesn't know their ids.

const norm = (s: string | null | undefined) => (s ?? '').trim().toLowerCase();
const time = (iso: string) => new Date(iso).getTime();

/**
 * The user's coffee that the details describe: same name and roaster, ignoring case and spaces.
 * A different roast date means a different bag. Prefers the same roast date, then a bag still
 * in use, then the newest.
 */
export function matchCoffee(coffees: Coffee[], details: CoffeeDetails): Coffee | null {
  const date = details.roast_date ?? null;
  const candidates = coffees.filter((c) =>
    norm(c.name) === norm(details.name)
    && norm(c.roaster) === norm(details.roaster)
    && (!date || !c.roast_date || c.roast_date === date));
  const rank = (c: Coffee) => [date && c.roast_date === date ? 0 : 1, c.finished_at ? 1 : 0, -time(c.created_at)];
  candidates.sort((a, b) => {
    const [ra, rb] = [rank(a), rank(b)];
    return ra[0] - rb[0] || ra[1] - rb[1] || ra[2] - rb[2];
  });
  return candidates[0] ?? null;
}

/** The details to fill in on a matched coffee: only what it doesn't have yet, never a change. */
export function missingDetails(coffee: Coffee, details: CoffeeDetails): Partial<Coffee> {
  const fill: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(details)) {
    if (key === 'name' || key === 'roaster' || value == null) continue;
    if (coffee[key as keyof Coffee] == null) fill[key] = value;
  }
  return fill as Partial<Coffee>;
}
