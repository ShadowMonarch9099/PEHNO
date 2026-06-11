/**
 * Garment Components — GarmentCard, FabricBadge, OccasionTag
 */
import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Garment } from '../../store';
import { colors, spacing, borderRadius, typography, shadows } from '../../theme';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - spacing.md * 3) / 2;

// ── FabricBadge ────────────────────────────────────────────────────────────────

const FABRIC_COLORS: Record<string, string> = {
  cotton: '#4CAF50',
  silk: '#D4A017',
  raw_silk: '#D4A017',
  velvet: '#7B2D8B',
  linen: '#8BC34A',
  banarasi: '#8B0000',
  kanjeevaram: '#880E4F',
  georgette: '#9C27B0',
  chiffon: '#E91E63',
  crepe: '#795548',
  khadi: '#FF6F00',
  net: '#607D8B',
  satin: '#F06292',
  polyester: '#546E7A',
  rayon: '#26C6DA',
};

interface FabricBadgeProps {
  fabric: string;
}

export const FabricBadge: React.FC<FabricBadgeProps> = ({ fabric }) => {
  const bgColor = FABRIC_COLORS[fabric] || colors.textMuted;
  return (
    <View style={[styles.fabricBadge, { backgroundColor: bgColor + '20', borderColor: bgColor + '40' }]}>
      <Text style={[styles.fabricBadgeText, { color: bgColor }]}>
        {fabric.replace('_', ' ')}
      </Text>
    </View>
  );
};

// ── OccasionTag ────────────────────────────────────────────────────────────────

interface OccasionTagProps {
  tag: string;
}

export const OccasionTag: React.FC<OccasionTagProps> = ({ tag }) => {
  return (
    <View style={styles.occasionTag}>
      <Text style={styles.occasionTagText}>{tag.replace('_', ' ')}</Text>
    </View>
  );
};

// ── GarmentCard ────────────────────────────────────────────────────────────────

interface GarmentCardProps {
  garment: Garment;
  onPress: (garment: Garment) => void;
  size?: 'sm' | 'md';
}

export const GarmentCard: React.FC<GarmentCardProps> = ({ garment, onPress, size = 'md' }) => {
  const cardWidth = size === 'sm' ? 120 : CARD_WIDTH;
  const imageHeight = size === 'sm' ? 120 : 160;

  return (
    <TouchableOpacity
      style={[styles.garmentCard, { width: cardWidth }]}
      onPress={() => onPress(garment)}
      activeOpacity={0.9}
    >
      <View style={[styles.imageContainer, { height: imageHeight }]}>
        {garment.thumbnail_url || garment.image_url ? (
          <Image
            source={{ uri: garment.thumbnail_url || garment.image_url }}
            style={styles.garmentImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>👗</Text>
          </View>
        )}
        {garment.classification_status === 'pending' && (
          <View style={styles.classifyingBadge}>
            <Text style={styles.classifyingText}>AI ✦</Text>
          </View>
        )}
        {garment.user_verified && (
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedText}>✓</Text>
          </View>
        )}
      </View>

      <View style={styles.garmentInfo}>
        <Text style={styles.garmentType} numberOfLines={1}>
          {garment.garment_type.replace('_', ' ')}
        </Text>
        <FabricBadge fabric={garment.fabric_type} />

        {size === 'md' && garment.occasion_tags.length > 0 && (
          <View style={styles.tagsRow}>
            {garment.occasion_tags.slice(0, 2).map((tag) => (
              <OccasionTag key={tag} tag={tag} />
            ))}
          </View>
        )}

        <View style={styles.wearRow}>
          <Text style={styles.wearCount}>👗 {garment.wear_count}x</Text>
          {garment.purchase_price && garment.wear_count > 0 && (
            <Text style={styles.cpw}>
              ₹{Math.round(garment.purchase_price / garment.wear_count)}/wear
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  garmentCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
    ...shadows.md,
  },
  imageContainer: {
    width: '100%',
    backgroundColor: colors.surfaceElevated,
    position: 'relative',
  },
  garmentImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.borderLight,
  },
  imagePlaceholderText: { fontSize: 40 },
  classifyingBadge: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  classifyingText: { fontSize: 10, fontWeight: '700', color: colors.textPrimary },
  verifiedBadge: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    backgroundColor: colors.success,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedText: { color: colors.white, fontSize: 11, fontWeight: '700' },

  garmentInfo: {
    padding: spacing.sm,
    gap: 4,
  },
  garmentType: {
    ...typography.label,
    color: colors.textPrimary,
    textTransform: 'capitalize',
    fontWeight: '600',
  },

  fabricBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
  },
  fabricBadgeText: { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },

  occasionTag: {
    backgroundColor: colors.borderLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  occasionTagText: {
    fontSize: 10,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },

  wearRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  wearCount: { ...typography.caption, color: colors.textMuted },
  cpw: { ...typography.caption, color: colors.primary, fontWeight: '600' },
});
