import {
  coffeeStats, daysAgo, daysSinceRoast, formatRoastDate, groupCoffees, pickerCoffees,
} from '../lib/coffeeStats';
import { Brew, Coffee } from '../types';
import { BASE_BREW, BASE_COFFEE } from './fixtures';

const coffee = (details: Partial<Coffee>): Coffee => ({ ...BASE_COFFEE, ...details });
const brewOf = (c: Coffee, details: Partial<Brew>): Brew => ({ ...BASE_BREW, coffee_id: c.id, coffee: c, ...details });

// Local times, as the phone sees them
const at = (y: number, m: number, d: number, h = 9) => new Date(y, m - 1, d, h);

describe('daysSinceRoast', () => {
  it('counts calendar days from the roast date, whatever the time of day', () => {
    expect(daysSinceRoast('2026-10-05', at(2026, 10, 12, 0))).toBe(7);
    expect(daysSinceRoast('2026-10-05', at(2026, 10, 12, 23))).toBe(7);
    expect(daysSinceRoast('2026-10-05', at(2026, 10, 5))).toBe(0);
  });

  it('takes a brew time as an ISO string', () => {
    expect(daysSinceRoast('2026-10-05', at(2026, 10, 9).toISOString())).toBe(4);
  });

  it('is not thrown off by a daylight saving change', () => {
    expect(daysSinceRoast('2026-10-25', at(2026, 11, 8))).toBe(14);
    expect(daysSinceRoast('2026-03-01', at(2026, 3, 15))).toBe(14);
  });

  it('is null without a roast date', () => {
    expect(daysSinceRoast(null, at(2026, 10, 12))).toBeNull();
  });
});

describe('daysAgo', () => {
  it('says how long ago in words', () => {
    expect(daysAgo(0)).toBe('today');
    expect(daysAgo(1)).toBe('1 day ago');
    expect(daysAgo(12)).toBe('12 days ago');
  });
});

describe('formatRoastDate', () => {
  it('writes the date out', () => {
    expect(formatRoastDate('2026-10-05')).toBe('Oct 5, 2026');
  });
});

describe('coffeeStats', () => {
  const kenya = coffee({ id: 'kenya', bag_size_g: 250 });
  const other = coffee({ id: 'other' });

  it("counts the coffee's brews and averages their ratings", () => {
    const brews = [
      brewOf(kenya, { id: '1', rating: 4, created_at: '2026-10-01T08:00:00Z' }),
      brewOf(kenya, { id: '2', rating: null, created_at: '2026-10-03T08:00:00Z' }),
      brewOf(kenya, { id: '3', rating: 3, created_at: '2026-10-02T08:00:00Z' }),
      brewOf(other, { id: '4', rating: 1, created_at: '2026-10-04T08:00:00Z' }),
    ];
    expect(coffeeStats(kenya, brews)).toEqual(expect.objectContaining({
      brewCount: 3, avgRating: 3.5, lastBrewedAt: '2026-10-03T08:00:00Z',
    }));
  });

  it('has no average or last brew before the first brew', () => {
    expect(coffeeStats(kenya, [])).toEqual(expect.objectContaining({
      brewCount: 0, avgRating: null, lastBrewedAt: null, gramsUsed: 0, gramsLeft: 250, runningLow: false,
    }));
  });

  it('works out what is left from the bag size and the doses logged', () => {
    const brews = [
      brewOf(kenya, { id: '1', dose_g: 18 }),
      brewOf(kenya, { id: '2', dose_g: null }),
      brewOf(kenya, { id: '3', dose_g: 15.5 }),
    ];
    expect(coffeeStats(kenya, brews)).toEqual(expect.objectContaining({ gramsUsed: 33.5, gramsLeft: 216.5 }));
  });

  it('never goes below empty, and knows nothing about what is left without a bag size', () => {
    const big = [brewOf(kenya, { dose_g: 300 })];
    expect(coffeeStats(kenya, big)).toEqual(expect.objectContaining({ gramsLeft: 0, runningLow: true }));
    expect(coffeeStats(other, [brewOf(other, { dose_g: 18 })])).toEqual(expect.objectContaining({
      gramsUsed: 18, gramsLeft: null, runningLow: false,
    }));
  });

  it('is running low with two average doses or less left', () => {
    const doses = (...gs: number[]) => gs.map((g, i) => brewOf(kenya, { id: String(i), dose_g: g }));
    // 250 - 216 = 34 left, average dose 18: less than two brews
    expect(coffeeStats(kenya, doses(...Array(12).fill(18))).runningLow).toBe(true);
    // 250 - 196 = 54 left, average dose 19.6: still three brews
    expect(coffeeStats(kenya, doses(20, 20, 20, 20, 20, 20, 20, 20, 20, 16)).runningLow).toBe(false);
  });
});

describe('groupCoffees', () => {
  it('lists coffees in use by when they were last used, and finished ones by when they were finished', () => {
    const a = coffee({ id: 'a', created_at: '2026-09-01T00:00:00Z' });
    const b = coffee({ id: 'b', created_at: '2026-10-10T00:00:00Z' }); // added, not brewed yet
    const c = coffee({ id: 'c', created_at: '2026-09-15T00:00:00Z' });
    const f1 = coffee({ id: 'f1', finished_at: '2026-10-01T00:00:00Z' });
    const f2 = coffee({ id: 'f2', finished_at: '2026-10-05T00:00:00Z' });
    const brews = [
      brewOf(a, { created_at: '2026-10-11T00:00:00Z' }),
      brewOf(c, { created_at: '2026-10-02T00:00:00Z' }),
    ];
    const { open, finished } = groupCoffees([a, b, c, f1, f2], brews);
    expect(open.map((x) => x.id)).toEqual(['a', 'b', 'c']);
    expect(finished.map((x) => x.id)).toEqual(['f2', 'f1']);
  });
});

describe('pickerCoffees', () => {
  const a = coffee({ id: 'a', created_at: '2026-09-01T00:00:00Z' });
  const b = coffee({ id: 'b', created_at: '2026-09-02T00:00:00Z' });
  const done = coffee({ id: 'done', finished_at: '2026-10-01T00:00:00Z' });
  const brews = [brewOf(b, { created_at: '2026-10-11T00:00:00Z' }), brewOf(a, { created_at: '2026-10-01T00:00:00Z' })];

  it('offers the coffees in use, the most recently used first, which is the one a new brew starts with', () => {
    expect(pickerCoffees([a, b, done], brews).map((x) => x.id)).toEqual(['b', 'a']);
  });

  it("keeps a finished coffee in the list when it's the brew's own", () => {
    expect(pickerCoffees([a, b, done], brews, 'done').map((x) => x.id)).toEqual(['done', 'b', 'a']);
    expect(pickerCoffees([a, b, done], brews, 'a').map((x) => x.id)).toEqual(['b', 'a']);
  });
});
