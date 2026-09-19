/**
 * Shows what the AI concluded and lets the user confirm in one tap, pick an
 * alternative candidate, or open the full editor. Every tap is training data.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { Garment, Option } from '../../services/types';
import { labelFor } from '../../store';
import { borderRadius, colors, spacing, typography } from '../../theme';

interface Props {
  garment: Garment;
  typeOptions: Option[];
  onConfirm: () => void;
  onPickType: (slug: string) => void;
  onEdit: () => void;
  onRetry: () => void;
  busy?: boolean;
}

export const AiSuggestionCard: React.FC<Props> = ({ garment: g, typeOptions, onConfirm, onPickType, onEdit, onRetry, busy }) => {
  if (g.classification_status === 'pending') {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>✨ Classifying…</Text>
        <Text style={typography.body2}>Usually a few seconds. You can fill in details yourself meanwhile.</Text>
      </View>
    );
  }
  if (g.classification_status === 'failed') {
    return (
      <View style={[styles.card, styles.warn]}>
        <Text style={styles.title}>Couldn't classify this photo</Text>
        <Text style={typography.body2}>Try again, or add the details yourself.</Text>
        <View style={styles.row}>
          <Action label="Retry" onPress={onRetry} disabled={busy} />
          <Action label="Add details" onPress={onEdit} />
        </View>
      </View>
    );
  }
  if (g.user_verified) return null;

  const ai = g.ai_labels;
  const known = g.garment_type !== 'unknown';
  const alternatives = (ai?.candidates.garment_types ?? [])
    .filter((c) => c.label !== g.garment_type && c.confidence >= 0.05)
    .slice(0, 3);
  const pct = Math.round((ai?.confidence ?? 0) * 100);

  return (
    <View style={styles.card}>
      {known ? (
        <>
          <Text style={styles.title}>
            AI thinks this is a {labelFor(typeOptions, g.garment_type).toLowerCase()}
            {pct ? <Text style={styles.pct}> · {pct}% sure</Text> : null}
          </Text>
          <Text style={typography.body2}>Is that right? Your answer improves the AI for everyone.</Text>
          <View style={styles.row}>
            <Action label="Yes, correct" onPress={onConfirm} primary disabled={busy} />
            <Action label="Edit" onPress={onEdit} />
          </View>
        </>
      ) : (
        <>
          <Text style={styles.title}>What is this item?</Text>
          <Text style={typography.body2}>The AI wasn't sure. Pick the closest match:</Text>
        </>
      )}
      {alternatives.length ? (
        <View style={styles.alts}>
          {!known ? null : <Text style={styles.altLabel}>Or was it a…</Text>}
          <View style={styles.row}>
            {alternatives.map((c) => (
              <Action key={c.label} label={labelFor(typeOptions, c.label)} onPress={() => onPickType(c.label)} disabled={busy} />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
};

const Action = ({ label, onPress, primary, disabled }: { label: string; onPress: () => void; primary?: boolean; disabled?: boolean }) => (
  <TouchableOpacity onPress={onPress} disabled={disabled} style={[styles.action, primary && styles.actionPrimary]} accessibilityRole="button">
    <Text style={[styles.actionText, primary && styles.actionTextPrimary]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.lg, padding: spacing.md, gap: spacing.sm, borderWidth: 1, borderColor: colors.borderLight },
  warn: { borderColor: colors.warning },
  title: { ...typography.h4 },
  pct: { ...typography.caption },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  alts: { gap: spacing.xs },
  altLabel: { ...typography.caption },
  action: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.pill, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.background },
  actionPrimary: { backgroundColor: colors.primary },
  actionText: { ...typography.label, color: colors.primary },
  actionTextPrimary: { color: colors.textInverse },
});
