/**
 * JIGGO MAXXING design tokens — dark luxury + bronze.
 * Source of truth mirrored from Figma file 23Y9fZmlW7i3tXDp5Sdcid.
 */
export const colors = {
  // surfaces
  ink: '#080808',
  surface: '#0E0F0F',
  surfaceElevated: '#141414',
  surfaceMuted: '#1A1B1B',
  hairline: '#222323',

  // bronze accent system
  bronze: '#B08A5A',
  bronzeBright: '#C6A16A',
  bronzeDeep: '#8A5A34',
  bronzeOnBlack: 'rgba(176,138,90,0.12)',

  // text
  textPrimary: '#F2F2F0',
  textSecondary: '#9A9A98',
  textTertiary: '#5C5C5A',
  textOnBronze: '#0B0907',

  // semantic
  positive: '#7E9E7A',
  warning: '#C9A063',
  danger: '#B0584F',
} as const;

export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const type = {
  family: {
    sans: 'Inter_400Regular',
    sansMedium: 'Inter_500Medium',
    sansSemi: 'Inter_600SemiBold',
    sansBold: 'Inter_700Bold',
    sansBlack: 'Inter_900Black',
  },
  size: {
    eyebrow: 11,
    body: 15,
    bodyLg: 17,
    title: 22,
    titleLg: 28,
    display: 40,
    displayLg: 56,
  },
  letterSpacing: {
    eyebrow: 1.6,
    tight: -0.4,
    tighter: -0.8,
  },
} as const;
