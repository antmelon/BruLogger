/**
 * Parses an optional numeric text field.
 * Returns null for blank input, a number for valid input (comma decimals accepted),
 * or undefined when the input is not a valid number.
 */
export function parseNumberField(text: string, { integer = false } = {}): number | null | undefined {
  const trimmed = text.trim().replace(',', '.');
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return integer ? Math.round(n) : n;
}
