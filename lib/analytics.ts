import { Brew, BrewMethod, FlavorProfile } from '../types';

export function avgFlavorProfile(brews: Brew[]): FlavorProfile | null {
  const withProfile = brews.filter(
    (b): b is Brew & { flavor_profile: FlavorProfile } => !!b.flavor_profile,
  );
  if (withProfile.length === 0) return null;
  const sum = withProfile.reduce(
    (acc, b) => ({
      aromatics: acc.aromatics + b.flavor_profile.aromatics,
      acidity: acc.acidity + b.flavor_profile.acidity,
      sweetness: acc.sweetness + b.flavor_profile.sweetness,
      aftertaste: acc.aftertaste + b.flavor_profile.aftertaste,
      body: acc.body + b.flavor_profile.body,
    }),
    { aromatics: 0, acidity: 0, sweetness: 0, aftertaste: 0, body: 0 },
  );
  const n = withProfile.length;
  return {
    aromatics: sum.aromatics / n,
    acidity: sum.acidity / n,
    sweetness: sum.sweetness / n,
    aftertaste: sum.aftertaste / n,
    body: sum.body / n,
  };
}

export function countBy<T extends string>(items: T[]): { label: T; value: number }[] {
  const counts: Record<string, number> = {};
  for (const item of items) counts[item] = (counts[item] ?? 0) + 1;
  return Object.entries(counts)
    .map(([label, value]) => ({ label: label as T, value }))
    .sort((a, b) => b.value - a.value);
}

export interface BrewStats {
  total: number;
  avgRating: number | null;
  topMethod: BrewMethod | null;
  topOrigin: string | null;
}

export function brewStats(brews: Brew[]): BrewStats {
  const ratings = brews.map((b) => b.rating).filter((r): r is number => r != null);
  const avgRating = ratings.length ? ratings.reduce((s, r) => s + r, 0) / ratings.length : null;
  const topMethod = countBy(brews.map((b) => b.brew_method))[0]?.label ?? null;
  const origins = brews.map((b) => b.origin).filter((o): o is string => !!o);
  const topOrigin = countBy(origins)[0]?.label ?? null;
  return { total: brews.length, avgRating, topMethod, topOrigin };
}
