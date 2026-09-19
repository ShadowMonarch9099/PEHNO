import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, spacing, typography } from '../../theme';

interface Props {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backLabel?: string;
  right?: React.ReactNode;
  step?: { current: number; total: number };
}

export const ScreenHeader: React.FC<Props> = ({ title, subtitle, onBack, backLabel = 'Back', right, step }) => (
  <View style={styles.wrap}>
    <View style={styles.topRow}>
      {onBack ? (
        <TouchableOpacity onPress={onBack} hitSlop={12} accessibilityRole="button">
          <Text style={styles.back}>← {backLabel}</Text>
        </TouchableOpacity>
      ) : (
        <View />
      )}
      {step ? (
        <Text style={styles.step}>
          {step.current} / {step.total}
        </Text>
      ) : (
        right ?? null
      )}
    </View>
    <Text style={typography.h1}>{title}</Text>
    {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, gap: spacing.xs },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  back: { ...typography.label, color: colors.primary },
  step: { ...typography.caption },
  subtitle: { ...typography.body2, marginTop: spacing.xs },
});
