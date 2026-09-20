/**
 * Onboarding 2/5 — body type (drives the engine's fit layer). Options depend on
 * the gender chosen on the previous step; men and women get different builds.
 */
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OptionCard, PrimaryButton, ScreenHeader } from '../../components/ui';
import type { OnboardingScreenProps } from '../../navigation/types';
import { metaApi } from '../../services';
import type { BodyTypeInfo } from '../../services/types';
import { useOnboardingStore } from '../../store';
import { borderRadius, colors, spacing, typography } from '../../theme';

const EMOJI: Record<string, string> = { petite: '🌸', regular: '🌿', tall: '🌾', plus: '🌺', slim: '🎋', athletic: '🏏', broad: '🌳' };

export default function BodyTypeScreen({ navigation }: OnboardingScreenProps<'BodyType'>) {
  const { draft, set } = useOnboardingStore();
  const [options, setOptions] = useState<BodyTypeInfo[]>([]);

  useEffect(() => {
    metaApi
      .bodyTypes(draft.gender)
      .then((opts) => {
        setOptions(opts);
        if (!opts.some((o) => o.slug === draft.body_type)) set({ body_type: 'regular' });
      })
      .catch(() => undefined);
  }, [draft.gender, draft.body_type, set]);

  const chosen = options.find((o) => o.slug === draft.body_type);

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="Your build"
        subtitle="Helps us pick silhouettes that feel right. You can change this anytime."
        onBack={navigation.goBack}
        step={{ current: 2, total: 5 }}
      />
      <ScrollView contentContainerStyle={styles.body}>
        {options.map((o) => (
          <OptionCard key={o.slug} title={o.label} description={o.description} emoji={EMOJI[o.slug] ?? '🌿'} selected={draft.body_type === o.slug} onPress={() => set({ body_type: o.slug })} />
        ))}
        {chosen ? (
          <View style={styles.tips}>
            <Text style={typography.label}>{chosen.silhouette}</Text>
            {chosen.tips.map((t) => (
              <Text key={t} style={typography.body2}>
                • {t}
              </Text>
            ))}
          </View>
        ) : null}
      </ScrollView>
      <View style={styles.footer}>
        <PrimaryButton title="Continue" onPress={() => navigation.navigate('SkinTone')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xl },
  tips: { backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.lg, padding: spacing.md, gap: 4, marginTop: spacing.sm },
  footer: { padding: spacing.xl },
});
