/**
 * DailyLook — greeting, weather, today's outfit, "show me another", quick links.
 */
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OutfitCard } from '../../components/outfit/OutfitCard';
import { WeatherCard } from '../../components/outfit/WeatherCard';
import { PrimaryButton, SecondaryButton } from '../../components/ui';
import type { OutfitScreenProps } from '../../navigation/types';
import { ApiError } from '../../services';
import { useAuthStore, useMetaStore, useOutfitStore } from '../../store';
import { borderRadius, colors, spacing, typography } from '../../theme';

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

export default function DailyLookScreen({ navigation }: OutfitScreenProps<'DailyLook'>) {
  const user = useAuthStore((s) => s.user);
  const load = useMetaStore((s) => s.load);
  const { daily, byId, loadDaily, feedback, toggleSave, wear } = useOutfitStore();
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const outfit = daily.outfit ? (byId[daily.outfit.id] ?? daily.outfit) : null;

  const refresh = useCallback(
    async (regenerate = false) => {
      setLoading(true);
      setError(null);
      try {
        await loadDaily(regenerate);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : 'Could not load today’s look');
      } finally {
        setLoading(false);
      }
    },
    [loadDaily],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
      if (daily.loadedFor !== new Date().toDateString()) void refresh();
    }, [load, refresh, daily.loadedFor]),
  );

  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.body} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => refresh()} tintColor={colors.primary} />}>
        <Text style={typography.caption}>
          {greeting()}
          {user?.name ? `, ${user.name.split(' ')[0]}` : ''}
        </Text>
        <Text style={typography.h1}>Today's look</Text>

        {daily.weather ? <WeatherCard weather={daily.weather} /> : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {outfit ? (
          <OutfitCard
            outfit={outfit}
            busy={busy}
            onFeedback={(v) => act(() => feedback(outfit.id, v))}
            onToggleSave={() => act(() => toggleSave(outfit.id))}
            onWear={() => act(() => wear(outfit.id))}
            onGarmentPress={(garmentId) => navigation.navigate('Wardrobe', { screen: 'GarmentDetail', params: { garmentId } } as never)}
          />
        ) : !loading ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🪄</Text>
            <Text style={typography.h3}>No look yet</Text>
            <Text style={styles.emptyText}>{daily.hint ?? 'Add and label a few garments to get your first outfit.'}</Text>
            <SecondaryButton title="Go to wardrobe" onPress={() => navigation.navigate('Wardrobe')} />
          </View>
        ) : null}

        {daily.hint && outfit ? <Text style={styles.hint}>{daily.hint}</Text> : null}

        <View style={styles.buttons}>
          {outfit ? <SecondaryButton title="Show me another" onPress={() => refresh(true)} disabled={loading} /> : null}
          <PrimaryButton title="Dress for an occasion" onPress={() => navigation.navigate('OccasionPicker')} />
        </View>

        <View style={styles.links}>
          <TouchableOpacity style={styles.link} onPress={() => navigation.navigate('OutfitHistory', { saved: true })}>
            <Text style={styles.linkText}>🔖 Saved looks</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.link} onPress={() => navigation.navigate('OutfitHistory', {})}>
            <Text style={styles.linkText}>🕘 History</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  body: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  error: { ...typography.caption, color: colors.error },
  hint: { ...typography.caption, textAlign: 'center' },
  empty: { alignItems: 'center', gap: spacing.sm, padding: spacing.xl, backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.xl },
  emptyEmoji: { fontSize: 40 },
  emptyText: { ...typography.body2, textAlign: 'center' },
  buttons: { gap: spacing.sm },
  links: { flexDirection: 'row', gap: spacing.sm },
  link: { flex: 1, padding: spacing.md, borderRadius: borderRadius.lg, backgroundColor: colors.surfaceElevated, alignItems: 'center' },
  linkText: { ...typography.label, color: colors.textPrimary },
});
