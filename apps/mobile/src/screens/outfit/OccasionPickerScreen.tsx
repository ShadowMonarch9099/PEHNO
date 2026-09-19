/**
 * OccasionPicker — the 9 Indian occasions from the knowledge base.
 */
import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/ui';
import type { OutfitScreenProps } from '../../navigation/types';
import { useMetaStore } from '../../store';
import { borderRadius, colors, shadows, spacing, typography } from '../../theme';

const EMOJI: Record<string, string> = {
  casual: '☕',
  office: '💼',
  campus: '🎒',
  wedding_guest: '💍',
  pooja: '🪔',
  festival: '🎉',
  formal: '🥂',
  night_out: '🌙',
  temple: '🛕',
};

export default function OccasionPickerScreen({ navigation }: OutfitScreenProps<'OccasionPicker'>) {
  const { options, load } = useMetaStore();
  useEffect(() => {
    void load();
  }, [load]);

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="What's the occasion?" subtitle="We'll pick from your wardrobe for today's weather." onBack={navigation.goBack} />
      <ScrollView contentContainerStyle={styles.grid}>
        {options.occasions.map((o) => (
          <TouchableOpacity key={o.slug} style={styles.card} onPress={() => navigation.navigate('OutfitResult', { occasion: o.slug })} accessibilityRole="button">
            <Text style={styles.emoji}>{EMOJI[o.slug] ?? '👗'}</Text>
            <Text style={styles.label}>{o.label}</Text>
          </TouchableOpacity>
        ))}
        {!options.occasions.length ? (
          <View style={styles.empty}>
            <Text style={typography.body2}>Connect to the API to load occasions.</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  grid: { padding: spacing.xl, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  card: { width: '47%', aspectRatio: 1.1, borderRadius: borderRadius.xl, backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, ...shadows.sm },
  emoji: { fontSize: 36 },
  label: { ...typography.h4, textAlign: 'center' },
  empty: { width: '100%', alignItems: 'center', padding: spacing.xl },
});
