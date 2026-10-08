import { BrewFormValues, parseNumberField, toBrewInsert } from '../lib/form';

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
  coffeeName: 'Guji Hambela', roaster: '', origin: '', roastLevel: null, varietal: '',
  processingMethod: '', brewMethod: 'Pour Over', grindSize: '', waterTemp: '', dose: '',
  yieldG: '', brewTime: '', flavorNotes: '', generalNotes: '', rating: 0, profile: null,
  photoUrl: null,
};

describe('toBrewInsert', () => {
  it('trims text and sends blank optional fields as null so clearing one on edit persists', () => {
    const result = toBrewInsert({ ...FORM, coffeeName: '  Guji Hambela ', roaster: ' Onyx ', origin: '   ' });
    expect(result).toEqual({
      ok: true,
      value: expect.objectContaining({
        coffee_name: 'Guji Hambela', roaster: 'Onyx', origin: null, roast_level: null,
        varietal: null, processing_method: null, grind_size: null, flavor_notes: null,
        general_notes: null, photo_url: null,
      }),
    });
  });

  it('requires a coffee name and a brew method', () => {
    expect(toBrewInsert({ ...FORM, coffeeName: '  ' })).toEqual({ ok: false, error: 'Coffee name is required.' });
    expect(toBrewInsert({ ...FORM, brewMethod: null })).toEqual({ ok: false, error: 'Please select a brew method.' });
  });

  it('parses the numeric fields, with blanks as null, and rejects anything else', () => {
    const result = toBrewInsert({ ...FORM, waterTemp: '93', dose: '15,5', yieldG: '', brewTime: '190.4' });
    expect(result).toEqual({
      ok: true,
      value: expect.objectContaining({ water_temp_c: 93, dose_g: 15.5, yield_g: null, brew_time_s: 190 }),
    });
    expect(toBrewInsert({ ...FORM, dose: '15g' })).toEqual({
      ok: false, error: 'Water temp, dose, yield, and brew time must be numbers.',
    });
  });

  it('saves an unscored flavor profile and an unset rating as null', () => {
    expect(toBrewInsert(FORM)).toEqual({
      ok: true, value: expect.objectContaining({ flavor_profile: null, rating: null }),
    });
    const profile = { aromatics: 4, acidity: 3.5, sweetness: 4, aftertaste: 3, body: 2.5 };
    expect(toBrewInsert({ ...FORM, profile, rating: 4.5 })).toEqual({
      ok: true, value: expect.objectContaining({ flavor_profile: profile, rating: 4.5 }),
    });
  });
});
