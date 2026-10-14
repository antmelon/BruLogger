import {
  brewAgainFrom, BrewFormValues, CoffeeFormValues, coffeeFormValues, parseNumberField, parseRoastDate,
  toBrewFields, toCoffeeInsert,
} from '../lib/form';
import { BASE_BREW, BASE_COFFEE } from './fixtures';

describe('parseNumberField', () => {
  it('returns null for blank input', () => {
    expect(parseNumberField('')).toBeNull();
    expect(parseNumberField('   ')).toBeNull();
  });

  it('parses integers and decimals', () => {
    expect(parseNumberField('18')).toBe(18);
    expect(parseNumberField('18.5')).toBe(18.5);
  });

  it('accepts comma as decimal separator', () => {
    expect(parseNumberField('18,5')).toBe(18.5);
  });

  it('returns undefined for invalid or negative input', () => {
    expect(parseNumberField('abc')).toBeUndefined();
    expect(parseNumberField('12g')).toBeUndefined();
    expect(parseNumberField('-3')).toBeUndefined();
  });

  it('rounds when integer is requested', () => {
    expect(parseNumberField('240.6', { integer: true })).toBe(241);
    expect(parseNumberField('240', { integer: true })).toBe(240);
  });
});

const FORM: BrewFormValues = {
  brewMethod: 'Pour Over', grindSize: '', waterTemp: '', dose: '', yieldG: '', brewTime: '',
  flavorNotes: '', generalNotes: '', rating: 0, profile: null, photoPath: null,
};

describe('toBrewFields', () => {
  it('trims text and sends blank optional fields as null so clearing one on edit persists', () => {
    const result = toBrewFields({ ...FORM, grindSize: ' Medium-fine ', flavorNotes: '   ' });
    expect(result).toEqual({
      ok: true,
      value: expect.objectContaining({
        grind_size: 'Medium-fine', flavor_notes: null, general_notes: null, photo_path: null,
      }),
    });
  });

  it('has no coffee details: those belong to the coffee', () => {
    const result = toBrewFields(FORM);
    expect(result.ok && Object.keys(result.value)).not.toContain('coffee_name');
    expect(result.ok && Object.keys(result.value)).not.toContain('coffee_id');
  });

  it('requires a brew method', () => {
    expect(toBrewFields({ ...FORM, brewMethod: null })).toEqual({ ok: false, error: 'Please select a brew method.' });
  });

  it('parses the numeric fields, with blanks as null, and rejects anything else', () => {
    const result = toBrewFields({ ...FORM, waterTemp: '93', dose: '15,5', yieldG: '', brewTime: '190.4' });
    expect(result).toEqual({
      ok: true,
      value: expect.objectContaining({ water_temp_c: 93, dose_g: 15.5, yield_g: null, brew_time_s: 190 }),
    });
    expect(toBrewFields({ ...FORM, dose: '15g' })).toEqual({
      ok: false, error: 'Water temp, dose, yield, and brew time must be numbers.',
    });
  });

  it('saves an unscored flavor profile and an unset rating as null', () => {
    expect(toBrewFields(FORM)).toEqual({
      ok: true, value: expect.objectContaining({ flavor_profile: null, rating: null }),
    });
    const profile = { aromatics: 4, acidity: 3.5, sweetness: 4, aftertaste: 3, body: 2.5 };
    expect(toBrewFields({ ...FORM, profile, rating: 4.5 })).toEqual({
      ok: true, value: expect.objectContaining({ flavor_profile: profile, rating: 4.5 }),
    });
  });

  it('keeps an existing photo by its storage path', () => {
    expect(toBrewFields({ ...FORM, photoPath: 'user-1/123.jpg' })).toEqual({
      ok: true, value: expect.objectContaining({ photo_path: 'user-1/123.jpg' }),
    });
  });
});

// Sunday, October 12, 2026, mid-morning local time
const TODAY = new Date(2026, 9, 12, 10, 30);

describe('parseRoastDate', () => {
  it('returns null for blank input', () => {
    expect(parseRoastDate('  ', TODAY)).toBeNull();
  });

  it('reads ISO dates', () => {
    expect(parseRoastDate('2026-10-05', TODAY)).toBe('2026-10-05');
    expect(parseRoastDate('2026/9/30', TODAY)).toBe('2026-09-30');
  });

  it('reads US month/day, with or without a year', () => {
    expect(parseRoastDate('10/5', TODAY)).toBe('2026-10-05');
    expect(parseRoastDate('10/5/26', TODAY)).toBe('2026-10-05');
    expect(parseRoastDate('9/28/2026', TODAY)).toBe('2026-09-28');
    expect(parseRoastDate('10.5', TODAY)).toBe('2026-10-05');
  });

  it('reads month names either side of the day, abbreviated or not', () => {
    expect(parseRoastDate('Oct 5', TODAY)).toBe('2026-10-05');
    expect(parseRoastDate('oct. 5, 2026', TODAY)).toBe('2026-10-05');
    expect(parseRoastDate('October 5 2026', TODAY)).toBe('2026-10-05');
    expect(parseRoastDate('5 Oct', TODAY)).toBe('2026-10-05');
    expect(parseRoastDate('5th September', TODAY)).toBe('2026-09-05');
    expect(parseRoastDate('Sept 30', TODAY)).toBe('2026-09-30');
  });

  it('reads today and yesterday', () => {
    expect(parseRoastDate('Today', TODAY)).toBe('2026-10-12');
    expect(parseRoastDate('yesterday', TODAY)).toBe('2026-10-11');
  });

  it('puts a date without a year in the past: roast dates are never ahead', () => {
    expect(parseRoastDate('Dec 20', TODAY)).toBe('2025-12-20');
    expect(parseRoastDate('10/12', TODAY)).toBe('2026-10-12');
    expect(parseRoastDate('10/13', TODAY)).toBe('2025-10-13');
  });

  it('rejects dates that do not exist, are in the future, or are not dates', () => {
    expect(parseRoastDate('2026-02-30', TODAY)).toBeUndefined();
    expect(parseRoastDate('13/5', TODAY)).toBeUndefined();
    expect(parseRoastDate('2026-10-20', TODAY)).toBeUndefined();
    expect(parseRoastDate('last week', TODAY)).toBeUndefined();
    expect(parseRoastDate('Octember 5', TODAY)).toBeUndefined();
  });
});

const COFFEE_FORM: CoffeeFormValues = {
  name: 'Guji Hambela', roaster: '', origin: '', roastLevel: null, varietal: '',
  processingMethod: '', roasterNotes: '', roastDate: '', bagSize: '',
};

describe('toCoffeeInsert', () => {
  it('trims text and sends blank optional fields as null', () => {
    expect(toCoffeeInsert({ ...COFFEE_FORM, name: ' Guji Hambela ', roaster: ' Onyx ', origin: ' ' }, TODAY)).toEqual({
      ok: true,
      value: {
        name: 'Guji Hambela', roaster: 'Onyx', origin: null, roast_level: null, varietal: null,
        processing_method: null, roaster_notes: null, roast_date: null, bag_size_g: null,
      },
    });
  });

  it('requires a name', () => {
    expect(toCoffeeInsert({ ...COFFEE_FORM, name: ' ' }, TODAY)).toEqual({ ok: false, error: 'Coffee name is required.' });
  });

  it('reads the roast date and the bag size', () => {
    expect(toCoffeeInsert({ ...COFFEE_FORM, roastDate: 'Oct 5', bagSize: '340' }, TODAY)).toEqual({
      ok: true, value: expect.objectContaining({ roast_date: '2026-10-05', bag_size_g: 340 }),
    });
  });

  it('rejects a roast date it cannot read and a bag size that is not a positive number', () => {
    expect(toCoffeeInsert({ ...COFFEE_FORM, roastDate: 'soon' }, TODAY)).toEqual({
      ok: false, error: 'Roast date should be a date like Oct 5 or 10/5, and not in the future.',
    });
    expect(toCoffeeInsert({ ...COFFEE_FORM, bagSize: '12oz' }, TODAY)).toEqual({
      ok: false, error: 'Bag size should be a number of grams.',
    });
    expect(toCoffeeInsert({ ...COFFEE_FORM, bagSize: '0' }, TODAY)).toEqual({
      ok: false, error: 'Bag size should be a number of grams.',
    });
  });
});

describe('coffeeFormValues', () => {
  it('starts blank for a new coffee', () => {
    expect(coffeeFormValues(null)).toEqual({ ...COFFEE_FORM, name: '' });
  });

  it('shows a saved coffee, with its roast date written out so it reads back the same', () => {
    const values = coffeeFormValues({
      ...BASE_COFFEE, name: 'Kenya AA', roaster: 'Sey', roast_level: 'Light', roast_date: '2026-10-05', bag_size_g: 250,
    });
    expect(values).toEqual(expect.objectContaining({
      name: 'Kenya AA', roaster: 'Sey', roastLevel: 'Light', roastDate: 'Oct 5, 2026', bagSize: '250', origin: '',
    }));
    expect(parseRoastDate(values.roastDate, TODAY)).toBe('2026-10-05');
  });
});

describe('brewAgainFrom', () => {
  const past = {
    ...BASE_BREW,
    brew_method: 'Espresso' as const,
    grind_size: '8',
    water_temp_c: 94,
    dose_g: 18,
    yield_g: 36,
    brew_time_s: 28,
    flavor_notes: 'cherry',
    general_notes: 'try finer',
    rating: 4,
    flavor_profile: { aromatics: 4, acidity: 3, sweetness: 4, aftertaste: 3, body: 4 },
    photo_path: 'u1/1.jpg',
  };

  it('copies the coffee, method and recipe, and none of how it tasted', () => {
    expect(brewAgainFrom(past)).toEqual({
      coffee_id: 'c1',
      brew_method: 'Espresso',
      grind_size: '8',
      water_temp_c: 94,
      dose_g: 18,
      yield_g: 36,
      brew_time_s: 28,
    });
  });

  it("leaves the coffee to the form's default once that bag is finished", () => {
    const finished = { ...past, coffee: { ...BASE_COFFEE, finished_at: '2024-02-01T00:00:00Z' } };
    expect(brewAgainFrom(finished)).not.toHaveProperty('coffee_id');
    expect(brewAgainFrom(finished).dose_g).toBe(18);
  });
});
