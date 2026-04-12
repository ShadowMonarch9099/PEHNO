/**
 * StyleAffinityScreen — Regional style cards with visual examples
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { colors, spacing, borderRadius, typography, shadows } from '../../theme';
import { PrimaryButton } from '../../components/ui';
import { userApi } from '../../services/api';
import { useUserStore } from '../../store';

const STYLES = [
  {
    value: 'rajasthani',
    label: 'Rajasthani',
    emoji: '🏰',
    colors: ['#FF6B35', '#FFD700', '#E63946', '#457B9D'],
    description: 'Rich block prints, mirror work, bandhani, vibrant reds and oranges. Jaipur royalty.',
    keywords: ['Bandhani', 'Leheriya', 'Gota Patti', 'Mirror Work'],
  },
  {
    value: 'south_indian',
    label: 'South Indian',
    emoji: '🌺',
    colors: ['#880E4F', '#DAA520', '#1A237E', '#E65100'],
    description: 'Kanjivaram silk, zari borders, temple jewelry. Draped in elegance and tradition.',
    keywords: ['Kanjivaram', 'Kasavu', 'Temple Jewellery', 'Nine-yard Drape'],
  },
  {
    value: 'punjabi',
    label: 'Punjabi',
    emoji: '🌾',
    colors: ['#E91E63', '#4CAF50', '#2196F3', '#FF9800'],
    description: 'Vibrant phulkari embroidery, bright colors, salwar suits with rich dupattas.',
    keywords: ['Phulkari', 'Patiala Salwar', 'Paranda', 'Bold Colors'],
  },
  {
    value: 'mumbai_minimal',
    label: 'Mumbai Minimal',
    emoji: '🌊',
    colors: ['#37474F', '#78909C', '#ECEFF1', '#D4A017'],
    description: 'Contemporary fusion, clean silhouettes, muted palettes with strategic ethnic accents.',
    keywords: ['Indo-Western', 'Minimal', 'Structured', 'Monochrome'],
  },
  {
    value: 'pan_india_fusion',
    label: 'Pan-India Fusion',
    emoji: '🎨',
    colors: ['#8B4513', '#D4A017', '#228B22', '#DC143C'],
    description: 'Best of every tradition. Mix and match across India\'s rich textile heritage.',
    keywords: ['Eclectic', 'Mixed Heritage', 'Contemporary', 'Versatile'],
  },
];

export default function StyleAffinityScreen({ navigation }: any) {
  const [selected, setSelected] = useState('pan_india_fusion');
  const [loading, setLoading] = useState(false);
  const { updateProfile } = useUserStore();

  const handleNext = async () => {
    setLoading(true);
    try {
      await userApi.updateMe({ regional_style: selected });
      updateProfile({ regional_style: selected });
    } catch {}
    setLoading(false);
    navigation.navigate('WardrobeIntro');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.step}>Profile Setup • 4/5</Text>
        <Text style={styles.title}>Your style affinity</Text>
        <Text style={styles.subtitle}>
          Which regional aesthetic resonates most with you?
        </Text>

        <View style={styles.cards}>
          {STYLES.map((s) => (
            <TouchableOpacity
              key={s.value}
              style={[styles.card, selected === s.value && styles.cardSelected]}
              onPress={() => setSelected(s.value)}
              activeOpacity={0.85}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardEmoji}>{s.emoji}</Text>
                <View style={styles.colorPalette}>
                  {s.colors.map((c, i) => (
                    <View key={i} style={[styles.colorDot, { backgroundColor: c }]} />
                  ))}
                </View>
                {selected === s.value && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={[styles.cardTitle, selected === s.value && styles.cardTitleSelected]}>
                {s.label}
              </Text>
              <Text style={styles.cardDesc}>{s.description}</Text>
              <View style={styles.keywords}>
                {s.keywords.map((kw) => (
                  <View key={kw} style={styles.keyword}>
                    <Text style={styles.keywordText}>{kw}</Text>
                  </View>
                ))}
              </View>
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

  cards: { gap: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.borderLight,
    gap: 8,
    ...shadows.sm,
  },
  cardSelected: { borderColor: colors.primary, backgroundColor: colors.primary + '06' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardEmoji: { fontSize: 28 },
  colorPalette: { flexDirection: 'row', gap: 4, flex: 1, paddingHorizontal: spacing.sm },
  colorDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: colors.borderLight },
  checkmark: { fontSize: 18, color: colors.primary, fontWeight: '700' },
  cardTitle: { ...typography.h4, color: colors.textPrimary },
  cardTitleSelected: { color: colors.primary },
  cardDesc: { ...typography.body2, color: colors.textSecondary, lineHeight: 20 },
  keywords: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  keyword: {
    backgroundColor: colors.borderLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.pill,
  },
  keywordText: { fontSize: 11, color: colors.textSecondary, fontWeight: '500' },
});
