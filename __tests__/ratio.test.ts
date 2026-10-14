import { brewRatio, editRatioFields, formatRatio, parseRatio, ratioFields } from '../lib/ratio';

describe('brewRatio', () => {
  it('is the yield per gram of coffee', () => {
    expect(brewRatio(18, 288)).toBe(16);
    expect(brewRatio(18, 36)).toBe(2);
  });

  it('is null without both a dose and a yield', () => {
    expect(brewRatio(null, 288)).toBeNull();
    expect(brewRatio(18, null)).toBeNull();
    expect(brewRatio(0, 288)).toBeNull();
  });
});

describe('formatRatio', () => {
  it('writes it as 1:x with at most one decimal', () => {
    expect(formatRatio(16)).toBe('1:16');
    expect(formatRatio(300 / 18)).toBe('1:16.7');
    expect(formatRatio(2.25)).toBe('1:2.3');
  });
});

describe('parseRatio', () => {
  it('reads the part after 1:, written with or without it', () => {
    expect(parseRatio('16')).toBe(16);
    expect(parseRatio('16.5')).toBe(16.5);
    expect(parseRatio('2,5')).toBe(2.5);
    expect(parseRatio('1:16')).toBe(16);
    expect(parseRatio(' 1 : 15 ')).toBe(15);
    expect(parseRatio('1/17')).toBe(17);
  });

  it('is null when blank and undefined when not a ratio', () => {
    expect(parseRatio('')).toBeNull();
    expect(parseRatio('  ')).toBeNull();
    expect(parseRatio('abc')).toBeUndefined();
    expect(parseRatio('0')).toBeUndefined();
    expect(parseRatio('1:')).toBeUndefined();
  });
});

describe('ratioFields', () => {
  it('starts with the ratio of the dose and yield it was given', () => {
    expect(ratioFields('18', '288')).toEqual({ dose: '18', yieldG: '288', ratio: '16', holdRatio: false });
    expect(ratioFields('15', '250').ratio).toBe('16.7');
  });

  it('leaves the ratio blank without both', () => {
    expect(ratioFields('', '').ratio).toBe('');
    expect(ratioFields('18', '').ratio).toBe('');
  });
});

describe('editRatioFields', () => {
  const start = ratioFields('18', '288');

  it('updates the ratio when the dose or yield is typed', () => {
    expect(editRatioFields(start, 'dose', '20')).toEqual({ dose: '20', yieldG: '288', ratio: '14.4', holdRatio: false });
    expect(editRatioFields(start, 'yieldG', '300').ratio).toBe('16.7');
  });

  it('clears the ratio when the dose or yield is cleared or not a number', () => {
    expect(editRatioFields(start, 'dose', '').ratio).toBe('');
    expect(editRatioFields(start, 'yieldG', 'lots').ratio).toBe('');
  });

  it('fills in the yield from the dose when a ratio is typed', () => {
    expect(editRatioFields(start, 'ratio', '15')).toEqual({ dose: '18', yieldG: '270', ratio: '15', holdRatio: true });
    expect(editRatioFields(ratioFields('18.5', ''), 'ratio', '2')).toMatchObject({ yieldG: '37' });
    expect(editRatioFields(ratioFields('15', ''), 'ratio', '16.67')).toMatchObject({ yieldG: '250.1' });
  });

  it('keeps a typed ratio when the dose changes, so the yield follows', () => {
    const held = editRatioFields(start, 'ratio', '16');
    expect(editRatioFields(held, 'dose', '20')).toEqual({ dose: '20', yieldG: '320', ratio: '16', holdRatio: true });
  });

  it('stops holding the ratio once a yield is typed', () => {
    const held = editRatioFields(start, 'ratio', '16');
    const typed = editRatioFields(held, 'yieldG', '300');
    expect(typed).toEqual({ dose: '18', yieldG: '300', ratio: '16.7', holdRatio: false });
    expect(editRatioFields(typed, 'dose', '20').yieldG).toBe('300');
  });

  it('leaves the yield alone while the ratio or dose is blank or half typed', () => {
    expect(editRatioFields(start, 'ratio', '')).toEqual({ dose: '18', yieldG: '288', ratio: '', holdRatio: false });
    expect(editRatioFields(start, 'ratio', '1:')).toMatchObject({ yieldG: '288', ratio: '1:' });
    const held = editRatioFields(start, 'ratio', '16');
    expect(editRatioFields(held, 'dose', '')).toEqual({ dose: '', yieldG: '288', ratio: '16', holdRatio: true });
    expect(editRatioFields(ratioFields('', ''), 'ratio', '16')).toMatchObject({ yieldG: '', ratio: '16' });
  });
});
