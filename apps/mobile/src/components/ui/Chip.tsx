import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, type ViewStyle } from 'react-native';
import { borderRadius, colors, spacing, typography } from '../../theme';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

export const Chip: React.FC<ChipProps> = ({ label, selected, onPress, style }) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={!onPress}
    style={[styles.chip, selected && styles.chipSelected, style]}
    accessibilityRole="button"
    accessibilityState={{ selected: !!selected }}
  >
    <Text style={[styles.text, selected && styles.textSelected]}>{label}</Text>
  </TouchableOpacity>
);

interface ChipGroupProps<T extends string> {
  options: { slug: T; label: string }[];
  value: T | T[] | null;
  onChange: (value: T) => void;
  scroll?: boolean;
  allLabel?: string;
  onAll?: () => void;
}

/** Single- or multi-select chip row. Pass an array `value` for multi-select. */
export function ChipGroup<T extends string>({ options, value, onChange, scroll, allLabel, onAll }: ChipGroupProps<T>) {
  const isSelected = (slug: T) => (Array.isArray(value) ? value.includes(slug) : value === slug);
  const content = (
    <>
      {allLabel ? <Chip label={allLabel} selected={value === null || (Array.isArray(value) && value.length === 0)} onPress={onAll} /> : null}
      {options.map((o) => (
        <Chip key={o.slug} label={o.label} selected={isSelected(o.slug)} onPress={() => onChange(o.slug)} />
      ))}
    </>
  );
  return scroll ? (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {content}
    </ScrollView>
  ) : (
    <View style={[styles.row, styles.wrap]}>{content}</View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  text: { ...typography.label, color: colors.textPrimary },
  textSelected: { color: colors.textInverse },
  row: { flexDirection: 'row', gap: spacing.sm },
  wrap: { flexWrap: 'wrap' },
});
