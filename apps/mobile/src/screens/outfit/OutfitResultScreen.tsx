/**
 * OutfitResult — up to 3 options for an occasion, as tabs. Like/dislike/save/wear.
 */
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OutfitCard } from '../../components/outfit/OutfitCard';
import { WeatherCard } from '../../components/outfit/WeatherCard';
import { ChipGroup, ScreenHeader, SecondaryButton } from '../../components/ui';
import type { OutfitScreenProps } from '../../navigation/types';
import { ApiError } from '../../services';
import type { OutfitOptions } from '../../services/types';
import { labelFor, useMetaStore, useOutfitStore } from '../../store';
import { borderRadius, colors, spacing, typography } from '../../theme';

export default function OutfitResultScreen({ route, navigation }: OutfitScreenProps<'OutfitResult'>) {
  const { occasion, festival } = route.params;
  const options = useMetaStore((s) => s.options);
  const { generate, byId, feedback, toggleSave, wear } = useOutfitStore();
  const [result, setResult] = useState<OutfitOptions | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState('0');

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      setResult(await generate(occasion, festival));
      setTab('0');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not generate outfits');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [occasion, festival]);

  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  const opts = result?.options ?? [];
  const current = opts[Number(tab)] ? (byId[opts[Number(tab)].id] ?? opts[Number(tab)]) : null;
  const title = labelFor(options.occasions, occasion);

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={title} subtitle={festival ? `For ${festival.replace(/-/g, ' ')}` : undefined} onBack={navigation.goBack} />
      <ScrollView contentContainerStyle={styles.body}>
        {result ? <WeatherCard weather={result.weather} /> : null}
        {loading ? <Text style={styles.status}>Styling your wardrobe…</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {opts.length > 1 ? (
          <ChipGroup options={opts.map((_, i) => ({ slug: String(i), label: `Look ${i + 1}` }))} value={tab} onChange={setTab} />
        ) : null}

        {current ? (
          <OutfitCard
            outfit={current}
            busy={busy}
            onFeedback={(v) => act(() => feedback(current.id, v))}
            onToggleSave={() => act(() => toggleSave(current.id))}
            onWear={() => act(() => wear(current.id))}
            onGarmentPress={(garmentId) => navigation.navigate('Wardrobe', { screen: 'GarmentDetail', params: { garmentId } })}
          />
        ) : null}

        {result && !opts.length && !loading ? (
          <View style={styles.empty}>
            <Text style={typography.h3}>Nothing to suggest yet</Text>
            <Text style={styles.emptyText}>{result.hint ?? 'Label more garments for this occasion.'}</Text>
          </View>
        ) : null}
        {result?.hint && opts.length ? <Text style={styles.hint}>{result.hint}</Text> : null}

        {!loading ? <SecondaryButton title="Regenerate" onPress={run} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  body: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxl },
  status: { ...typography.body2, textAlign: 'center' },
  error: { ...typography.caption, color: colors.error },
  hint: { ...typography.caption, textAlign: 'center' },
  empty: { alignItems: 'center', gap: spacing.sm, padding: spacing.xl, backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.xl },
  emptyText: { ...typography.body2, textAlign: 'center' },
});
