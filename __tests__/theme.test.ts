import { colors } from '../lib/theme';

// Contrast ratio as WCAG 2.x defines it: (lighter + 0.05) / (darker + 0.05) of relative luminance
function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Every surface text is drawn on
const SURFACES = ['background', 'surface', 'surfaceWarm', 'surfaceIcon'] as const;
// Every color used for text, placeholders included
const TEXT = ['textDark', 'textMuted', 'textMedium', 'textLight', 'primary', 'error'] as const;

describe('theme contrast', () => {
  it('measures contrast the way WCAG does', () => {
    expect(contrast('#000000', '#FFFFFF')).toBeCloseTo(21);
    expect(contrast('#777777', '#FFFFFF')).toBeCloseTo(4.48, 2);
  });

  it.each(TEXT)('%s text is readable on every surface (WCAG AA, 4.5:1)', (text) => {
    const unreadable = SURFACES.filter((s) => contrast(colors[text], colors[s]) < 4.5).map(
      (s) => `${s} ${contrast(colors[text], colors[s]).toFixed(2)}`,
    );
    expect(unreadable).toEqual([]);
  });

  it('white text on buttons is readable', () => {
    expect(contrast(colors.surface, colors.primary)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors.surface, colors.apple)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors.googleText, colors.surface)).toBeGreaterThanOrEqual(4.5);
  });

  it('chart lines and bars stand out from the card (WCAG graphics, 3:1)', () => {
    expect(contrast(colors.accent, colors.surface)).toBeGreaterThanOrEqual(3);
  });
});
