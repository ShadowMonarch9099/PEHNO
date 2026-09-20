/**
 * StylistList — verified stylists, filter by specialty. Pro members see their discount.
 */
import { Feather } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChipGroup, ScreenHeader } from '../../components/ui';
import type { OutfitScreenProps } from '../../navigation/types';
import { stylistsApi } from '../../services';
import type { Stylist } from '../../services/types';
import { useAuthStore } from '../../store';
import { borderRadius, colors, spacing, typography } from '../../theme';

const pretty = (s: string) => s.replace(/_/g, ' ');

export default function StylistListScreen({ navigation }: OutfitScreenProps<'StylistList'>) {
  const tier = useAuthStore((s) => s.user?.subscription_tier);
  const [items, setItems] = useState<Stylist[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [specialty, setSpecialty] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, specs] = await Promise.all([stylistsApi.list(specialty ? { specialty } : undefined), stylistsApi.specialties()]);
      setItems(list);
      setSpecialties(specs);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load stylists');
    } finally {
      setLoading(false);
    }
  }, [specialty]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="Stylists"
        subtitle={tier === 'pro' ? 'Verified stylists · your Pro discount applies.' : 'Verified stylists who work from your real wardrobe.'}
        onBack={navigation.goBack}
        right={
          <TouchableOpacity onPress={() => navigation.navigate('MyBookings')} accessibilityRole="button" accessibilityLabel="My bookings">
            <Feather name="calendar" size={22} color={colors.primary} />
          </TouchableOpacity>
        }
      />
      <View style={styles.filters}>
        <ChipGroup
          options={specialties.map((s) => ({ slug: s, label: pretty(s) }))}
          value={specialty}
          onChange={(s) => setSpecialty(s === specialty ? null : s)}
          scroll
          allLabel="All"
          onAll={() => setSpecialty(null)}
        />
      </View>
      <FlatList
        data={items}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
        renderItem={({ item: s }) => (
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('StylistProfile', { stylistId: s.id })} accessibilityRole="button">
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{s.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.flex}>
              <Text style={typography.h4}>{s.name}</Text>
              <Text style={typography.caption}>
                {s.city} · {s.specialties.map(pretty).join(', ')}
              </Text>
              <Text style={typography.caption}>
                {s.rating != null ? `★ ${s.rating.toFixed(1)} (${s.review_count})` : 'New'} · {s.sessions_completed} sessions
              </Text>
            </View>
            <View style={styles.price}>
              <Text style={styles.priceText}>₹{s.quote?.amount_inr ?? s.price_per_session_inr}</Text>
              {s.quote?.pro_discount_applied ? <Text style={styles.strike}>₹{s.price_per_session_inr}</Text> : null}
              <Text style={typography.caption}>/ session</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={typography.h3}>{error ? 'Something went wrong' : 'No stylists yet'}</Text>
              <Text style={styles.emptyText}>{error ?? 'We onboard stylists city by city. Check back soon — or apply from Settings if you style for a living.'}</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  filters: { paddingHorizontal: spacing.xl, paddingBottom: spacing.sm },
  list: { padding: spacing.xl, paddingTop: spacing.sm, gap: spacing.md, paddingBottom: spacing.xxl },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.xl, padding: spacing.md },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...typography.h3, color: colors.textInverse },
  flex: { flex: 1, gap: 2 },
  price: { alignItems: 'flex-end' },
  priceText: { ...typography.h4, color: colors.primary },
  strike: { ...typography.caption, textDecorationLine: 'line-through' },
  empty: { alignItems: 'center', gap: spacing.sm, padding: spacing.xl },
  emptyText: { ...typography.body2, textAlign: 'center' },
});
