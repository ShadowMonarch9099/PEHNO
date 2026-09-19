/**
 * Onboarding 1/5 — name, city, gender.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChipGroup, PrimaryButton, ScreenHeader } from '../../components/ui';
import type { OnboardingScreenProps } from '../../navigation/types';
import type { Gender } from '../../services/types';
import { useMetaStore, useOnboardingStore } from '../../store';
import { borderRadius, colors, spacing, typography } from '../../theme';

const GENDERS: { slug: Gender; label: string }[] = [
  { slug: 'female', label: 'Woman' },
  { slug: 'male', label: 'Man' },
  { slug: 'other', label: 'Other' },
];

export default function ProfileSetupScreen({ navigation }: OnboardingScreenProps<'ProfileSetup'>) {
  const { draft, set } = useOnboardingStore();
  const { cities, load } = useMetaStore();
  const [query, setQuery] = useState('');
  const [cityOpen, setCityOpen] = useState(false);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? cities.filter((c) => c.name.toLowerCase().includes(q) || c.state.toLowerCase().includes(q)) : cities;
  }, [cities, query]);

  const canContinue = draft.name.trim().length >= 2 && draft.city.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScreenHeader title="Tell us about you" subtitle="We use this to size outfits to your city and style." step={{ current: 1, total: 5 }} />

        <View style={styles.body}>
          <Text style={styles.label}>Your name</Text>
          <TextInput
            style={styles.input}
            value={draft.name}
            onChangeText={(name) => set({ name })}
            placeholder="Priya"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="words"
            textContentType="name"
            accessibilityLabel="Your name"
          />

          <Text style={styles.label}>City</Text>
          <TouchableOpacity style={styles.input} onPress={() => setCityOpen((o) => !o)} accessibilityRole="button">
            <Text style={typography.body1}>{draft.city || 'Choose your city'}</Text>
          </TouchableOpacity>
          {cityOpen ? (
            <View style={styles.dropdown}>
              <TextInput
                style={styles.search}
                value={query}
                onChangeText={setQuery}
                placeholder="Search city or state"
                placeholderTextColor={colors.textMuted}
                autoFocus
              />
              <FlatList
                data={filtered}
                keyExtractor={(c) => c.slug}
                keyboardShouldPersistTaps="handled"
                style={styles.list}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.cityRow}
                    onPress={() => {
                      set({ city: item.name });
                      setCityOpen(false);
                      setQuery('');
                    }}
                  >
                    <Text style={typography.body1}>{item.name}</Text>
                    <Text style={typography.caption}>{item.state}</Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={styles.empty}>No matching city yet — pick the nearest one.</Text>}
              />
            </View>
          ) : null}

          <Text style={styles.label}>I dress as</Text>
          <ChipGroup options={GENDERS} value={draft.gender} onChange={(gender) => set({ gender })} />
        </View>

        <View style={styles.footer}>
          <PrimaryButton title="Continue" onPress={() => navigation.navigate('BodyType')} disabled={!canContinue} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  body: { flex: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.lg, gap: spacing.sm },
  label: { ...typography.label, marginTop: spacing.sm },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.md,
    height: 52,
    justifyContent: 'center',
    ...typography.body1,
  },
  dropdown: { borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.lg, backgroundColor: colors.surface, maxHeight: 260 },
  search: { ...typography.body2, paddingHorizontal: spacing.md, height: 44, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  list: { maxHeight: 210 },
  cityRow: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  empty: { ...typography.caption, padding: spacing.md },
  footer: { padding: spacing.xl },
});
