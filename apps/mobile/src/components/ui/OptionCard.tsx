import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { borderRadius, colors, shadows, spacing, typography } from '../../theme';

interface Props {
  title: string;
  description?: string;
  emoji?: string;
  swatch?: string;
  selected: boolean;
  onPress: () => void;
}

export const OptionCard: React.FC<Props> = ({ title, description, emoji, swatch, selected, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.card, selected && styles.cardSelected]}
    accessibilityRole="radio"
    accessibilityState={{ selected }}
  >
    {swatch ? <View style={[styles.swatch, { backgroundColor: swatch }]} /> : null}
    {emoji ? <Text style={styles.emoji}>{emoji}</Text> : null}
    <View style={styles.text}>
      <Text style={[styles.title, selected && styles.titleSelected]}>{title}</Text>
      {description ? <Text style={styles.desc}>{description}</Text> : null}
    </View>
    <View style={[styles.radio, selected && styles.radioSelected]} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  cardSelected: { borderColor: colors.primary, backgroundColor: colors.background, ...shadows.sm },
  swatch: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.borderLight },
  emoji: { fontSize: 28 },
  text: { flex: 1, gap: 2 },
  title: { ...typography.h4 },
  titleSelected: { color: colors.primary },
  desc: { ...typography.caption },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.border },
  radioSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
});
