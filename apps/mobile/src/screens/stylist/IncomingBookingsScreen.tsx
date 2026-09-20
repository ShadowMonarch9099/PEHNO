/**
 * IncomingBookings — stylist side: sessions booked with you, payout after commission,
 * open the client's wardrobe while confirmed, mark complete.
 */
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BookingCard } from '../../components/stylist/BookingCard';
import { PrimaryButton, ScreenHeader, SecondaryButton } from '../../components/ui';
import type { SettingsScreenProps } from '../../navigation/types';
import { ApiError, stylistsApi } from '../../services';
import type { Booking } from '../../services/types';
import { colors, spacing, typography } from '../../theme';

export default function IncomingBookingsScreen({ navigation }: SettingsScreenProps<'IncomingBookings'>) {
  const [items, setItems] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await stylistsApi.incoming());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load bookings');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const replace = (b: Booking) => setItems((xs) => xs.map((x) => (x.id === b.id ? b : x)));

  const complete = (b: Booking) =>
    Alert.alert('Mark as completed?', 'This closes your access to the client’s wardrobe and lets them review you.', [
      { text: 'Not yet', style: 'cancel' },
      {
        text: 'Complete',
        onPress: async () => {
          try {
            replace(await stylistsApi.complete(b.id));
          } catch (e) {
            Alert.alert('Could not complete', e instanceof ApiError ? e.message : undefined);
          }
        },
      },
    ]);

  const upcoming = items.filter((b) => b.status === 'pending' || b.status === 'confirmed');
  const payout = items.filter((b) => b.status === 'completed').reduce((n, b) => n + (b.stylist_payout_inr ?? 0), 0);

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Your sessions" subtitle={`${upcoming.length} upcoming · ₹${payout} earned from completed sessions`} onBack={navigation.goBack} />
      <FlatList
        data={items}
        keyExtractor={(b) => b.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
        renderItem={({ item: b }) => (
          <BookingCard booking={b} asStylist>
            {b.status === 'confirmed' ? (
              <View style={styles.actions}>
                <PrimaryButton title={`Open ${b.client_first_name}'s wardrobe`} onPress={() => navigation.navigate('ClientWardrobe', { bookingId: b.id })} />
                <SecondaryButton title="Mark completed" onPress={() => complete(b)} />
              </View>
            ) : null}
            {b.status === 'pending' ? <Text style={typography.caption}>Wardrobe access opens once the client pays.</Text> : null}
          </BookingCard>
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={typography.h3}>{error ? 'Something went wrong' : 'No bookings yet'}</Text>
              <Text style={styles.emptyText}>{error ?? 'Once you’re verified, users in your city can book you here.'}</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxl },
  actions: { gap: spacing.sm },
  empty: { alignItems: 'center', gap: spacing.sm, padding: spacing.xl },
  emptyText: { ...typography.body2, textAlign: 'center' },
});
