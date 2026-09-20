/**
 * TravelHome — saved trip plans + "plan a trip". Plus feature (locked, not hidden).
 */
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GhostLooks, LockedFeature, PrimaryButton, ScreenHeader } from '../../components/ui';
import type { OutfitScreenProps } from '../../navigation/types';
import { ApiError, travelApi } from '../../services';
import type { Paywall, TravelPlanSummary } from '../../services/types';
import { useAuthStore } from '../../store';
import { borderRadius, colors, spacing, typography } from '../../theme';

const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

export default function TravelHomeScreen({ navigation }: OutfitScreenProps<'TravelHome'>) {
  const ent = useAuthStore((s) => s.user?.entitlements);
  const locked = ent ? ent.features?.travel_packing?.unlocked === false : false;
  const [plans, setPlans] = useState<TravelPlanSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [paywall, setPaywall] = useState<Paywall | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPlans(await travelApi.plans());
    } catch (e) {
      if (e instanceof ApiError && e.paywall) setPaywall(e.paywall);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const remove = (p: TravelPlanSummary) =>
    Alert.alert(`Delete ${p.destination} plan?`, undefined, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await travelApi.remove(p.id);
          setPlans((xs) => xs.filter((x) => x.id !== p.id));
        },
      },
    ]);

  const lock = paywall ?? (locked ? { message: 'Travel packing planner is a Plus feature', feature: 'travel_packing', required_tier: 'plus' as const, upgrade_path: '/billing/plans' } : null);

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Trip packing" subtitle="A capsule from your own wardrobe — every day and every function dressed." onBack={navigation.goBack} />
      {lock ? (
        <View style={styles.body}>
          <LockedFeature paywall={lock}>
            <GhostLooks />
          </LockedFeature>
        </View>
      ) : (
        <FlatList
          data={plans}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.body}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
          ListHeaderComponent={<PrimaryButton title="Plan a trip" onPress={() => navigation.navigate('TravelPlanner')} />}
          renderItem={({ item: p }) => (
            <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('TravelPlan', { planId: p.id })} onLongPress={() => remove(p)} accessibilityRole="button">
              <View style={styles.flex}>
                <Text style={typography.h4}>{p.destination}</Text>
                <Text style={typography.caption}>
                  {fmt(p.start_date)} – {fmt(p.end_date)} · {p.days} day{p.days === 1 ? '' : 's'}
                </Text>
              </View>
              <View style={styles.stats}>
                <Text style={styles.stat}>
                  {p.item_count} items → {p.look_count} looks
                </Text>
                {p.gap_count ? <Text style={styles.gap}>{p.gap_count} to buy</Text> : null}
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={!loading ? <Text style={styles.empty}>No trips planned yet. Long-press a plan to delete it.</Text> : null}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  body: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxl },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.xl, padding: spacing.md },
  flex: { flex: 1, gap: 2 },
  stats: { alignItems: 'flex-end', gap: 2 },
  stat: { ...typography.label, color: colors.primary },
  gap: { ...typography.caption, color: colors.warning },
  empty: { ...typography.body2, textAlign: 'center', padding: spacing.xl },
});
