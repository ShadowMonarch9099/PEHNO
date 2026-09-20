/**
 * BookSession — pick a session type, a day + time, add notes, pay.
 * Payment opens the provider's hosted page; the booking confirms via webhook.
 * With the mock provider (local dev) a "Simulate payment" button stands in.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChipGroup, OptionCard, PrimaryButton, ScreenHeader, SecondaryButton } from '../../components/ui';
import type { OutfitScreenProps } from '../../navigation/types';
import { ApiError, stylistsApi } from '../../services';
import type { Booking, SessionType, Stylist } from '../../services/types';
import { borderRadius, colors, spacing, typography } from '../../theme';

const SESSION_HINT: Record<SessionType, string> = {
  wardrobe_review: 'Go through everything you own; find what works and what to let go.',
  occasion_curation: 'Looks for a specific event — wedding functions, interviews, festivals.',
  trip_packing: 'A capsule for an upcoming trip from what you already have.',
};
const HOURS = [10, 12, 15, 17, 19]; // IST-friendly slots

const dayOptions = () => {
  const out: { slug: string; label: string }[] = [];
  for (let i = 1; i <= 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    out.push({ slug: d.toDateString(), label: d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) });
  }
  return out;
};

export default function BookSessionScreen({ route, navigation }: OutfitScreenProps<'BookSession'>) {
  const { stylistId } = route.params;
  const [s, setS] = useState<Stylist | null>(null);
  const [type, setType] = useState<SessionType>('wardrobe_review');
  const days = useMemo(dayOptions, []);
  const [day, setDay] = useState(days[0].slug);
  const [hour, setHour] = useState<string>('12');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);

  useEffect(() => {
    stylistsApi.get(stylistId).then(setS).catch(() => setError('Stylist not found'));
  }, [stylistId]);

  const scheduledAt = () => {
    const d = new Date(day);
    d.setHours(Number(hour), 0, 0, 0);
    return d.toISOString();
  };

  const book = async () => {
    setBusy(true);
    setError(null);
    try {
      const b = await stylistsApi.book({ stylist_id: stylistId, session_type: type, scheduled_at: scheduledAt(), notes: notes.trim() || undefined });
      setBooking(b);
      if (b.payment_url) await Linking.openURL(b.payment_url);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not book this slot');
    } finally {
      setBusy(false);
    }
  };

  const simulatePay = async () => {
    if (!booking) return;
    setBusy(true);
    try {
      setBooking(await stylistsApi.devPay(booking.id));
    } finally {
      setBusy(false);
    }
  };

  const amount = s?.quote?.amount_inr ?? s?.price_per_session_inr;

  if (booking) {
    const paid = booking.status === 'confirmed';
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title={paid ? 'You’re booked' : 'Almost there'} onBack={() => navigation.navigate('MyBookings')} backLabel="My bookings" />
        <View style={styles.body}>
          <Text style={styles.bigEmoji}>{paid ? '🎉' : '💳'}</Text>
          <Text style={typography.h3}>
            {booking.session_label} with {booking.stylist_name}
          </Text>
          <Text style={typography.body2}>{new Date(booking.scheduled_at).toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' })}</Text>
          {paid ? (
            <Text style={typography.body2}>Paid ₹{booking.amount_inr}. Your stylist can now see your wardrobe until the session is marked complete.</Text>
          ) : (
            <>
              <Text style={typography.body2}>Complete the ₹{booking.amount_inr} payment to confirm. The slot is held for you meanwhile.</Text>
              {booking.payment_url ? <SecondaryButton title="Open payment page" onPress={() => Linking.openURL(booking.payment_url!)} /> : null}
              {!booking.payment_url && __DEV__ ? <SecondaryButton title="Simulate payment (dev)" onPress={simulatePay} loading={busy} /> : null}
            </>
          )}
          <PrimaryButton title="Go to my bookings" onPress={() => navigation.navigate('MyBookings')} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Book a session" subtitle={s ? `${s.name} · ₹${amount} · 60 min` : undefined} onBack={navigation.goBack} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={typography.h4}>What do you need?</Text>
          {(s?.session_types ?? []).map((t) => (
            <OptionCard key={t.slug} title={t.label} description={SESSION_HINT[t.slug]} selected={type === t.slug} onPress={() => setType(t.slug)} />
          ))}

          <Text style={typography.h4}>When?</Text>
          <ChipGroup options={days} value={day} onChange={setDay} scroll />
          <ChipGroup options={HOURS.map((h) => ({ slug: String(h), label: `${h > 12 ? h - 12 : h}:00 ${h >= 12 ? 'pm' : 'am'}` }))} value={hour} onChange={setHour} scroll />

          <Text style={typography.h4}>Anything the stylist should know?</Text>
          <TextInput
            style={styles.input}
            value={notes}
            onChangeText={setNotes}
            placeholder="Cousin’s wedding in December, 3 functions, want to reuse my sarees"
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={1000}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {s?.quote?.pro_discount_applied ? <Text style={styles.discount}>Pro discount −₹{s.quote.discount_inr} applied</Text> : null}
          {amount ? <Text style={typography.caption}>Total ₹{amount} · platform fee included. You pay on the next screen.</Text> : null}
        </ScrollView>
        <View style={styles.footer}>
          <PrimaryButton title={amount ? `Book · ₹${amount}` : 'Book'} onPress={book} loading={busy} disabled={!s} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  body: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxl },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.md,
    height: 96,
    paddingTop: spacing.sm,
    textAlignVertical: 'top',
    ...typography.body1,
  },
  error: { ...typography.caption, color: colors.error },
  discount: { ...typography.caption, color: colors.success },
  footer: { padding: spacing.xl, borderTopWidth: 1, borderTopColor: colors.borderLight },
  bigEmoji: { fontSize: 48, textAlign: 'center' },
});
