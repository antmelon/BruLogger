// Every text color (placeholders too) reads at 4.5:1 or better on every surface, and chart
// lines and bars at 3:1 on cards (WCAG AA); __tests__/theme.test.ts holds them to it.
export const colors = {
  primary: '#8B5A2B',
  background: '#F5EFE6',
  surface: '#FFFFFF',
  surfaceWarm: '#FDFAF6',
  surfaceIcon: '#FFF8F0',
  textDark: '#4A3728',
  textMedium: '#73655B',
  textLight: '#7B6958', // the lightest text color: placeholders, dates, hints
  textMuted: '#6B5B4E',
  iconFaint: '#C4B8A8', // decoration only (large empty-state icons), never text
  border: '#E8DFCF',
  borderLight: '#D4C5A9',
  error: '#C63636',
  accent: '#BC8757',
  primaryFaded: 'rgba(139, 90, 43, 0.25)',
  apple: '#000000', // Sign in with Apple button: Apple's guidelines make it black (or white)
  // Continue with Google button, in Google's light style (white, with these border and text colors)
  googleBorder: '#747775',
  googleText: '#1F1F1F',
  shadow: '#000000',
} as const;

export const shadows = {
  // Cards and sections on the background
  card: {
    shadowColor: colors.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  // Surfaces that float higher: the login card, landing feature cards
  raised: {
    shadowColor: colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  // Glow under prominent primary buttons
  button: {
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
} as const;
