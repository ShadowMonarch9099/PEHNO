/**
 * Onboarding 3/5 — skin tone (drives colour recommendations).
 */
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OptionCard, PrimaryButton, ScreenHeader } from '../../components/ui';
import type { OnboardingScreenProps } from '../../navigation/types';
import type { SkinTone } from '../../services/types';
import { useOnboardingStore } from '../../store';
import { colors, spacing } from '../../theme';

const OPTIONS: { slug: SkinTone; title: string; description: string; swatch: string }[] = [
  { slug: 'fair', title: 'Fair', description: 'Pastels, jewel tones and deep maroons pop.', swatch: '#F3D5C0' },
  { slug: 'wheatish', title: 'Wheatish', description: 'Mustard, rust, teal and emerald are your friends.', swatch: '#D9A97A' },
  { slug: 'medium', title: 'Medium', description: 'Warm oranges, magenta, royal blue and gold glow.', swatch: '#B57A4E' },
  { slug: 'dark', title: 'Deep', description: 'Bright whites, fuchsia, cobalt and lime look striking.', swatch: '#6E4227' },
];

export default function SkinToneScreen({ navigation }: OnboardingScreenProps<'SkinTone'>) {
  const { draft, set } = useOnboardingStore();
  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="Your skin tone"
        subtitle="Used only to suggest colours that suit you."
        onBack={navigation.goBack}
        step={{ current: 3, total: 5 }}
      />
      <ScrollView contentContainerStyle={styles.body}>
        {OPTIONS.map((o) => (
          <OptionCard key={o.slug} {...o} selected={draft.skin_tone === o.slug} onPress={() => set({ skin_tone: o.slug })} />
        ))}
      </ScrollView>
      <View style={styles.footer}>
        <PrimaryButton title="Continue" onPress={() => navigation.navigate('StyleAffinity')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, gap: spacing.sm },
  footer: { padding: spacing.xl },
});
