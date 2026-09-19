import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { Garment } from '../../services/types';
import { borderRadius, colors, shadows, spacing, typography } from '../../theme';

interface Props {
  garment: Garment;
  onPress: () => void;
  width: number;
}

const STATUS_LABEL: Record<Garment['classification_status'], string> = {
  pending: 'Classifying…',
  complete: '',
  failed: 'Needs details',
};

const pretty = (s: string) => s.replace(/_/g, ' ');

export const GarmentCard: React.FC<Props> = ({ garment, onPress, width }) => {
  const status = STATUS_LABEL[garment.classification_status];
  const title = garment.garment_type === 'unknown' ? 'New item' : pretty(garment.garment_type);
  const sub = garment.fabric_type === 'unknown' ? null : pretty(garment.fabric_type);
  return (
    <TouchableOpacity onPress={onPress} style={[styles.card, { width }]} accessibilityRole="button" accessibilityLabel={title}>
      <Image source={{ uri: garment.thumbnail_url ?? garment.image_url }} style={[styles.image, { height: width * 1.2 }]} />
      {status ? (
        <View style={[styles.badge, garment.classification_status === 'failed' && styles.badgeWarn]}>
          <Text style={styles.badgeText}>{status}</Text>
        </View>
      ) : null}
      {garment.user_verified ? (
        <View style={[styles.badge, styles.badgeVerified]}>
          <Text style={styles.badgeText}>✓</Text>
        </View>
      ) : null}
      <View style={styles.meta}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {sub ?? ' '}
          {garment.wear_count > 0 ? ` · worn ${garment.wear_count}×` : ''}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: { borderRadius: borderRadius.lg, backgroundColor: colors.surfaceElevated, overflow: 'hidden', ...shadows.sm },
  image: { width: '100%', backgroundColor: colors.borderLight },
  badge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.overlay,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.pill,
  },
  badgeWarn: { backgroundColor: colors.warning },
  badgeVerified: { left: undefined, right: spacing.sm, backgroundColor: colors.success },
  badgeText: { ...typography.caption, color: colors.white, fontWeight: '600' },
  meta: { padding: spacing.sm, gap: 2 },
  title: { ...typography.label, color: colors.textPrimary, textTransform: 'capitalize' },
  sub: { ...typography.caption, textTransform: 'capitalize' },
});
