import { matchCoffee, missingDetails } from '../lib/coffeeMatch';
import { Coffee } from '../types';
import { BASE_COFFEE } from './fixtures';

const coffee = (details: Partial<Coffee>): Coffee => ({ ...BASE_COFFEE, ...details });

describe('matchCoffee', () => {
  const guji = coffee({ id: 'guji', name: 'Guji Hambela', roaster: 'Onyx', created_at: '2026-09-01T00:00:00Z' });

  it('finds the coffee with the same name and roaster, ignoring case and spaces', () => {
    expect(matchCoffee([guji], { name: ' guji hambela ', roaster: 'ONYX' })).toBe(guji);
    expect(matchCoffee([guji], { name: 'Guji Hambela', roaster: 'Sey' })).toBeNull();
    expect(matchCoffee([guji], { name: 'Guji Hambela' })).toBeNull();
    const noRoaster = coffee({ id: 'x', name: 'House Blend' });
    expect(matchCoffee([noRoaster], { name: 'house blend', roaster: null })).toBe(noRoaster);
  });

  it('prefers a bag still in use, then the newest', () => {
    const finished = coffee({ ...guji, id: 'old', created_at: '2026-10-01T00:00:00Z', finished_at: '2026-10-05T00:00:00Z' });
    const newer = coffee({ ...guji, id: 'newer', created_at: '2026-09-20T00:00:00Z' });
    expect(matchCoffee([guji, finished, newer], { name: 'Guji Hambela', roaster: 'Onyx' })?.id).toBe('newer');
    expect(matchCoffee([finished], { name: 'Guji Hambela', roaster: 'Onyx' })?.id).toBe('old');
  });

  it('treats a different roast date as a different bag', () => {
    const dated = coffee({ ...guji, roast_date: '2026-09-01' });
    expect(matchCoffee([dated], { name: 'Guji Hambela', roaster: 'Onyx', roast_date: '2026-10-05' })).toBeNull();
    expect(matchCoffee([dated], { name: 'Guji Hambela', roaster: 'Onyx', roast_date: '2026-09-01' })).toBe(dated);
    expect(matchCoffee([guji], { name: 'Guji Hambela', roaster: 'Onyx', roast_date: '2026-10-05' })).toBe(guji);
    const undated = coffee({ ...guji, id: 'undated', created_at: '2026-10-10T00:00:00Z' });
    expect(matchCoffee([undated, dated], { name: 'Guji Hambela', roaster: 'Onyx', roast_date: '2026-09-01' })).toBe(dated);
  });
});

describe('missingDetails', () => {
  it("fills in only what the coffee doesn't have yet", () => {
    const c = coffee({ name: 'Guji', origin: 'Ethiopia', roast_level: null, bag_size_g: null });
    expect(missingDetails(c, { name: 'guji', origin: 'Kenya', roast_level: 'Light', bag_size_g: 340, varietal: null }))
      .toEqual({ roast_level: 'Light', bag_size_g: 340 });
    expect(missingDetails(c, { name: 'Guji', origin: 'Kenya' })).toEqual({});
  });
});
