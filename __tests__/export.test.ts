import { brewsCsv, exportFileName } from '../lib/export';
import { Brew } from '../types';
import { BASE_BREW, BASE_COFFEE } from './fixtures';

// Local times, so the expected text doesn't depend on the machine's time zone
const at = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min).toISOString();

const rows = (csv: string) => csv.replace(/^﻿/, '').split('\r\n');

describe('brewsCsv', () => {
  const full: Brew = {
    ...BASE_BREW,
    id: 'b2',
    created_at: at(2026, 10, 14, 7, 5),
    coffee: {
      ...BASE_COFFEE,
      name: 'Guji Natural',
      roaster: 'Onyx',
      origin: 'Ethiopia',
      roast_level: 'Light',
      varietal: 'Heirloom',
      processing_method: 'Natural',
      roast_date: '2026-10-03',
    },
    brew_method: 'Pour Over',
    grind_size: 'Medium-fine',
    water_temp_c: 93,
    dose_g: 15,
    yield_g: 250,
    brew_time_s: 190,
    rating: 4.5,
    flavor_profile: { aromatics: 4, acidity: 3.5, sweetness: 4, aftertaste: 3, body: 2.5 },
    flavor_notes: 'blueberry',
    general_notes: 'try finer',
  };

  it('starts with a byte order mark and a header row, so spreadsheets read it as UTF-8', () => {
    const csv = brewsCsv([]);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(rows(csv)).toEqual([
      'Date,Coffee,Roaster,Origin,Roast Level,Varietal,Process,Roast Date,Days Off Roast,Method,'
      + 'Grind Size,Water (°C),Dose (g),Yield (g),Ratio (1:x),Brew Time (s),Rating,Aromatics,Acidity,'
      + 'Sweetness,Aftertaste,Body,Flavor Notes,General Notes',
    ]);
  });

  it('writes a brew with its coffee on one row', () => {
    expect(rows(brewsCsv([full]))[1]).toBe(
      '2026-10-14 07:05,Guji Natural,Onyx,Ethiopia,Light,Heirloom,Natural,2026-10-03,11,Pour Over,'
      + 'Medium-fine,93,15,250,16.7,190,4.5,4,3.5,4,3,2.5,blueberry,try finer',
    );
  });

  it('leaves what a brew doesn\'t have blank', () => {
    expect(rows(brewsCsv([{ ...BASE_BREW, created_at: at(2024, 1, 2, 9, 30) }]))[1]).toBe(
      '2024-01-02 09:30,Test Coffee,,,,,,,,Pour Over,,,,,,,,,,,,,,',
    );
  });

  it('lists brews oldest first', () => {
    const older = { ...BASE_BREW, id: 'b1', created_at: at(2026, 10, 1) };
    const csv = rows(brewsCsv([full, older]));
    expect(csv[1].startsWith('2026-10-01')).toBe(true);
    expect(csv[2].startsWith('2026-10-14')).toBe(true);
  });

  it('quotes text with commas, quotes or line breaks', () => {
    const brew = { ...full, flavor_notes: 'cherry, cocoa', general_notes: 'a "bright" one\nsweet later' };
    expect(brewsCsv([brew])).toContain(',"cherry, cocoa","a ""bright"" one\nsweet later"');
  });

  it("keeps text that looks like a formula from running in a spreadsheet", () => {
    const brew = { ...full, flavor_notes: '=HYPERLINK("x")', general_notes: '+1 click finer' };
    expect(rows(brewsCsv([brew]))[1].endsWith(`,"'=HYPERLINK(""x"")",'+1 click finer`)).toBe(true);
  });
});

describe('exportFileName', () => {
  it('names the file after the day it was made', () => {
    expect(exportFileName(new Date(2026, 9, 14, 23, 59))).toBe('brulogger-brews-2026-10-14.csv');
  });
});
