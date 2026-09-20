/**
 * OccasionTag — small rounded chip for an occasion tag (read-only).
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { borderRadius, colors, spacing, typography } from '../../theme';

export const OccasionTag: React.FC<{ label: string }> = ({ label }) => (
  <View style={styles.chip}>
    <Text style={styles.text} numberOfLines={1}>
      {label}
    </Text>
  </View>
);

export const OccasionTags: React.FC<{ labels: string[]; max?: number }> = ({ labels, max = 3 }) => (
  <View style={styles.row}>
    {labels.slice(0, max).map((l) => (
      <OccasionTag key={l} label={l} />
    ))}
    {labels.length > max ? <Text style={styles.more}>+{labels.length - max}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, alignItems: 'center' },
  chip: { borderRadius: borderRadius.pill, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.sm, paddingVertical: 2, backgroundColor: colors.background },
  text: { ...typography.caption, color: colors.textSecondary },
  more: { ...typography.caption, color: colors.textMuted },
});
