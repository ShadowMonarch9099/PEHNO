/**
 * BodyTypeScreen — Visual body type selector with illustrated silhouettes
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { PrimaryButton } from '../../components/ui';
import { userApi } from '../../services/api';
import { useUserStore } from '../../store';

const BODY_TYPES = [
  {
    value: 'petite',
    label: 'Petite',
    emoji: '🌸',
    silhouette: '🧍',
    description: 'Under 5\'3" in height',
    style_tip: 'High-waist and vertical patterns elongate beautifully',
  },
  {
    value: 'regular',
    label: 'Regular',
    emoji: '⚖️',
    silhouette: '🧍‍♀️',
    description: '5\'3" to 5\'7" in height',
    style_tip: 'Most silhouettes and cuts work wonderfully',
  },
  {
    value: 'tall',
    label: 'Tall',
    emoji: '🌴',
    silhouette: '🧍',
    description: '5\'7" and above',
    style_tip: 'Long kurtas, floor-length anarkalis, and 9-yard sarees drape beautifully',
  },
  {
    value: 'plus',
    label: 'Plus',
    emoji: '🌺',
    silhouette: '🧍‍♀️',
    description: 'Fuller figure',
    style_tip: 'Wrap sarees, A-line kurtas, and empire waist silhouettes are your best friends',
  },
];

export default function BodyTypeScreen({ navigation }: any) {
  const [selected, setSelected] = useState('regular');
  const [loading, setLoading] = useState(false);
  const { updateProfile } = useUserStore();

  const handleNext = async () => {
    setLoading(true);
    try {
      await userApi.updateMe({ body_type: selected });
      updateProfile({ body_type: selected as any });
    } catch {}
    setLoading(false);
    navigation.navigate('SkinTone');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.step}>Profile Setup • 2/5</Text>
        <Text style={styles.title}>Your body type</Text>
        <Text style={styles.subtitle}>
          We use this to recommend the most flattering silhouettes for you
        </Text>

        <View style={styles.grid}>
          {BODY_TYPES.map((bt) => (
            <TouchableOpacity
              key={bt.value}
              style={[styles.card, selected === bt.value && styles.cardSelected]}
              onPress={() => setSelected(bt.value)}
              activeOpacity={0.85}
            >
              <View style={styles.silhouetteContainer}>
                <Text style={styles.silhouette}>{bt.silhouette}</Text>
              </View>
              <Text style={styles.cardEmoji}>{bt.emoji}</Text>
              <Text style={[styles.cardLabel, selected === bt.value && styles.cardLabelSelected]}>
                {bt.label}
              </Text>
              <Text style={styles.cardDescription}>{bt.description}</Text>
              {selected === bt.value && (
                <View style={styles.tipContainer}>
                  <Text style={styles.tip}>💡 {bt.style_tip}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <PrimaryButton title="Continue →" onPress={handleNext} loading={loading} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.xl, gap: spacing.lg },
  step: { ...typography.caption, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  title: { ...typography.h2 },
  subtitle: { ...typography.body2, color: colors.textSecondary },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  card: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.borderLight,
    gap: spacing.xs,
  },
  cardSelected: { borderColor: colors.primary, backgroundColor: colors.primary + '08' },
  silhouetteContainer: {
    width: 64,
    height: 80,
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  silhouette: { fontSize: 40 },
  cardEmoji: { fontSize: 22 },
  cardLabel: { ...typography.h4, color: colors.textPrimary },
  cardLabelSelected: { color: colors.primary },
  cardDescription: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
  tipContainer: {
    backgroundColor: colors.accent + '20',
    borderRadius: borderRadius.sm,
    padding: spacing.xs,
    marginTop: spacing.xs,
  },
  tip: { fontSize: 11, color: colors.textSecondary, textAlign: 'center', lineHeight: 16 },
});
