/**
 * Aurora design system — dark-first, calm, premium.
 * Named after the aurora gradient that runs through the whole app.
 */

export const palette = {
  // Backgrounds (deep navy night sky)
  bg: '#0A0F1E',
  surface: '#111827',
  surfaceAlt: '#16203A',
  surfaceRaised: '#1B2742',
  border: 'rgba(148, 163, 184, 0.12)',
  borderStrong: 'rgba(148, 163, 184, 0.24)',

  // Aurora gradient stops
  auroraTeal: '#4FD1C5',
  auroraBlue: '#60A5FA',
  auroraIndigo: '#818CF8',
  auroraViolet: '#A78BFA',
  auroraPink: '#F0ABFC',

  // Module accents
  hydration: '#38BDF8',
  hydrationDeep: '#0EA5E9',
  sleep: '#A78BFA',
  sleepDeep: '#8B5CF6',
  habit: '#34D399',
  habitDeep: '#10B981',
  nutrition: '#FBBF24',
  nutritionDeep: '#F59E0B',
  streak: '#FB923C',
  energy: '#F472B6',

  // Text
  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  textTertiary: '#64748B',
  textOnAccent: '#06121F',

  // Feedback
  success: '#34D399',
  warning: '#FBBF24',
  danger: '#F87171',
} as const;

export const auroraGradient = [palette.auroraTeal, palette.auroraIndigo, palette.auroraViolet] as const;
export const auroraGradientWide = [
  palette.auroraTeal,
  palette.auroraBlue,
  palette.auroraIndigo,
  palette.auroraViolet,
  palette.auroraPink,
] as const;

export const fonts = {
  display: 'Sora_600SemiBold',
  displayBold: 'Sora_700Bold',
  heading: 'Sora_600SemiBold',
  bodyBold: 'Manrope_700Bold',
  bodySemiBold: 'Manrope_600SemiBold',
  body: 'Manrope_500Medium',
  bodyRegular: 'Manrope_400Regular',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  full: 999,
} as const;

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 10,
  }),
} as const;
