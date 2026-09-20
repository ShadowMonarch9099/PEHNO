/**
 * MyBookings — client side: pay pending, cancel, review completed sessions.
 */
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Alert, FlatList, Linking, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BookingCard } from '../../components/stylist/BookingCard';
import { OutfitRating, PrimaryButton, ScreenHeader, SecondaryButton } from '../../components/ui';
import type { OutfitScreenProps } from '../../navigation/types';
import { ApiError, stylistsApi } from '../../services';
import type { Booking } from '../../services/types';
import { borderRadius, colors, spacing, typography } from '../../theme';

export default function MyBookingsScreen({ navigation }: OutfitScreenProps<'MyBookings'>) {
  const [items, setItems] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await stylistsApi.myBookings());
    } catch {
      /* keep the last list */
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

  const cancel = (b: Booking) =>
    Alert.alert('Cancel this session?', b.status === 'confirmed' ? 'Refunds for paid sessions are processed manually within 5 working days.' : undefined, [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Cancel session',
        style: 'destructive',
        onPress: async () => {
          try {
            replace(await stylistsApi.cancel(b.id));
          } catch (e) {
            Alert.alert('Could not cancel', e instanceof ApiError ? e.message : undefined);
          }
        },
      },
    ]);

  const pay = async (b: Booking) => {
    if (b.payment_url) return Linking.openURL(b.payment_url);
    if (__DEV__) replace(await stylistsApi.devPay(b.id));
  };

  const submitReview = async (b: Booking) => {
    setBusy(true);
    try {
      await stylistsApi.review(b.id, { rating, comment: comment.trim() || undefined });
      replace({ ...b, reviewed: true });
      setReviewing(null);
      setComment('');
    } catch (e) {
      Alert.alert('Could not submit', e instanceof ApiError ? e.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="My sessions" onBack={navigation.goBack} />
      <FlatList
        data={items}
        keyExtractor={(b) => b.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
        renderItem={({ item: b }) => (
          <BookingCard booking={b} onPress={() => navigation.navigate('StylistProfile', { stylistId: b.stylist_id })}>
            {b.status === 'pending' ? (
              <View style={styles.actions}>
                <PrimaryButton title={b.payment_url ? `Pay ₹${b.amount_inr}` : __DEV__ ? 'Simulate payment (dev)' : 'Awaiting payment'} onPress={() => pay(b)} disabled={!b.payment_url && !__DEV__} />
                <SecondaryButton title="Cancel" onPress={() => cancel(b)} />
              </View>
            ) : null}
            {b.status === 'confirmed' ? <SecondaryButton title="Cancel session" onPress={() => cancel(b)} /> : null}
            {b.status === 'completed' && !b.reviewed ? (
              reviewing === b.id ? (
                <View style={styles.review}>
                  <OutfitRating rating={rating} onRate={setRating} />
                  <TextInput style={styles.input} value={comment} onChangeText={setComment} placeholder="What stood out?" placeholderTextColor={colors.textMuted} multiline maxLength={1000} />
                  <PrimaryButton title="Submit review" onPress={() => submitReview(b)} loading={busy} />
                </View>
              ) : (
                <SecondaryButton title="Leave a review" onPress={() => setReviewing(b.id)} />
              )
            ) : null}
            {b.status === 'completed' && b.reviewed ? <Text style={typography.caption}>Thanks for your review.</Text> : null}
          </BookingCard>
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={typography.h3}>No sessions yet</Text>
              <Text style={styles.emptyText}>Book a verified stylist to get looks built from your actual wardrobe.</Text>
              <SecondaryButton title="Browse stylists" onPress={() => navigation.navigate('StylistList')} />
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
  review: { gap: spacing.sm },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    height: 72,
    paddingTop: spacing.sm,
    textAlignVertical: 'top',
    ...typography.body1,
  },
  empty: { alignItems: 'center', gap: spacing.sm, padding: spacing.xl },
  emptyText: { ...typography.body2, textAlign: 'center' },
});
