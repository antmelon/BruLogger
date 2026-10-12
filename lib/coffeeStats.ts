import { Brew, Coffee } from '../types';

// Coffees (bags) in numbers: days since roast, what's left, stats per coffee, and the order the
// lists offer them in. Computed client-side from the brews list, which holds every brew.

const DAY_MS = 86_400_000;

/** A roast date ('YYYY-MM-DD', a calendar date without a time zone) as local midnight. */
function localDate(roastDate: string): Date {
  const [y, m, d] = roastDate.split('-').map(Number);
  return new Date(y, m - 1, d);
}

const time = (iso: string) => new Date(iso).getTime();

/** Calendar days from the roast date to `at` (now, or when a brew was made), in local time. */
export function daysSinceRoast(roastDate: string | null, at: Date | string = new Date()): number | null {
  if (!roastDate) return null;
  const when = new Date(at);
  const day = new Date(when.getFullYear(), when.getMonth(), when.getDate());
  // Rounded, since a day across a daylight saving change is 23 or 25 hours
  return Math.round((day.getTime() - localDate(roastDate).getTime()) / DAY_MS);
}

/** A number of days in words: "today", "1 day ago", "12 days ago". */
export function daysAgo(days: number): string {
  if (days === 0) return 'today';
  return `${days} ${days === 1 ? 'day' : 'days'} ago`;
}

/** e.g. "Oct 5, 2026". parseRoastDate (lib/form.ts) reads it back. */
export function formatRoastDate(roastDate: string): string {
  return localDate(roastDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export interface CoffeeStats {
  brewCount: number;
  avgRating: number | null;
  lastBrewedAt: string | null;
  /** The doses logged for it, so brews without a dose count as nothing. */
  gramsUsed: number;
  /** null without a bag size */
  gramsLeft: number | null;
  /** Two average doses or less left */
  runningLow: boolean;
}

export function coffeeStats(coffee: Coffee, brews: Brew[]): CoffeeStats {
  const own = brews.filter((b) => b.coffee_id === coffee.id);
  const ratings = own.map((b) => b.rating).filter((r): r is number => r != null);
  const doses = own.map((b) => b.dose_g).filter((g): g is number => g != null);
  const gramsUsed = doses.reduce((sum, g) => sum + g, 0);
  const gramsLeft = coffee.bag_size_g != null ? Math.max(0, coffee.bag_size_g - gramsUsed) : null;
  const avgDose = doses.length ? gramsUsed / doses.length : null;
  const lastBrewedAt = own.reduce<string | null>(
    (latest, b) => (latest && time(latest) >= time(b.created_at) ? latest : b.created_at),
    null,
  );
  return {
    brewCount: own.length,
    avgRating: ratings.length ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : null,
    lastBrewedAt,
    gramsUsed,
    gramsLeft,
    runningLow: gramsLeft != null && avgDose != null && gramsLeft <= 2 * avgDose,
  };
}

/** Newest first by when each coffee was last brewed, or added if that's later. */
function byLastUsed(coffees: Coffee[], brews: Brew[]): Coffee[] {
  const lastBrew = new Map<string, number>();
  for (const b of brews) lastBrew.set(b.coffee_id, Math.max(lastBrew.get(b.coffee_id) ?? 0, time(b.created_at)));
  const lastUsed = (c: Coffee) => Math.max(time(c.created_at), lastBrew.get(c.id) ?? 0);
  return [...coffees].sort((a, b) => lastUsed(b) - lastUsed(a));
}

/** The Coffees tab: bags in use, the most recently used first, then finished ones, latest first. */
export function groupCoffees(coffees: Coffee[], brews: Brew[]): { open: Coffee[]; finished: Coffee[] } {
  const finished = coffees
    .filter((c) => c.finished_at)
    .sort((a, b) => time(b.finished_at!) - time(a.finished_at!));
  return { open: byLastUsed(coffees.filter((c) => !c.finished_at), brews), finished };
}

/**
 * The brew form's choice of coffee: the bags in use, the most recently used first (a new brew
 * starts with that one). Editing a brew of a finished coffee keeps that coffee at the top.
 */
export function pickerCoffees(coffees: Coffee[], brews: Brew[], currentId?: string | null): Coffee[] {
  const open = byLastUsed(coffees.filter((c) => !c.finished_at), brews);
  const current = coffees.find((c) => c.id === currentId);
  return current?.finished_at ? [current, ...open] : open;
}
