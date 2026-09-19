/**
 * Onboarding 2/5 — body type (drives silhouette guidance later).
 */
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OptionCard, PrimaryButton, ScreenHeader } from '../../components/ui';
import type { OnboardingScreenProps } from '../../navigation/types';
import type { BodyType } from '../../services/types';
import { useOnboardingStore } from '../../store';
import { colors, spacing } from '../../theme';

const OPTIONS: { slug: BodyType; title: string; description: string; emoji: string }[] = [
  { slug: 'petite', title: 'Petite', description: 'Monotone looks and shorter kurtis lengthen the frame.', emoji: '🌸' },
  { slug: 'regular', title: 'Regular', description: 'Most silhouettes work — we optimise for occasion and weather.', emoji: '🌿' },
  { slug: 'tall', title: 'Tall', description: 'Floor-length anarkalis and wide palazzos sit beautifully.', emoji: '🌾' },
  { slug: 'plus', title: 'Plus', description: 'A-line cuts, flowing georgette and vertical prints flatter.', emoji: '🌺' },
];

export default function BodyTypeScreen({ navigation }: OnboardingScreenProps<'BodyType'>) {
  const { draft, set } = useOnboardingStore();
  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="Your body type"
        subtitle="Helps us pick silhouettes that feel right. You can change this anytime."
        onBack={navigation.goBack}
        step={{ current: 2, total: 5 }}
      />
      <ScrollView contentContainerStyle={styles.body}>
        {OPTIONS.map((o) => (
          <OptionCard key={o.slug} {...o} selected={draft.body_type === o.slug} onPress={() => set({ body_type: o.slug })} />
        ))}
      </ScrollView>
      <View style={styles.footer}>
        <PrimaryButton title="Continue" onPress={() => navigation.navigate('SkinTone')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, gap: spacing.sm },
  footer: { padding: spacing.xl },
});
