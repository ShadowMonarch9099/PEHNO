/**
 * PEHNO Design System — Colors, Typography, Spacing, Common Styles
 */
import { StyleSheet, Platform } from 'react-native';

// ── Color Palette ──────────────────────────────────────────────────────────────
export const colors = {
  // Frontend Mapped Colors
  primary: '#964900',       // primary
  primaryContainer: '#fd8621',
  secondary: '#426087',
  
  background: '#fff8f1',
  surface: '#fff8f1',
  surfaceElevated: '#faf3e8', // using surface-container-low

  onSurface: '#1e1b15',
  onSurfaceVariant: '#554334',
  outlineVariant: '#dbc2ae',

  // Existing theme keys updated to map frontend colors
  primaryLight: '#fd8621',
  primaryDark: '#554334',

  accent: '#426087',
  accentLight: '#6181ac',
  accentDark: '#29405d',

  textPrimary: '#1e1b15',
  textSecondary: '#554334',
  textMuted: '#8f7a69',
  textInverse: '#fff8f1',

  success: '#2D7A4F',
  warning: '#D4A017',
  error: '#C0392B',
  info: '#2980B9',

  border: '#dbc2ae',
  borderLight: '#efe7dc', // surface-container-high

  white: '#FFFFFF',
  black: '#000000',

  // Fabric badge colors
  fabricCotton: '#4CAF50',
  fabricSilk: '#D4A017',
  fabricVelvet: '#7B2D8B',
  fabricLinen: '#8BC34A',
  fabricBaranasi: '#8B0000',
  fabricGeorgette: '#9C27B0',
  fabricChiffon: '#E91E63',
  fabricCrepe: '#795548',
  fabricKhadi: '#FF6F00',
  fabricNet: '#607D8B',
  fabricSatin: '#F06292',
  fabricPolyester: '#546E7A',
  fabricRayon: '#26C6DA',
  fabricKanjeevaram: '#880E4F',

  // Overlay
  overlay: 'rgba(30, 27, 21, 0.5)',     // Based on onSurface (#1e1b15)
  overlayLight: 'rgba(30, 27, 21, 0.2)',
} as const;

// ── Typography ─────────────────────────────────────────────────────────────────
export const fonts = {
  regular: Platform.select({ ios: 'System', android: 'Roboto', default: 'System' }),
  medium: Platform.select({ ios: 'System', android: 'Roboto-Medium', default: 'System' }),
  bold: Platform.select({ ios: 'System', android: 'Roboto-Bold', default: 'System' }),
};

export const typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, color: colors.textPrimary, letterSpacing: -0.5 },
  h2: { fontSize: 22, fontWeight: '700' as const, color: colors.textPrimary },
  h3: { fontSize: 18, fontWeight: '600' as const, color: colors.textPrimary },
  h4: { fontSize: 16, fontWeight: '600' as const, color: colors.textPrimary },
  body1: { fontSize: 16, fontWeight: '400' as const, color: colors.textPrimary },
  body2: { fontSize: 14, fontWeight: '400' as const, color: colors.textSecondary },
  caption: { fontSize: 12, fontWeight: '400' as const, color: colors.textMuted },
  label: { fontSize: 13, fontWeight: '500' as const, color: colors.textSecondary },
  button: { fontSize: 16, fontWeight: '600' as const },
} as const;

// ── Spacing ────────────────────────────────────────────────────────────────────
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

// ── Border Radius ──────────────────────────────────────────────────────────────
export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  pill: 100,
} as const;

// ── Shadows ────────────────────────────────────────────────────────────────────
export const shadows = {
  sm: {
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;

// ── Common Styles ──────────────────────────────────────────────────────────────
export const commonStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.md,
  },
  screenPadding: {
    paddingHorizontal: spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.sm,
  },
});
