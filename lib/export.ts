import { Brew } from '../types';
import { daysSinceRoast } from './coffeeStats';
import { brewRatio } from './ratio';

// Profile → Export Brews: every brew with its coffee as a CSV file, for Numbers, Excel or Google
// Sheets. Photos aren't in it. lib/shareFile.ts hands the file to the browser or the share sheet.

const COLUMNS: [header: string, value: (brew: Brew) => string | number | null][] = [
  ['Date', (b) => localDateTime(b.created_at)],
  ['Coffee', (b) => b.coffee.name],
  ['Roaster', (b) => b.coffee.roaster],
  ['Origin', (b) => b.coffee.origin],
  ['Roast Level', (b) => b.coffee.roast_level],
  ['Varietal', (b) => b.coffee.varietal],
  ['Process', (b) => b.coffee.processing_method],
  ['Roast Date', (b) => b.coffee.roast_date],
  ['Days Off Roast', (b) => {
    const days = daysSinceRoast(b.coffee.roast_date, b.created_at);
    return days !== null && days >= 0 ? days : null;
  }],
  ['Method', (b) => b.brew_method],
  ['Grind Size', (b) => b.grind_size],
  ['Water (°C)', (b) => b.water_temp_c],
  ['Dose (g)', (b) => b.dose_g],
  ['Yield (g)', (b) => b.yield_g],
  // A number, not "1:16", which spreadsheets read as a time of day
  ['Ratio (1:x)', (b) => {
    const ratio = brewRatio(b.dose_g, b.yield_g);
    return ratio === null ? null : Math.round(ratio * 10) / 10;
  }],
  ['Brew Time (s)', (b) => b.brew_time_s],
  ['Rating', (b) => b.rating],
  ['Aromatics', (b) => b.flavor_profile?.aromatics ?? null],
  ['Acidity', (b) => b.flavor_profile?.acidity ?? null],
  ['Sweetness', (b) => b.flavor_profile?.sweetness ?? null],
  ['Aftertaste', (b) => b.flavor_profile?.aftertaste ?? null],
  ['Body', (b) => b.flavor_profile?.body ?? null],
  ['Flavor Notes', (b) => b.flavor_notes],
  ['General Notes', (b) => b.general_notes],
];

const pad = (n: number) => String(n).padStart(2, '0');

/** "2026-10-14 07:05" in local time, which spreadsheets read as a date and time. */
function localDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * One CSV field. Text starting like a formula gets a leading apostrophe, so a spreadsheet shows it
 * instead of running it, and text with a comma, quote or line break is quoted.
 */
function field(value: string | number | null): string {
  if (value === null) return '';
  if (typeof value === 'number') return String(value);
  const text = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** The brews as CSV, oldest first, with a byte order mark so spreadsheets read it as UTF-8. */
export function brewsCsv(brews: Brew[]): string {
  const sorted = [...brews].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const lines = [
    COLUMNS.map(([header]) => header).join(','),
    ...sorted.map((brew) => COLUMNS.map(([, value]) => field(value(brew))).join(',')),
  ];
  return `﻿${lines.join('\r\n')}`;
}

/** e.g. "brulogger-brews-2026-10-14.csv", dated in local time. */
export function exportFileName(now = new Date()): string {
  return `brulogger-brews-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.csv`;
}
