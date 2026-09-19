import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { borderRadius, colors, spacing, typography } from '../../theme';

interface Props {
  value: number; // 0..1
  label?: string;
  hint?: string;
}

export const ProgressBar: React.FC<Props> = ({ value, label, hint }) => {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={styles.wrap} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}>
      {label ? (
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label}</Text>
          {hint ? <Text style={styles.hint}>{hint}</Text> : null}
        </View>
      ) : null}
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%` }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { ...typography.label, color: colors.textPrimary },
  hint: { ...typography.caption },
  track: { height: 8, borderRadius: borderRadius.pill, backgroundColor: colors.borderLight, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.primary, borderRadius: borderRadius.pill },
});
