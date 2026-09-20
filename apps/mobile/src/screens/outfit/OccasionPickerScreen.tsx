/**
 * OccasionPicker — the 9 Indian occasions from the knowledge base.
 */
import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/ui';
import type { OutfitScreenProps } from '../../navigation/types';
import { useT } from '../../i18n';
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
  mehendi: '🌿',
  sangeet: '💃',
  haldi: '🌼',
  baraat: '🐎',
  reception: '🥂',
};

const WEDDING = new Set(['mehendi', 'sangeet', 'haldi', 'baraat', 'reception']);

export default function OccasionPickerScreen({ navigation }: OutfitScreenProps<'OccasionPicker'>) {
  const t = useT();
  const { options, load } = useMetaStore();
  useEffect(() => {
    void load();
  }, [load]);

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={t('occasion.title')} subtitle={t('occasion.subtitle')} onBack={navigation.goBack} />
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.grid}>
          {options.occasions.filter((o) => !WEDDING.has(o.slug)).map((o) => (
            <TouchableOpacity key={o.slug} style={styles.card} onPress={() => navigation.navigate('OutfitResult', { occasion: o.slug })} accessibilityRole="button">
              <Text style={styles.emoji}>{EMOJI[o.slug] ?? '👗'}</Text>
              <Text style={styles.label}>{o.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {options.occasions.some((o) => WEDDING.has(o.slug)) ? (
          <>
            <Text style={styles.sectionTitle}>Wedding week</Text>
            <Text style={styles.sectionSub}>Each function has its own dress code and palette.</Text>
            <View style={styles.grid}>
              {options.occasions.filter((o) => WEDDING.has(o.slug)).map((o) => (
                <TouchableOpacity key={o.slug} style={[styles.card, styles.cardWedding]} onPress={() => navigation.navigate('OutfitResult', { occasion: o.slug })} accessibilityRole="button">
                  <Text style={styles.emoji}>{EMOJI[o.slug] ?? '💍'}</Text>
                  <Text style={styles.label}>{o.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : null}
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
  body: { padding: spacing.xl, gap: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  sectionTitle: { ...typography.h3, marginTop: spacing.sm },
  sectionSub: { ...typography.caption, marginTop: -spacing.sm },
  cardWedding: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.primaryContainer },
  card: { width: '47%', aspectRatio: 1.1, borderRadius: borderRadius.xl, backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, ...shadows.sm },
  emoji: { fontSize: 36 },
  label: { ...typography.h4, textAlign: 'center' },
  empty: { width: '100%', alignItems: 'center', padding: spacing.xl },
});
