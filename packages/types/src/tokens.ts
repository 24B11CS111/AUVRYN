/**
 * AUVRYN Official Design Token System
 * The Intelligent Education Ecosystem
 *
 * Unified design tokens for Web (Tailwind / CSS) and Mobile (React Native StyleSheets).
 */

export const AUVRYN_COLORS = {
  // Primary Brand Colors
  primaryNavy: '#0B1E3F',
  deepNavy: '#07152B',
  secondaryNavy: '#142C4C',
  electricBlue: '#2563EB',
  lightBlue: '#EAF2FF',
  pureWhite: '#FFFFFF',

  // Canvas & Surfaces
  background: '#F5F7FB',
  surface: '#FFFFFF',
  surfaceSubtle: '#F8FAFC',
  surfaceElevated: '#FFFFFF',

  // Typography
  primaryText: '#17243A',
  secondaryText: '#64748B',
  mutedText: '#94A3B8',
  inverseText: '#FFFFFF',
  brandText: '#0B1E3F',

  // Borders & Dividers
  border: '#E2E8F0',
  borderSubtle: '#F1F5F9',
  borderStrong: '#CBD5E1',
  borderFocus: '#2563EB',

  // Status Indicators
  success: '#16A36A',
  successLight: '#DCFCE7',
  warning: '#D99A22',
  warningLight: '#FEF3C7',
  error: '#DC4545',
  errorLight: '#FEE2E2',
  info: '#2563EB',
  infoLight: '#EAF2FF',
} as const;

export type AuvrynColorKey = keyof typeof AUVRYN_COLORS;

export const AUVRYN_TYPOGRAPHY = {
  fontFamily: {
    sans: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    display: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  },
  fontSize: {
    xs: { fontSize: 12, lineHeight: 16 },
    sm: { fontSize: 14, lineHeight: 20 },
    base: { fontSize: 16, lineHeight: 24 },
    lg: { fontSize: 18, lineHeight: 28 },
    xl: { fontSize: 20, lineHeight: 28 },
    '2xl': { fontSize: 24, lineHeight: 32 },
    '3xl': { fontSize: 30, lineHeight: 36 },
    '4xl': { fontSize: 36, lineHeight: 40 },
    '5xl': { fontSize: 48, lineHeight: 48 },
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
} as const;

export const AUVRYN_SPACING = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
} as const;

export const AUVRYN_RADIUS = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  full: 9999,
} as const;

export const AUVRYN_SHADOWS = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(11, 30, 63, 0.05)',
  md: '0 4px 6px -1px rgba(11, 30, 63, 0.08), 0 2px 4px -2px rgba(11, 30, 63, 0.04)',
  lg: '0 10px 15px -3px rgba(11, 30, 63, 0.08), 0 4px 6px -4px rgba(11, 30, 63, 0.03)',
  xl: '0 20px 25px -5px rgba(11, 30, 63, 0.1), 0 8px 10px -6px rgba(11, 30, 63, 0.04)',
} as const;

export const AUVRYN_BRAND_STRINGS = {
  name: 'AUVRYN',
  fullName: 'AUVRYN — The Intelligent Education Ecosystem',
  descriptor: 'THE INTELLIGENT EDUCATION ECOSYSTEM',
  tagline: 'One institution. One intelligent system.',
  subTagline: 'Connecting students, teachers, parents, administrators and institutions through intelligent operations, automation and AI.',
  copyright: '© 2026 AUVRYN. All rights reserved.',
} as const;

export interface AuvrynDesignTokens {
  colors: typeof AUVRYN_COLORS;
  typography: typeof AUVRYN_TYPOGRAPHY;
  spacing: typeof AUVRYN_SPACING;
  radius: typeof AUVRYN_RADIUS;
  shadows: typeof AUVRYN_SHADOWS;
  brand: typeof AUVRYN_BRAND_STRINGS;
}

export const auvrynTheme: AuvrynDesignTokens = {
  colors: AUVRYN_COLORS,
  typography: AUVRYN_TYPOGRAPHY,
  spacing: AUVRYN_SPACING,
  radius: AUVRYN_RADIUS,
  shadows: AUVRYN_SHADOWS,
  brand: AUVRYN_BRAND_STRINGS,
};
