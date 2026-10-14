import { parseNumberField } from './form';

// A brew's ratio: grams of yield per gram of coffee, written 1:16. It isn't stored. The brew page
// and the brew form work it out from the dose and yield, and a ratio typed into the form fills in
// the yield.

const oneDecimal = (n: number) => String(Math.round(n * 10) / 10);

/** Yield per gram of coffee, or null without both a dose and a yield. */
export function brewRatio(doseG: number | null, yieldG: number | null): number | null {
  if (!doseG || !yieldG) return null;
  return yieldG / doseG;
}

/** e.g. "1:16", "1:16.7". */
export function formatRatio(ratio: number): string {
  return `1:${oneDecimal(ratio)}`;
}

/**
 * Reads a typed ratio: "16", "16.5", "16,5", "1:16" or "1/16". Returns null when blank, or
 * undefined when it isn't a ratio (or isn't finished, like "1:").
 */
export function parseRatio(text: string): number | null | undefined {
  const s = text.trim();
  if (!s) return null;
  const afterOne = s.match(/^1\s*[:/]\s*(.*)$/);
  const ratio = parseNumberField(afterOne ? afterOne[1] : s);
  return ratio || undefined;
}

/** The brew form's dose, yield and ratio fields, as typed. */
export interface RatioFields {
  dose: string;
  yieldG: string;
  ratio: string;
  /** A ratio was typed, so a new dose fills in the yield again, until a yield is typed. */
  holdRatio: boolean;
}

/** The ratio field's text for a dose and yield: blank unless both are numbers. */
function ratioText(dose: string, yieldG: string): string {
  const ratio = brewRatio(parseNumberField(dose) ?? null, parseNumberField(yieldG) ?? null);
  return ratio === null ? '' : oneDecimal(ratio);
}

/** The yield for a dose at a ratio, or null until both are numbers. */
function yieldFor(dose: string, ratio: string): string | null {
  const doseG = parseNumberField(dose);
  const r = parseRatio(ratio);
  return doseG && r ? oneDecimal(doseG * r) : null;
}

/** The fields for a form's starting dose and yield. */
export function ratioFields(dose: string, yieldG: string): RatioFields {
  return { dose, yieldG, ratio: ratioText(dose, yieldG), holdRatio: false };
}

/**
 * The fields after `text` is typed into one of them. A typed dose or yield shows the ratio they
 * make. A typed ratio fills in the yield from the dose, and keeps doing so when the dose changes.
 */
export function editRatioFields(
  fields: RatioFields, field: 'dose' | 'yieldG' | 'ratio', text: string,
): RatioFields {
  switch (field) {
    case 'dose':
      return fields.holdRatio
        ? { ...fields, dose: text, yieldG: yieldFor(text, fields.ratio) ?? fields.yieldG }
        : { ...fields, dose: text, ratio: ratioText(text, fields.yieldG) };
    case 'yieldG':
      return { dose: fields.dose, yieldG: text, ratio: ratioText(fields.dose, text), holdRatio: false };
    case 'ratio':
      return {
        ...fields,
        ratio: text,
        holdRatio: text.trim() !== '',
        yieldG: yieldFor(fields.dose, text) ?? fields.yieldG,
      };
  }
}
