export const colors = {
  primary: '#8B5A2B',
  background: '#F5EFE6',
  surface: '#FFFFFF',
  surfaceWarm: '#FDFAF6',
  surfaceIcon: '#FFF8F0',
  textDark: '#4A3728',
  textMedium: '#8C7B6E',
  textLight: '#B0A090',
  textMuted: '#6B5B4E',
  textFaint: '#C4B8A8',
  border: '#E8DFCF',
  borderLight: '#D4C5A9',
  error: '#CC4444',
  accent: '#C4956A',
  primaryFaded: 'rgba(139, 90, 43, 0.25)',
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
