/**
 * PEHNO UI Components
 */
import React from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  Modal,
  ViewStyle,
  TextStyle,
  Animated,
} from 'react-native';
import { colors, spacing, borderRadius, typography, shadows } from '../../theme';

// ── PrimaryButton ──────────────────────────────────────────────────────────────

interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export const PrimaryButton: React.FC<ButtonProps> = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  style,
  textStyle,
  fullWidth = true,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.primaryButton,
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.buttonDisabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color={colors.background} size="small" />
      ) : (
        <Text style={[styles.primaryButtonText, textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

// ── SecondaryButton ────────────────────────────────────────────────────────────

export const SecondaryButton: React.FC<ButtonProps> = ({
  title,
  onPress,
  disabled = false,
  style,
  fullWidth = true,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.secondaryButton,
        fullWidth && styles.fullWidth,
        disabled && styles.buttonDisabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
    >
      <Text style={styles.secondaryButtonText}>{title}</Text>
    </TouchableOpacity>
  );
};

// ── LoadingOverlay ─────────────────────────────────────────────────────────────

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  message = 'Loading...',
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlayContainer}>
        <View style={styles.overlayCard}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>P</Text>
          </View>
          <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: spacing.md }} />
          <Text style={styles.overlayMessage}>{message}</Text>
        </View>
      </View>
    </Modal>
  );
};

// ── UpgradePrompt ──────────────────────────────────────────────────────────────

interface UpgradePromptProps {
  feature: string;
  onUpgrade?: () => void;
}

export const UpgradePrompt: React.FC<UpgradePromptProps> = ({ feature, onUpgrade }) => {
  return (
    <View style={styles.upgradeContainer}>
      <View style={styles.upgradeBlur} />
      <View style={styles.upgradeContent}>
        <Text style={styles.lockIcon}>🔒</Text>
        <Text style={styles.upgradeTitle}>Plus Feature</Text>
        <Text style={styles.upgradeBody}>{feature} is available with Pehno Plus</Text>
        <TouchableOpacity style={styles.upgradeButton} onPress={onUpgrade} activeOpacity={0.85}>
          <Text style={styles.upgradeButtonText}>Upgrade to Plus →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ── WeatherTag ─────────────────────────────────────────────────────────────────

interface WeatherTagProps {
  temperature: number;
  condition: string;
}

export const WeatherTag: React.FC<WeatherTagProps> = ({ temperature, condition }) => {
  const icon = getWeatherIcon(condition);
  return (
    <View style={styles.weatherTag}>
      <Text style={styles.weatherIcon}>{icon}</Text>
      <Text style={styles.weatherText}>{Math.round(temperature)}°C · {condition}</Text>
    </View>
  );
};

function getWeatherIcon(condition: string): string {
  const c = condition.toLowerCase();
  if (c.includes('rain') || c.includes('drizzle')) return '🌧️';
  if (c.includes('cloud')) return '⛅';
  if (c.includes('thunder')) return '⛈️';
  if (c.includes('snow')) return '❄️';
  if (c.includes('clear') || c.includes('sun')) return '☀️';
  if (c.includes('mist') || c.includes('fog')) return '🌫️';
  return '🌤️';
}

// ── OutfitRating ───────────────────────────────────────────────────────────────

interface OutfitRatingProps {
  rating?: number;
  onRate?: (rating: number) => void;
  readonly?: boolean;
}

export const OutfitRating: React.FC<OutfitRatingProps> = ({
  rating,
  onRate,
  readonly = false,
}) => {
  return (
    <View style={styles.ratingRow}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => !readonly && onRate?.(star)}
          disabled={readonly}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <Text style={[styles.star, rating && star <= rating && styles.starFilled]}>
            {rating && star <= rating ? '★' : '☆'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// ── ColorDot (Navratri) ────────────────────────────────────────────────────────

interface ColorDotProps {
  color: string;
  isToday?: boolean;
  dayLabel?: string;
  size?: number;
}

export const ColorDot: React.FC<ColorDotProps> = ({
  color,
  isToday = false,
  dayLabel,
  size = 40,
}) => {
  return (
    <View style={styles.colorDotContainer}>
      <View
        style={[
          styles.colorDot,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
          isToday && styles.colorDotToday,
        ]}
      />
      {dayLabel && <Text style={styles.colorDotLabel}>{dayLabel}</Text>}
      {isToday && <Text style={styles.todayBadge}>Today</Text>}
    </View>
  );
};

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Buttons
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    ...shadows.sm,
  },
  primaryButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: { opacity: 0.6 },
  fullWidth: { width: '100%' },

  // Loading Overlay
  overlayContainer: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    width: 220,
    ...shadows.lg,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: colors.background,
    fontSize: 28,
    fontWeight: '700',
  },
  overlayMessage: {
    ...typography.body2,
    marginTop: spacing.sm,
    textAlign: 'center',
    color: colors.textSecondary,
  },

  // Upgrade Prompt
  upgradeContainer: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: borderRadius.lg,
    margin: spacing.md,
  },
  upgradeBlur: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(253, 248, 240, 0.85)',
  },
  upgradeContent: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  lockIcon: { fontSize: 32 },
  upgradeTitle: {
    ...typography.h4,
    color: colors.primary,
    marginTop: spacing.sm,
  },
  upgradeBody: {
    ...typography.body2,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  upgradeButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.pill,
  },
  upgradeButtonText: {
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: 14,
  },

  // Weather Tag
  weatherTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.pill,
    gap: spacing.xs,
  },
  weatherIcon: { fontSize: 14 },
  weatherText: { ...typography.caption, color: colors.textSecondary },

  // Rating
  ratingRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  star: {
    fontSize: 22,
    color: colors.borderLight,
  },
  starFilled: {
    color: colors.accent,
  },

  // Color Dot (Navratri)
  colorDotContainer: {
    alignItems: 'center',
    gap: 4,
  },
  colorDot: {
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorDotToday: {
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },
  colorDotLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  todayBadge: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
