/**
 * Locked-not-hidden presentation for gated features (build-plan rule 3).
 * Renders a frosted card with the feature name and an upgrade CTA.
 */
import { Feather } from '@expo/vector-icons';
import { type NavigationProp, useNavigation } from '@react-navigation/native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { MainTabParamList } from '../../navigation/types';
import type { Paywall } from '../../services/types';
import { borderRadius, colors, spacing, typography } from '../../theme';

interface Props {
  paywall: Paywall;
  /** Optional preview rendered behind the lock (e.g. blurred placeholders). */
  children?: React.ReactNode;
  compact?: boolean;
}

export const LockedFeature: React.FC<Props> = ({ paywall, children, compact }) => {
  const navigation = useNavigation<NavigationProp<MainTabParamList>>();
  const tier = paywall.required_tier === 'pro' ? 'Pro' : 'Plus';
  const goUpgrade = () =>
    navigation.navigate('Settings', {
      screen: 'Subscription',
      params: { highlight: paywall.required_tier === 'pro' ? 'pro' : 'plus', reason: paywall.feature },
    });

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      {children ? <View style={styles.preview}>{children}</View> : null}
      <View style={styles.overlay}>
        <View style={styles.lockCircle}>
          <Feather name="lock" size={18} color={colors.primary} />
        </View>
        <Text style={styles.title}>{paywall.message}</Text>
        <TouchableOpacity style={styles.cta} onPress={goUpgrade} accessibilityRole="button">
          <Text style={styles.ctaText}>Unlock with {tier}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

/** Ghost outfit tiles used as the "blurred" preview behind locks. */
export const GhostLooks: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <View style={styles.ghostRow}>
    {Array.from({ length: count }).map((_, i) => (
      <View key={i} style={styles.ghost} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  wrap: { borderRadius: borderRadius.xl, overflow: 'hidden', backgroundColor: colors.surfaceElevated, minHeight: 160 },
  wrapCompact: { minHeight: 110 },
  preview: { opacity: 0.35 },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', padding: spacing.md, gap: spacing.sm, backgroundColor: 'rgba(255,248,241,0.55)' },
  lockCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  title: { ...typography.body2, color: colors.textPrimary, textAlign: 'center' },
  cta: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.pill, backgroundColor: colors.primary },
  ctaText: { ...typography.label, color: colors.textInverse },
  ghostRow: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md },
  ghost: { flex: 1, aspectRatio: 0.8, borderRadius: borderRadius.md, backgroundColor: colors.border },
});
