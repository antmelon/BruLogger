import { avgFlavorProfile, brewStats, countBy } from '../lib/analytics';
import { Brew, FlavorProfile } from '../types';
import { BASE_BREW } from './fixtures';

describe('countBy', () => {
  it('counts items and sorts by frequency descending', () => {
    const result = countBy(['Pour Over', 'Espresso', 'Pour Over', 'French Press', 'Pour Over']);
    expect(result).toEqual([
      { label: 'Pour Over', value: 3 },
      { label: 'Espresso', value: 1 },
      { label: 'French Press', value: 1 },
    ]);
  });

  it('returns empty array for empty input', () => {
    expect(countBy([])).toEqual([]);
  });

  it('handles a single item', () => {
    expect(countBy(['Espresso'])).toEqual([{ label: 'Espresso', value: 1 }]);
  });

  it('counts each unique value correctly', () => {
    const result = countBy(['a', 'b', 'a', 'c', 'b', 'a']);
    expect(result[0]).toEqual({ label: 'a', value: 3 });
    expect(result[1]).toEqual({ label: 'b', value: 2 });
    expect(result[2]).toEqual({ label: 'c', value: 1 });
  });
});

describe('avgFlavorProfile', () => {
  it('returns null when no brews have a flavor profile', () => {
    const brews: Brew[] = [BASE_BREW, { ...BASE_BREW, id: '2' }];
    expect(avgFlavorProfile(brews)).toBeNull();
  });

  it('returns null for empty array', () => {
    expect(avgFlavorProfile([])).toBeNull();
  });

  it('returns the profile itself when only one brew has a profile', () => {
    const profile: FlavorProfile = { aromatics: 4, acidity: 3, sweetness: 5, aftertaste: 2, body: 4 };
    const brews: Brew[] = [{ ...BASE_BREW, flavor_profile: profile }];
    expect(avgFlavorProfile(brews)).toEqual(profile);
  });

  it('averages across multiple profiles correctly', () => {
    const brews: Brew[] = [
      { ...BASE_BREW, id: '1', flavor_profile: { aromatics: 4, acidity: 2, sweetness: 4, aftertaste: 2, body: 4 } },
      { ...BASE_BREW, id: '2', flavor_profile: { aromatics: 2, acidity: 4, sweetness: 2, aftertaste: 4, body: 2 } },
    ];
    const result = avgFlavorProfile(brews);
    expect(result).toEqual({ aromatics: 3, acidity: 3, sweetness: 3, aftertaste: 3, body: 3 });
  });

  it('ignores brews without a flavor profile', () => {
    const profile: FlavorProfile = { aromatics: 5, acidity: 5, sweetness: 5, aftertaste: 5, body: 5 };
    const brews: Brew[] = [
      BASE_BREW,
      { ...BASE_BREW, id: '2', flavor_profile: profile },
    ];
    expect(avgFlavorProfile(brews)).toEqual(profile);
  });

  it('produces fractional averages', () => {
    const brews: Brew[] = [
      { ...BASE_BREW, id: '1', flavor_profile: { aromatics: 3, acidity: 3, sweetness: 3, aftertaste: 3, body: 3 } },
      { ...BASE_BREW, id: '2', flavor_profile: { aromatics: 4, acidity: 4, sweetness: 4, aftertaste: 4, body: 4 } },
      { ...BASE_BREW, id: '3', flavor_profile: { aromatics: 5, acidity: 5, sweetness: 5, aftertaste: 5, body: 5 } },
    ];
    const result = avgFlavorProfile(brews);
    expect(result?.aromatics).toBeCloseTo(4);
    expect(result?.body).toBeCloseTo(4);
  });
});

describe('brewStats', () => {
  it('averages the rating over rated brews only', () => {
    const brews: Brew[] = [
      { ...BASE_BREW, id: '1', rating: 4 },
      { ...BASE_BREW, id: '2', rating: 3.5 },
      { ...BASE_BREW, id: '3', rating: null },
    ];
    const stats = brewStats(brews);
    expect(stats.total).toBe(3);
    expect(stats.avgRating).toBe(3.75);
  });

  it('picks the most-logged method and origin, ignoring brews without an origin', () => {
    const brews: Brew[] = [
      { ...BASE_BREW, id: '1', brew_method: 'Espresso', origin: 'Kenya' },
      { ...BASE_BREW, id: '2', brew_method: 'Pour Over', origin: null },
      { ...BASE_BREW, id: '3', brew_method: 'Pour Over', origin: null },
      { ...BASE_BREW, id: '4', brew_method: 'Espresso', origin: 'Ethiopia' },
      { ...BASE_BREW, id: '5', brew_method: 'Pour Over', origin: 'Ethiopia' },
    ];
    const stats = brewStats(brews);
    expect(stats.topMethod).toBe('Pour Over');
    expect(stats.topOrigin).toBe('Ethiopia');
  });
});
