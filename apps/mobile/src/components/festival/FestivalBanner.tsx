/**
 * FestivalBanner — festival name, countdown badge, colour swatches, dress code.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { Festival } from '../../services/types';
import { borderRadius, colors, shadows, spacing, typography } from '../../theme';
import { hexFor } from '../../utils/colors';

export const countdownLabel = (f: Festival) =>
  f.is_active ? 'Happening now' : f.days_until === 0 ? 'Today' : f.days_until === 1 ? 'Tomorrow' : `In ${f.days_until} days`;

const fmt = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

export const FestivalBanner: React.FC<{ festival: Festival; onPress: () => void }> = ({ festival: f, onPress }) => (
  <TouchableOpacity style={[styles.card, f.is_active && styles.cardActive]} onPress={onPress} accessibilityRole="button">
    <View style={styles.top}>
      <Text style={styles.title}>{f.name}</Text>
      <Text style={[styles.badge, f.is_active && styles.badgeActive]}>{countdownLabel(f)}</Text>
    </View>
    <Text style={typography.caption}>
      {fmt(f.start_date)}
      {f.end_date !== f.start_date ? ` – ${fmt(f.end_date)}` : ''}
      {f.is_relevant ? '' : ' · other regions'}
    </Text>
    <View style={styles.swatches}>
      {f.colors.slice(0, 7).map((c) => (
        <View key={c} style={[styles.swatch, { backgroundColor: hexFor(c) }]} />
      ))}
    </View>
    <Text style={typography.body2} numberOfLines={2}>
      {f.dress_code}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.xl, padding: spacing.md, gap: spacing.xs, ...shadows.sm },
  cardActive: { borderWidth: 1, borderColor: colors.primary },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { ...typography.h3 },
  badge: { ...typography.caption, fontWeight: '700', color: colors.primary, backgroundColor: colors.background, borderRadius: borderRadius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  badgeActive: { backgroundColor: colors.primary, color: colors.textInverse },
  swatches: { flexDirection: 'row', gap: 6, marginVertical: spacing.xs },
  swatch: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: colors.borderLight },
});
