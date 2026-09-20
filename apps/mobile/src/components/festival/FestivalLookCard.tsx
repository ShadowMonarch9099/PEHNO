/**
 * FestivalLookCard — an OutfitCard with a festival context strip above it.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { borderRadius, colors, spacing, typography } from '../../theme';
import { OutfitCard } from '../outfit/OutfitCard';

type CardProps = React.ComponentProps<typeof OutfitCard>;

interface Props extends CardProps {
  festivalName: string;
  context?: string; // e.g. "Day 3 · grey" or "Reception"
}

export const FestivalLookCard: React.FC<Props> = ({ festivalName, context, ...card }) => (
  <View style={styles.wrap}>
    <View style={styles.strip}>
      <Text style={styles.stripText}>🪔 {festivalName}</Text>
      {context ? <Text style={styles.stripContext}>{context}</Text> : null}
    </View>
    <OutfitCard {...card} />
  </View>
);

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  strip: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.primary, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: 6 },
  stripText: { ...typography.label, color: colors.textInverse },
  stripContext: { ...typography.caption, color: colors.textInverse },
});
