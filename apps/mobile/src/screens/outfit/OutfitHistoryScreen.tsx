/**
 * OutfitHistory — rated/worn looks, or saved looks (route.params.saved).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OutfitCard } from '../../components/outfit/OutfitCard';
import { OutfitRating, ScreenHeader } from '../../components/ui';
import type { OutfitScreenProps } from '../../navigation/types';
import { outfitsApi } from '../../services';
import type { Outfit } from '../../services/types';
import { labelFor, useMetaStore, useOutfitStore } from '../../store';
import { colors, spacing, typography } from '../../theme';

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export default function OutfitHistoryScreen({ route, navigation }: OutfitScreenProps<'OutfitHistory'>) {
  const saved = Boolean(route.params?.saved);
  const options = useMetaStore((s) => s.options);
  const { byId, upsert, toggleSave, feedback, rate } = useOutfitStore();
  const [items, setItems] = useState<Outfit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = saved ? await outfitsApi.saved() : await outfitsApi.history();
      res.items.forEach(upsert);
      setItems(res.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load');
    } finally {
      setLoading(false);
    }
  }, [saved, upsert]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = items.map((o) => byId[o.id] ?? o).filter((o) => !saved || o.is_saved);

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={saved ? 'Saved looks' : 'Outfit history'} onBack={navigation.goBack} />
      <FlatList
        data={visible}
        keyExtractor={(o) => o.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View style={styles.meta}>
              <Text style={styles.metaTitle}>{labelFor(options.occasions, item.occasion)}</Text>
              <Text style={typography.caption}>
                {fmtDate(item.worn_at ?? item.created_at)} · {item.temperature_celsius}°C {item.weather_condition}
                {item.worn_at ? ' · worn' : ''}
              </Text>
            </View>
            <OutfitCard
              outfit={item}
              compact
              onFeedback={(v) => feedback(item.id, v)}
              onToggleSave={() => toggleSave(item.id)}
              onGarmentPress={(garmentId) => navigation.navigate('Wardrobe', { screen: 'GarmentDetail', params: { garmentId } })}
            />
            <View style={styles.rating}>
              <Text style={typography.caption}>{item.rating ? 'Your rating' : 'Rate this look'}</Text>
              <OutfitRating rating={item.rating ?? undefined} onRate={(r) => void rate(item.id, r as 1 | 2 | 3 | 4 | 5)} />
            </View>
          </View>
        )}
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.empty}>
              <Text style={typography.h3}>{saved ? 'No saved looks yet' : 'No history yet'}</Text>
              <Text style={styles.emptyText}>{error ?? (saved ? 'Tap the bookmark on any look to keep it here.' : 'Looks you rate or wear show up here.')}</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxl },
  rating: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xs },
  item: { gap: spacing.sm },
  meta: { gap: 2 },
  metaTitle: { ...typography.h4 },
  empty: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.xxl },
  emptyText: { ...typography.body2, textAlign: 'center' },
});
