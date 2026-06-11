/**
 * SkinToneScreen — 6-swatch skin tone palette selector
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { PrimaryButton } from '../../components/ui';
import { userApi } from '../../services/api';
import { useUserStore } from '../../store';

const SKIN_TONES = [
  { value: 'fair', label: 'Fair', swatch: '#FDDBB4', description: 'Golden and pastel tones glow on you', emoji: '🌼' },
  { value: 'fair_medium', label: 'Fair-Medium', swatch: '#F4BF96', description: 'Warm earthy tones and coral are stunning', emoji: '🌸' },
  { value: 'wheatish', label: 'Wheatish', swatch: '#D4956A', description: 'Jewel tones and warm colors shine on you', emoji: '🌾' },
  { value: 'medium', label: 'Medium', swatch: '#B5713A', description: 'Rich deep colors and metallics look gorgeous', emoji: '🌻' },
  { value: 'medium_dark', label: 'Medium-Dark', swatch: '#8B5E3C', description: 'Bold and bright colors make you radiant', emoji: '✨' },
  { value: 'dark', label: 'Dark', swatch: '#5C3A1E', description: 'Vibrant jewel tones and gold are your power', emoji: '👑' },
];

const MAPPING: Record<string, string> = {
  fair: 'fair', fair_medium: 'fair', wheatish: 'wheatish',
  medium: 'medium', medium_dark: 'medium', dark: 'dark',
};

export default function SkinToneScreen({ navigation }: any) {
  const [selected, setSelected] = useState('wheatish');
  const [loading, setLoading] = useState(false);
  const { updateProfile } = useUserStore();

  const handleNext = async () => {
    setLoading(true);
    const apiValue = MAPPING[selected];
    try {
      await userApi.updateMe({ skin_tone: apiValue });
      updateProfile({ skin_tone: apiValue as any });
    } catch {}
    setLoading(false);
    navigation.navigate('StyleAffinity');
  };

  const selectedData = SKIN_TONES.find((s) => s.value === selected)!;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.step}>Profile Setup • 3/5</Text>
        <Text style={styles.title}>Your skin tone</Text>
        <Text style={styles.subtitle}>
          We'll recommend colors that complement your natural beauty
        </Text>

        <View style={styles.swatchGrid}>
          {SKIN_TONES.map((st) => (
            <TouchableOpacity
              key={st.value}
              style={[
                styles.swatchCard,
                selected === st.value && styles.swatchCardSelected,
              ]}
              onPress={() => setSelected(st.value)}
              activeOpacity={0.85}
            >
              <View
                style={[
                  styles.swatch,
                  { backgroundColor: st.swatch },
                  selected === st.value && styles.swatchSelected,
                ]}
              />
              <Text style={[styles.swatchLabel, selected === st.value && styles.swatchLabelSelected]}>
                {st.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Style tip for selected tone */}
        {selectedData && (
          <View style={styles.tipCard}>
            <Text style={styles.tipEmoji}>{selectedData.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.tipTitle}>{selectedData.label}</Text>
              <Text style={styles.tipText}>{selectedData.description}</Text>
            </View>
          </View>
        )}

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

  swatchGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  swatchCard: {
    width: '30%',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 6,
  },
  swatchCardSelected: { borderColor: colors.primary },
  swatch: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: colors.borderLight,
  },
  swatchSelected: { borderColor: colors.primary, borderWidth: 3 },
  swatchLabel: { ...typography.caption, textAlign: 'center', color: colors.textSecondary },
  swatchLabelSelected: { color: colors.primary, fontWeight: '700' },

  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  tipEmoji: { fontSize: 32 },
  tipTitle: { ...typography.h4, color: colors.primary },
  tipText: { ...typography.body2, color: colors.textSecondary, marginTop: 2 },
});
