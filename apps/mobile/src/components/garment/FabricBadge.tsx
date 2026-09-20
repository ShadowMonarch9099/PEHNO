/**
 * FabricBadge — coloured pill per fabric (spec: cotton=green, silk=gold, velvet=purple,
 * linen=olive, banarasi=maroon). Unknown fabrics render nothing.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { borderRadius, colors, spacing, typography } from '../../theme';

const FABRIC_COLORS: Record<string, string> = {
  cotton: colors.fabricCotton,
  linen: colors.fabricLinen,
  silk: colors.fabricSilk,
  raw_silk: colors.fabricSilk,
  kanjeevaram: colors.fabricSilk,
  banarasi: colors.fabricBaranasi,
  velvet: colors.fabricVelvet,
  georgette: colors.fabricGeorgette,
  chiffon: colors.fabricChiffon,
  crepe: colors.fabricCrepe,
  khadi: colors.fabricKhadi,
  net: colors.fabricNet,
};

interface Props {
  fabric: string;
  label?: string; // localised label; falls back to the slug
  compact?: boolean;
}

export const FabricBadge: React.FC<Props> = ({ fabric, label, compact }) => {
  if (!fabric || fabric === 'unknown') return null;
  const bg = FABRIC_COLORS[fabric] ?? colors.textMuted;
  return (
    <View style={[styles.pill, { backgroundColor: bg }, compact && styles.compact]}>
      <Text style={[styles.text, compact && styles.textCompact]} numberOfLines={1}>
        {label ?? fabric.replace(/_/g, ' ')}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: { alignSelf: 'flex-start', borderRadius: borderRadius.pill, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  compact: { paddingHorizontal: 6, paddingVertical: 1 },
  text: { ...typography.caption, color: colors.white, fontWeight: '700', textTransform: 'capitalize' },
  textCompact: { fontSize: 10 },
});
