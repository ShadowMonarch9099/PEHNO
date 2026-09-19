/**
 * Onboarding 5/5 — how it works + the 30-item goal. Completing this flips
 * onboarding_complete, which swaps the root navigator to the main tabs.
 */
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton, ProgressBar, ScreenHeader } from '../../components/ui';
import type { OnboardingScreenProps } from '../../navigation/types';
import { useOnboardingStore, WARDROBE_GOAL } from '../../store';
import { borderRadius, colors, spacing, typography } from '../../theme';

const STEPS = [
  { n: '1', title: 'Photograph each piece', body: 'One item per photo, flat or on a hanger, in daylight. Bulk-pick up to 10 at a time.' },
  { n: '2', title: 'AI classifies it', body: 'Type, fabric, colours, occasions and season — you can correct anything.' },
  { n: '3', title: 'Get daily looks', body: `Once you have ${WARDROBE_GOAL} items, outfits get genuinely good. Weather- and festival-aware.` },
];

export default function WardrobeIntroScreen({ navigation }: OnboardingScreenProps<'WardrobeIntro'>) {
  const complete = useOnboardingStore((s) => s.complete);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finish = async () => {
    setSaving(true);
    setError(null);
    try {
      await complete(); // root navigator reacts to onboarding_complete
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save. Check your connection.');
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="Build your wardrobe"
        subtitle="Your first 30 items unlock everything."
        onBack={navigation.goBack}
        step={{ current: 5, total: 5 }}
      />
      <ScrollView contentContainerStyle={styles.body}>
        {STEPS.map((s) => (
          <View key={s.n} style={styles.step}>
            <View style={styles.bubble}>
              <Text style={styles.bubbleText}>{s.n}</Text>
            </View>
            <View style={styles.stepText}>
              <Text style={typography.h4}>{s.title}</Text>
              <Text style={typography.body2}>{s.body}</Text>
            </View>
          </View>
        ))}
        <View style={styles.goalCard}>
          <ProgressBar value={0} label="Wardrobe goal" hint={`0 / ${WARDROBE_GOAL} items`} />
          <Text style={styles.goalHint}>Most people finish in one sitting — about 15 minutes.</Text>
        </View>
      </ScrollView>
      <View style={styles.footer}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton title="Start adding clothes" onPress={finish} loading={saving} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, gap: spacing.lg },
  step: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  bubble: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  bubbleText: { ...typography.label, color: colors.textInverse, fontWeight: '700' },
  stepText: { flex: 1, gap: 2 },
  goalCard: { backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.lg, padding: spacing.md, gap: spacing.sm },
  goalHint: { ...typography.caption },
  footer: { padding: spacing.xl, gap: spacing.sm },
  error: { ...typography.caption, color: colors.error, textAlign: 'center' },
});
