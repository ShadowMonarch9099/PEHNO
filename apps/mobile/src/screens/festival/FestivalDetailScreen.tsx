/**
 * FestivalDetail — colours, dress code, and 3–5 looks curated from the user's wardrobe.
 */
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OutfitCard } from '../../components/outfit/OutfitCard';
import { ScreenHeader, SecondaryButton } from '../../components/ui';
import type { FestivalScreenProps } from '../../navigation/types';
import { festivalsApi } from '../../services';
import type { FestivalDetail } from '../../services/types';
import { useOutfitStore } from '../../store';
import { borderRadius, colors, spacing, typography } from '../../theme';
import { hexFor } from '../../utils/colors';

const fmt = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long' });

export default function FestivalDetailScreen({ route, navigation }: FestivalScreenProps<'FestivalDetail'>) {
  const { slug } = route.params;
  const { byId, upsert, feedback, toggleSave } = useOutfitStore();
  const [data, setData] = useState<FestivalDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      const d = await festivalsApi.detail(slug);
      d.looks.forEach(upsert);
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load festival');
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title={data?.name ?? 'Festival'}
        subtitle={data ? `${fmt(data.start_date)}${data.end_date !== data.start_date ? ` – ${fmt(data.end_date)}` : ''}${data.is_active ? ' · happening now' : data.days_until ? ` · in ${data.days_until} days` : ' · today'}` : undefined}
        onBack={navigation.goBack}
      />
      <ScrollView contentContainerStyle={styles.body}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {data ? (
          <>
            <View style={styles.hero}>
              <View style={styles.swatches}>
                {data.colors.map((c) => (
                  <View key={c} style={styles.swatchWrap}>
                    <View style={[styles.swatch, { backgroundColor: hexFor(c) }]} />
                    <Text style={styles.swatchLabel}>{c}</Text>
                  </View>
                ))}
              </View>
              <Text style={typography.body2}>{data.color_guidance}</Text>
            </View>

            <Section title="Dress code">
              <Text style={typography.body2}>{data.dress_code}</Text>
            </Section>
            <Section title="About">
              <Text style={typography.body2}>{data.description}</Text>
              {data.lunar_calendar ? <Text style={styles.note}>Date follows the lunar calendar and may shift by a day.</Text> : null}
            </Section>

            <Section title={`Looks from your wardrobe${data.looks.length ? ` (${data.looks.length})` : ''}`}>
              {data.looks.length ? (
                data.looks.map((look) => {
                  const o = byId[look.id] ?? look;
                  return (
                    <OutfitCard
                      key={o.id}
                      outfit={o}
                      onFeedback={(v) => feedback(o.id, v)}
                      onToggleSave={() => toggleSave(o.id)}
                      onGarmentPress={(garmentId) => navigation.navigate('Wardrobe', { screen: 'GarmentDetail', params: { garmentId } } as never)}
                    />
                  );
                })
              ) : (
                <View style={styles.empty}>
                  <Text style={typography.body2}>{data.hint ?? 'Add and label festive pieces to see looks here.'}</Text>
                  <SecondaryButton title="Go to wardrobe" onPress={() => navigation.navigate('Wardrobe')} />
                </View>
              )}
            </Section>
          </>
        ) : !error ? (
          <Text style={typography.body2}>Loading…</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  body: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxl },
  error: { ...typography.caption, color: colors.error },
  hero: { backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.xl, padding: spacing.md, gap: spacing.md },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  swatchWrap: { alignItems: 'center', gap: 2 },
  swatch: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: colors.borderLight },
  swatchLabel: { ...typography.caption, textTransform: 'capitalize' },
  section: { gap: spacing.sm },
  sectionTitle: { ...typography.label, textTransform: 'uppercase', letterSpacing: 1 },
  note: { ...typography.caption },
  empty: { gap: spacing.sm, padding: spacing.md, backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.lg },
});
