/**
 * OutfitCard — garment collage + rationale + like/dislike/save/wear actions.
 */
import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { Outfit } from '../../services/types';
import { labelFor, useMetaStore } from '../../store';
import { borderRadius, colors, shadows, spacing, typography } from '../../theme';

interface Props {
  outfit: Outfit;
  onFeedback?: (value: 1 | -1) => void;
  onToggleSave?: () => void;
  onWear?: () => void;
  onShare?: () => void;
  onGarmentPress?: (garmentId: string) => void;
  compact?: boolean;
  busy?: boolean;
}

export const OutfitCard: React.FC<Props> = ({ outfit: o, onFeedback, onToggleSave, onWear, onShare, onGarmentPress, compact, busy }) => {
  const options = useMetaStore((s) => s.options);
  const worn = Boolean(o.worn_at);
  return (
    <View style={styles.card}>
      <View style={[styles.collage, compact && styles.collageCompact]}>
        {o.garments.map((g, i) => (
          <TouchableOpacity
            key={g.id}
            style={[styles.tile, i === 0 && o.garments.length > 1 && styles.tileHero]}
            onPress={() => onGarmentPress?.(g.id)}
            disabled={!onGarmentPress}
          >
            <Image source={{ uri: g.thumbnail_url ?? g.image_url }} style={styles.tileImage} />
            <Text style={styles.tileLabel} numberOfLines={1}>
              {labelFor(options.garment_types, g.garment_type)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {!compact && o.rationale.length ? (
        <View style={styles.why}>
          {o.rationale.slice(0, 3).map((r) => (
            <Text key={r} style={styles.whyText}>
              • {r}
            </Text>
          ))}
        </View>
      ) : null}

      {onFeedback || onToggleSave || onWear || onShare ? (
        <View style={styles.actions}>
          {onFeedback ? (
            <>
              <IconButton icon="thumbs-up" active={o.feedback === 1} onPress={() => onFeedback(1)} disabled={busy} label="Like" />
              <IconButton icon="thumbs-down" active={o.feedback === -1} onPress={() => onFeedback(-1)} disabled={busy} label="Dislike" />
            </>
          ) : null}
          {onToggleSave ? <IconButton icon="bookmark" active={o.is_saved} onPress={onToggleSave} disabled={busy} label="Save" /> : null}
          {onShare ? <IconButton icon="share-2" active={o.is_public} onPress={onShare} disabled={busy} label="Share" /> : null}
          {onWear ? (
            <TouchableOpacity style={[styles.wear, worn && styles.wearDone]} onPress={onWear} disabled={busy || worn}>
              <Feather name={worn ? 'check' : 'sun'} size={16} color={worn ? colors.success : colors.textInverse} />
              <Text style={[styles.wearText, worn && styles.wearTextDone]}>{worn ? 'Worn today' : 'Wearing this'}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

const IconButton = ({ icon, active, onPress, disabled, label }: { icon: React.ComponentProps<typeof Feather>['name']; active: boolean; onPress: () => void; disabled?: boolean; label: string }) => (
  <TouchableOpacity onPress={onPress} disabled={disabled} style={[styles.iconBtn, active && styles.iconBtnActive]} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: active }}>
    <Feather name={icon} size={18} color={active ? colors.textInverse : colors.primary} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.xl, padding: spacing.md, gap: spacing.md, ...shadows.sm },
  collage: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  collageCompact: { gap: spacing.xs },
  tile: { width: '31%', aspectRatio: 0.8, borderRadius: borderRadius.md, overflow: 'hidden', backgroundColor: colors.borderLight },
  tileHero: { width: '64%' },
  tileImage: { width: '100%', height: '100%' },
  tileLabel: { position: 'absolute', bottom: 0, left: 0, right: 0, ...typography.caption, color: colors.white, backgroundColor: colors.overlay, paddingHorizontal: spacing.xs, paddingVertical: 2, textTransform: 'capitalize' },
  why: { gap: 2 },
  whyText: { ...typography.body2 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  iconBtnActive: { backgroundColor: colors.primary },
  wear: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, height: 40, borderRadius: borderRadius.pill, backgroundColor: colors.primary },
  wearDone: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.success },
  wearText: { ...typography.label, color: colors.textInverse },
  wearTextDone: { color: colors.success },
});
