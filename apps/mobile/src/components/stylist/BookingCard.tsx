import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { Booking, BookingStatus } from '../../services/types';
import { borderRadius, colors, spacing, typography } from '../../theme';

const STATUS: Record<BookingStatus, { label: string; color: string }> = {
  pending: { label: 'Awaiting payment', color: colors.warning },
  confirmed: { label: 'Confirmed', color: colors.success },
  completed: { label: 'Completed', color: colors.textMuted },
  cancelled: { label: 'Cancelled', color: colors.error },
};

export const formatSlot = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

interface Props {
  booking: Booking;
  /** Stylist's view shows the client + payout; client's view shows the stylist + amount. */
  asStylist?: boolean;
  onPress?: () => void;
  children?: React.ReactNode;
}

export const BookingCard: React.FC<Props> = ({ booking: b, asStylist, onPress, children }) => {
  const s = STATUS[b.status];
  const who = asStylist ? `${b.client_first_name}` : b.stylist_name;
  const money = asStylist && b.stylist_payout_inr != null ? `₹${b.stylist_payout_inr} to you` : `₹${b.amount_inr}`;
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined}>
      <View style={styles.top}>
        <View style={styles.flex}>
          <Text style={typography.h4}>{b.session_label}</Text>
          <Text style={typography.caption}>
            {asStylist ? 'with ' : 'by '}
            {who} · {formatSlot(b.scheduled_at)}
          </Text>
        </View>
        <View style={[styles.badge, { borderColor: s.color }]}>
          <Text style={[styles.badgeText, { color: s.color }]}>{s.label}</Text>
        </View>
      </View>
      <View style={styles.bottom}>
        <Text style={styles.money}>{money}</Text>
        {b.discount_inr > 0 ? <Text style={styles.discount}>Pro discount −₹{b.discount_inr}</Text> : null}
        <Text style={typography.caption}>{b.duration_minutes} min</Text>
      </View>
      {b.notes ? <Text style={styles.notes}>“{b.notes}”</Text> : null}
      {children}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.xl, padding: spacing.md, gap: spacing.sm },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  flex: { flex: 1, gap: 2 },
  badge: { borderWidth: 1, borderRadius: borderRadius.pill, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  badgeText: { ...typography.caption, fontWeight: '700' },
  bottom: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  money: { ...typography.body1, fontWeight: '700', color: colors.textPrimary },
  discount: { ...typography.caption, color: colors.success },
  notes: { ...typography.body2, fontStyle: 'italic' },
});
