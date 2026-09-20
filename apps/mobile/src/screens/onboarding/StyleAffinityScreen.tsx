/**
 * Onboarding 4/5 — regional style affinity (biases the recommendation engine).
 */
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OptionCard, PrimaryButton, ScreenHeader } from '../../components/ui';
import type { OnboardingScreenProps } from '../../navigation/types';
import type { RegionalStyle } from '../../services/types';
import { useT } from '../../i18n';
import { labelFor, useMetaStore, useOnboardingStore } from '../../store';
import { colors, spacing, typography } from '../../theme';

const OPTIONS: { slug: RegionalStyle; title: string; description: string; emoji: string }[] = [
  { slug: 'rajasthani', title: 'Rajasthani', description: 'Bandhani, leheriya, block prints, mirror work, bold jewel tones.', emoji: '🐪' },
  { slug: 'south_indian', title: 'South Indian', description: 'Kanjeevaram silks, kasavu, temple borders, jasmine-ready classics.', emoji: '🌴' },
  { slug: 'punjabi', title: 'Punjabi', description: 'Phulkari, patiala suits, vibrant dupattas, festive maximalism.', emoji: '🌻' },
  { slug: 'mumbai_minimal', title: 'Mumbai Minimal', description: 'Clean lines, linen, muted palettes, indo-western fusion.', emoji: '🌊' },
  { slug: 'pan_india_fusion', title: 'Pan-India Fusion', description: 'A bit of everything — we balance regions by occasion.', emoji: '🪷' },
];

export default function StyleAffinityScreen({ navigation }: OnboardingScreenProps<'StyleAffinity'>) {
  const { draft, set, saveProgress } = useOnboardingStore();
  const t = useT();
  const { cities, options, load } = useMetaStore();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  // Tier-2 tuning: pre-select the style most people in the user's city pick
  const city = cities.find((c) => c.name.toLowerCase() === draft.city.trim().toLowerCase());
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (city && !touched && city.regional_style !== draft.regional_style) set({ regional_style: city.regional_style });
  }, [city, touched, draft.regional_style, set]);

  const next = async () => {
    setSaving(true);
    setError(null);
    try {
      await saveProgress(); // persist answers so far; onboarding_complete stays false
      navigation.navigate('WardrobeIntro');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save. Check your connection.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title={t('onb.style.title')}
        subtitle={city ? t('onb.style.cityDefault', { city: city.name, style: labelFor(options.regional_styles, city.regional_style) }) : t('onb.style.subtitle')}
        onBack={navigation.goBack}
        step={{ current: 4, total: 5 }}
      />
      <ScrollView contentContainerStyle={styles.body}>
        {city?.style_note ? <Text style={styles.note}>{city.aesthetic ? `${city.aesthetic} — ` : ''}{city.style_note}</Text> : null}
        {OPTIONS.map((o) => (
          <OptionCard
            key={o.slug}
            {...o}
            selected={draft.regional_style === o.slug}
            onPress={() => {
              setTouched(true);
              set({ regional_style: o.slug });
            }}
          />
        ))}
      </ScrollView>
      <View style={styles.footer}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton title={t('common.continue')} onPress={next} loading={saving} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, gap: spacing.sm },
  footer: { padding: spacing.xl, gap: spacing.sm },
  error: { ...typography.caption, color: colors.error, textAlign: 'center' },
  note: { ...typography.caption, marginBottom: spacing.xs },
});
