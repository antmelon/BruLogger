import { parseBrewInput, parseBrewPatch } from '../lib/brewInput';

const COFFEE_ID = '6f1c2b0e-8a4d-4c3e-9b7a-2d5e8f1a3c4b';

function ok(body: unknown) {
  const r = parseBrewInput(body);
  if (!r.ok) throw new Error(`expected ok, got: ${r.errors.join(' | ')}`);
  return r.value;
}

function errors(body: unknown) {
  const r = parseBrewInput(body);
  if (r.ok) throw new Error('expected errors');
  return r.errors.join(' | ');
}

describe('parseBrewInput', () => {
  it("accepts a minimal brew, nulls the brew's optional fields, and keeps the coffee details given", () => {
    expect(ok({ coffee_name: ' Guji ', brew_method: 'Pour Over' })).toEqual({
      brew: {
        brew_method: 'Pour Over',
        grind_size: null, flavor_notes: null, general_notes: null,
        water_temp_c: null, dose_g: null, yield_g: null, brew_time_s: null,
        rating: null,
        flavor_profile: null,
      },
      coffee: { details: { name: 'Guji' } },
    });
  });

  it('takes every coffee detail, including the ones only a coffee has', () => {
    const v = ok({
      coffee_name: 'Guji', roaster: ' Onyx ', origin: 'Ethiopia', roast_level: 'light', varietal: '',
      processing_method: 'Natural', roaster_notes: 'blueberry, jasmine', roast_date: '2026-10-05', bag_size_g: '340',
      brew_method: 'Pour Over',
    });
    expect(v.coffee).toEqual({
      details: {
        name: 'Guji', roaster: 'Onyx', origin: 'Ethiopia', roast_level: 'Light', processing_method: 'Natural',
        roaster_notes: 'blueberry, jasmine', roast_date: '2026-10-05', bag_size_g: 340,
      },
    });
  });

  it('takes a coffee by its id instead, but not both ways at once', () => {
    expect(ok({ coffee_id: COFFEE_ID, brew_method: 'Espresso' }).coffee).toEqual({ id: COFFEE_ID });
    expect(errors({ coffee_id: COFFEE_ID, coffee_name: 'Guji', brew_method: 'Espresso' }))
      .toMatch(/Send coffee_id or the coffee details.*not both/);
    expect(errors({ coffee_id: 'guji', brew_method: 'Espresso' })).toMatch("coffee_id must be a coffee's id");
  });

  it('matches enum values loosely', () => {
    const v = ok({ coffee_name: 'X', brew_method: 'pour-over', roast_level: 'medium light' });
    expect(v.brew.brew_method).toBe('Pour Over');
    expect(v.coffee).toEqual({ details: { name: 'X', roast_level: 'Medium-Light' } });
    expect(ok({ coffee_name: 'X', brew_method: 'aeropress' }).brew.brew_method).toBe('AeroPress');
  });

  it('requires a coffee and a known brew_method', () => {
    expect(errors({ brew_method: 'Pour Over' })).toMatch('coffee_id or coffee_name is required');
    expect(errors({ coffee_name: ' ', brew_method: 'Pour Over' })).toMatch('coffee_id or coffee_name is required');
    expect(errors({ coffee_name: 'X', brew_method: 'Siphon' })).toMatch('brew_method must be one of');
  });

  it('rejects unknown fields so typos are caught', () => {
    expect(errors({ coffee_name: 'X', brew_method: 'Espresso', dose: 18 })).toMatch('Unknown field(s): dose');
  });

  it('parses numbers given as numbers or strings and rounds brew time', () => {
    const v = ok({
      coffee_name: 'X', brew_method: 'Espresso',
      dose_g: '18,5', yield_g: 36, water_temp_c: 93, brew_time_s: 27.6,
    });
    expect(v.brew).toMatchObject({ dose_g: 18.5, yield_g: 36, water_temp_c: 93, brew_time_s: 28 });
    expect(errors({ coffee_name: 'X', brew_method: 'Espresso', dose_g: 'lots' })).toMatch('dose_g');
    expect(errors({ coffee_name: 'X', brew_method: 'Espresso', yield_g: -1 })).toMatch('yield_g');
  });

  it('takes a roast date as YYYY-MM-DD, not in the future, and a positive bag size', () => {
    expect(errors({ coffee_name: 'X', brew_method: 'Espresso', roast_date: 'Oct 5' })).toMatch('roast_date must be a date');
    expect(errors({ coffee_name: 'X', brew_method: 'Espresso', roast_date: '2026-02-30' })).toMatch('roast_date');
    const nextWeek = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
    expect(errors({ coffee_name: 'X', brew_method: 'Espresso', roast_date: nextWeek })).toMatch('roast_date');
    expect(errors({ coffee_name: 'X', brew_method: 'Espresso', bag_size_g: 0 })).toMatch('bag_size_g must be a positive number');
  });

  it('rounds rating to half steps and enforces 1–5', () => {
    expect(ok({ coffee_name: 'X', brew_method: 'Espresso', rating: 4.4 }).brew.rating).toBe(4.5);
    expect(errors({ coffee_name: 'X', brew_method: 'Espresso', rating: 7 })).toMatch('rating');
  });

  it('requires a complete flavor_profile when one is given', () => {
    const fp = { aromatics: 4, acidity: 3.5, sweetness: 4, aftertaste: 3, body: 2.2 };
    expect(ok({ coffee_name: 'X', brew_method: 'Espresso', flavor_profile: fp }).brew.flavor_profile)
      .toEqual({ ...fp, body: 2 });
    expect(errors({ coffee_name: 'X', brew_method: 'Espresso', flavor_profile: { aromatics: 4 } }))
      .toMatch('invalid: acidity, sweetness, aftertaste, body');
  });

  it('accepts a past created_at and rejects bad or future ones', () => {
    const v = ok({ coffee_name: 'X', brew_method: 'Espresso', created_at: '2026-10-01T08:30:00Z' });
    expect(v.brew.created_at).toBe('2026-10-01T08:30:00.000Z');
    expect(errors({ coffee_name: 'X', brew_method: 'Espresso', created_at: 'yesterday' })).toMatch('created_at');
    const future = new Date(Date.now() + 86_400_000).toISOString();
    expect(errors({ coffee_name: 'X', brew_method: 'Espresso', created_at: future })).toMatch('future');
  });

  it('rejects non-object bodies', () => {
    expect(errors(null)).toMatch('JSON object');
    expect(errors([1])).toMatch('JSON object');
  });
});

describe('parseBrewPatch', () => {
  it('returns only the fields sent, normalized, with null clearing a field', () => {
    expect(parseBrewPatch({ dose_g: '16', brew_method: 'pour over', roaster: null, origin: '  ' })).toEqual({
      ok: true,
      value: { brew: { dose_g: 16, brew_method: 'Pour Over' }, coffee: { details: { roaster: null, origin: null } } },
    });
  });

  it('has no coffee when no coffee field was sent', () => {
    expect(parseBrewPatch({ rating: 4 })).toEqual({ ok: true, value: { brew: { rating: 4 } } });
  });

  it('moves the brew to another coffee by id', () => {
    expect(parseBrewPatch({ coffee_id: COFFEE_ID })).toEqual({ ok: true, value: { brew: {}, coffee: { id: COFFEE_ID } } });
  });

  it("refuses to clear what a brew can't be without, and rejects unknown fields", () => {
    const errorsOf = (body: unknown) => {
      const r = parseBrewPatch(body);
      return r.ok ? '' : r.errors.join(' | ');
    };
    expect(errorsOf({ coffee_name: null })).toMatch(/coffee_name can't be cleared/);
    expect(errorsOf({ coffee_id: null })).toMatch(/coffee_id can't be cleared/);
    expect(errorsOf({ brew_method: null })).toMatch(/brew_method can't be cleared/);
    expect(errorsOf({ created_at: null })).toMatch(/created_at can't be cleared/);
    expect(errorsOf({ coffee_id: COFFEE_ID, origin: 'Kenya' })).toMatch(/not both/);
    expect(errorsOf({ dose: 16 })).toMatch(/Unknown field\(s\): dose/);
  });
});
