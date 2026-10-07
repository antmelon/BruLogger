import { parseBrewInput } from '../lib/brewInput';

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
  it('accepts a minimal brew and nulls every optional field', () => {
    expect(ok({ coffee_name: ' Guji ', brew_method: 'Pour Over' })).toEqual({
      coffee_name: 'Guji',
      brew_method: 'Pour Over',
      roast_level: null,
      roaster: null, origin: null, varietal: null, processing_method: null,
      grind_size: null, flavor_notes: null, general_notes: null,
      water_temp_c: null, dose_g: null, yield_g: null, brew_time_s: null,
      rating: null,
      flavor_profile: null,
    });
  });

  it('matches enum values loosely', () => {
    const v = ok({ coffee_name: 'X', brew_method: 'pour-over', roast_level: 'medium light' });
    expect(v.brew_method).toBe('Pour Over');
    expect(v.roast_level).toBe('Medium-Light');
    expect(ok({ coffee_name: 'X', brew_method: 'aeropress' }).brew_method).toBe('AeroPress');
  });

  it('requires coffee_name and a known brew_method', () => {
    expect(errors({ brew_method: 'Pour Over' })).toMatch('coffee_name is required');
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
    expect(v).toMatchObject({ dose_g: 18.5, yield_g: 36, water_temp_c: 93, brew_time_s: 28 });
    expect(errors({ coffee_name: 'X', brew_method: 'Espresso', dose_g: 'lots' })).toMatch('dose_g');
    expect(errors({ coffee_name: 'X', brew_method: 'Espresso', yield_g: -1 })).toMatch('yield_g');
  });

  it('rounds rating to half steps and enforces 1–5', () => {
    expect(ok({ coffee_name: 'X', brew_method: 'Espresso', rating: 4.4 }).rating).toBe(4.5);
    expect(errors({ coffee_name: 'X', brew_method: 'Espresso', rating: 7 })).toMatch('rating');
  });

  it('requires a complete flavor_profile when one is given', () => {
    const fp = { aromatics: 4, acidity: 3.5, sweetness: 4, aftertaste: 3, body: 2.2 };
    expect(ok({ coffee_name: 'X', brew_method: 'Espresso', flavor_profile: fp }).flavor_profile)
      .toEqual({ ...fp, body: 2 });
    expect(errors({ coffee_name: 'X', brew_method: 'Espresso', flavor_profile: { aromatics: 4 } }))
      .toMatch('invalid: acidity, sweetness, aftertaste, body');
  });

  it('accepts a past created_at and rejects bad or future ones', () => {
    const v = ok({ coffee_name: 'X', brew_method: 'Espresso', created_at: '2026-10-01T08:30:00Z' });
    expect(v.created_at).toBe('2026-10-01T08:30:00.000Z');
    expect(errors({ coffee_name: 'X', brew_method: 'Espresso', created_at: 'yesterday' })).toMatch('created_at');
    const future = new Date(Date.now() + 86_400_000).toISOString();
    expect(errors({ coffee_name: 'X', brew_method: 'Espresso', created_at: future })).toMatch('future');
  });

  it('rejects non-object bodies', () => {
    expect(errors(null)).toMatch('JSON object');
    expect(errors([1])).toMatch('JSON object');
  });
});
