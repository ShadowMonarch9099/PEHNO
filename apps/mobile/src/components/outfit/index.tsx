/**
 * Outfit Components — OutfitCard, FestivalBanner, FestivalLookCard
 */
import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Garment, Outfit, Festival } from '../../store';
import { colors, spacing, borderRadius, typography, shadows } from '../../theme';
import { WeatherTag, OutfitRating } from '../ui';

const { width } = Dimensions.get('window');

// ── OutfitCard ─────────────────────────────────────────────────────────────────

interface OutfitCardProps {
  outfit: Outfit;
  garments?: Garment[];
  onPress?: () => void;
  onSave?: () => void;
  onRate?: (rating: number) => void;
  compact?: boolean;
}

export const OutfitCard: React.FC<OutfitCardProps> = ({
  outfit,
  garments = [],
  onPress,
  onSave,
  onRate,
  compact = false,
}) => {
  const displayGarments = garments.slice(0, 4);

  return (
    <TouchableOpacity
      style={[styles.outfitCard, compact && styles.outfitCardCompact]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* Garment collage */}
      <View style={styles.collageContainer}>
        {displayGarments.length > 0 ? (
          <View style={styles.collageGrid}>
            {displayGarments.map((g, i) => (
              <View
                key={g.id}
                style={[
                  styles.collageItem,
                  displayGarments.length === 1 && styles.collageItemFull,
                  displayGarments.length === 2 && styles.collageItemHalf,
                  displayGarments.length >= 3 && styles.collageItemQuarter,
                ]}
              >
                {g.thumbnail_url || g.image_url ? (
                  <Image
                    source={{ uri: g.thumbnail_url || g.image_url }}
                    style={styles.collageImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.collagePlaceholder}>
                    <Text style={{ fontSize: 28 }}>👗</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.outfitPlaceholder}>
            <Text style={{ fontSize: 48 }}>✨</Text>
            <Text style={styles.placeholderText}>Outfit Preview</Text>
          </View>
        )}

        {outfit.festival && (
          <View style={styles.festivalOverlay}>
            <Text style={styles.festivalOverlayText}>🎊 {outfit.festival}</Text>
          </View>
        )}
      </View>

      {/* Info strip */}
      <View style={styles.outfitInfo}>
        <View style={styles.outfitInfoRow}>
          <Text style={styles.outfitOccasion}>
            {outfit.occasion.replace('_', ' ')}
          </Text>
          <WeatherTag
            temperature={outfit.temperature_celsius}
            condition={outfit.weather_condition}
          />
        </View>

        {!compact && (
          <View style={styles.outfitActions}>
            <OutfitRating rating={outfit.rating} onRate={onRate} />
            <TouchableOpacity onPress={onSave} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={[styles.saveIcon, outfit.is_saved && styles.saveIconActive]}>
                {outfit.is_saved ? '🔖' : '📌'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

// ── FestivalBanner ─────────────────────────────────────────────────────────────

interface FestivalBannerProps {
  festival: Festival & { days_until: number };
  onPress?: () => void;
}

export const FestivalBanner: React.FC<FestivalBannerProps> = ({ festival, onPress }) => {
  const primaryColor = Object.values(festival.color_codes)[0] as string || colors.accent;

  return (
    <TouchableOpacity
      style={[styles.festivalBanner, { borderLeftColor: primaryColor }]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.festivalBannerLeft}>
        <View style={[styles.festivalColorSwatch, { backgroundColor: primaryColor }]} />
        <View>
          <Text style={styles.festivalName}>{festival.name}</Text>
          <Text style={styles.festivalDate}>
            {new Date(festival.date_this_year).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'long',
            })}
          </Text>
        </View>
      </View>
      <View style={styles.festivalBannerRight}>
        <Text style={styles.daysUntilNumber}>{festival.days_until}</Text>
        <Text style={styles.daysUntilLabel}>days</Text>
      </View>
    </TouchableOpacity>
  );
};

// ── FestivalLookCard ───────────────────────────────────────────────────────────

interface FestivalLookCardProps {
  look: Outfit;
  garments?: Garment[];
  festivalName: string;
  onPress?: () => void;
}

export const FestivalLookCard: React.FC<FestivalLookCardProps> = ({
  look,
  garments = [],
  festivalName,
  onPress,
}) => {
  return (
    <TouchableOpacity style={styles.festivalLookCard} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.festivalLookImages}>
        {garments.slice(0, 3).map((g) => (
          <View key={g.id} style={styles.festivalLookImage}>
            {g.thumbnail_url ? (
              <Image
                source={{ uri: g.thumbnail_url }}
                style={{ flex: 1 }}
                resizeMode="cover"
              />
            ) : (
              <Text style={{ fontSize: 24, textAlign: 'center' }}>👗</Text>
            )}
          </View>
        ))}
      </View>
      <Text style={styles.festivalLookLabel}>{festivalName} Look</Text>
    </TouchableOpacity>
  );
};

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  outfitCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    marginBottom: spacing.md,
    ...shadows.md,
  },
  outfitCardCompact: { marginBottom: spacing.sm },

  collageContainer: {
    height: 200,
    backgroundColor: colors.surfaceElevated,
    position: 'relative',
  },
  collageGrid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap' },
  collageItem: { overflow: 'hidden' },
  collageItemFull: { width: '100%', height: '100%' },
  collageItemHalf: { width: '50%', height: '100%' },
  collageItemQuarter: { width: '50%', height: '50%' },
  collageImage: { width: '100%', height: '100%' },
  collagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.borderLight,
  },
  outfitPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  placeholderText: { ...typography.caption, color: colors.textMuted },

  festivalOverlay: {
    position: 'absolute',
    bottom: spacing.xs,
    left: spacing.xs,
    backgroundColor: colors.primary + 'E0',
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  festivalOverlayText: { color: colors.white, fontSize: 11, fontWeight: '600' },

  outfitInfo: { padding: spacing.md, gap: spacing.sm },
  outfitInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  outfitOccasion: {
    ...typography.h4,
    textTransform: 'capitalize',
    flex: 1,
    marginRight: spacing.sm,
  },
  outfitActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  saveIcon: { fontSize: 22 },
  saveIconActive: { transform: [{ scale: 1.1 }] },

  // Festival Banner
  festivalBanner: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderLeftWidth: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  festivalBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  festivalColorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.borderLight,
  },
  festivalName: { ...typography.h4, color: colors.textPrimary },
  festivalDate: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  festivalBannerRight: { alignItems: 'center' },
  daysUntilNumber: { fontSize: 26, fontWeight: '700', color: colors.primary },
  daysUntilLabel: { ...typography.caption, color: colors.textMuted },

  // Festival Look Card
  festivalLookCard: {
    width: 140,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginRight: spacing.sm,
    ...shadows.sm,
  },
  festivalLookImages: { height: 120, flexDirection: 'row', flexWrap: 'wrap' },
  festivalLookImage: { width: '33.33%', height: '100%', backgroundColor: colors.borderLight },
  festivalLookLabel: {
    ...typography.caption,
    padding: spacing.xs,
    textAlign: 'center',
    color: colors.textSecondary,
  },
});
