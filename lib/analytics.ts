import { Brew, FlavorProfile } from '../types';

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
