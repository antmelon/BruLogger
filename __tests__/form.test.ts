import { parseNumberField } from '../lib/form';

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
