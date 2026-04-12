/**
 * OccasionPickerScreen — Grid of occasion cards with icons
 */
import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { colors, spacing, borderRadius, typography, shadows } from '../../theme';
import { outfitApi } from '../../services/api';
import { useOutfitStore } from '../../store';

const OCCASIONS = [
  { value: 'pooja', label: 'Pooja', emoji: '🪔', description: 'Temple visit or home puja' },
  { value: 'office', label: 'Office', emoji: '💼', description: 'Workday or professional event' },
  { value: 'wedding_guest', label: 'Wedding', emoji: '💒', description: 'Wedding or sangeet' },
  { value: 'festival', label: 'Festival', emoji: '🎊', description: 'Festival celebrations' },
  { value: 'casual', label: 'Casual', emoji: '🌸', description: 'Everyday relaxed wear' },
  { value: 'formal', label: 'Formal', emoji: '🎗️', description: 'Corporate or formal events' },
  { value: 'campus', label: 'Campus', emoji: '🎓', description: 'College or university' },
  { value: 'night_out', label: 'Night Out', emoji: '🌙', description: 'Evening parties or dinners' },
  { value: 'temple', label: 'Temple', emoji: '⛩️', description: 'Religious visit' },
];

export default function OccasionPickerScreen({ navigation }: any) {
  const { setLoading } = useOutfitStore();

  const handleSelect = async (occasion: string) => {
    setLoading(true);
    try {
      const res = await outfitApi.generate({ occasion });
      navigation.navigate('OutfitResult', { outfits: res.data, occasion });
    } catch (e) {
      navigation.navigate('OutfitResult', { outfits: [], occasion });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Pick an Occasion</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.grid}>
        <Text style={styles.subtitle}>What are you dressing for today?</Text>
        {OCCASIONS.map((o) => (
          <TouchableOpacity
            key={o.value}
            style={styles.occasionCard}
            onPress={() => handleSelect(o.value)}
            activeOpacity={0.85}
          >
            <Text style={styles.occasionEmoji}>{o.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.occasionLabel}>{o.label}</Text>
              <Text style={styles.occasionDesc}>{o.description}</Text>
            </View>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
  backText: { fontSize: 24 },
  title: { ...typography.h3 },
  grid: { padding: spacing.md, gap: spacing.sm, paddingBottom: 40 },
  subtitle: { ...typography.body2, color: colors.textSecondary, marginBottom: spacing.xs },
  occasionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  occasionEmoji: { fontSize: 36 },
  occasionLabel: { ...typography.h4 },
  occasionDesc: { ...typography.body2, color: colors.textSecondary },
  arrow: { ...typography.h3, color: colors.textMuted },
});
