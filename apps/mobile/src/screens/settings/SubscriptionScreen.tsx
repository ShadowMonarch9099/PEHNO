/**
 * Subscription — Free / Plus / Pro comparison, current plan, upgrade via the
 * provider's hosted checkout, manage / cancel.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton, ScreenHeader, SecondaryButton } from '../../components/ui';
import type { SettingsScreenProps } from '../../navigation/types';
import { ApiError, billingApi } from '../../services';
import type { BillingState, Plan, SubscriptionTier } from '../../services/types';
import { useAuthStore } from '../../store';
import { borderRadius, colors, shadows, spacing, typography } from '../../theme';

const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export default function SubscriptionScreen({ route, navigation }: SettingsScreenProps<'Subscription'>) {
  const highlight = route.params?.highlight;
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [state, setState] = useState<BillingState | null>(null);
  const [busy, setBusy] = useState<SubscriptionTier | 'cancel' | 'confirm' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([billingApi.plans(), billingApi.state()]);
      setPlans(p);
      setState(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load plans');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const tier = state?.entitlements.tier ?? 'free';
  const sub = state?.subscription ?? null;
  const pending = sub?.status === 'created';

  const choose = async (plan: 'plus' | 'pro') => {
    setBusy(plan);
    setError(null);
    try {
      const s = await billingApi.subscribe(plan);
      if (s.checkout_url) {
        await Linking.openURL(s.checkout_url); // Razorpay hosted checkout; webhook activates
        Alert.alert('Complete payment in your browser', 'Your plan activates automatically once payment succeeds. Pull to refresh here.');
      } else {
        // Mock provider (dev): no checkout page — confirm immediately.
        await billingApi.devActivate();
      }
      await load();
      await refreshUser();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not start subscription');
    } finally {
      setBusy(null);
    }
  };

  const confirmPending = async () => {
    setBusy('confirm');
    try {
      await billingApi.devActivate();
      await load();
      await refreshUser();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Not activated yet');
    } finally {
      setBusy(null);
    }
  };

  const cancel = () =>
    Alert.alert('Cancel subscription?', `You keep ${tier === 'pro' ? 'Pro' : 'Plus'} until ${sub?.current_period_end ? fmt(sub.current_period_end) : 'the end of the period'}.`, [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Cancel plan',
        style: 'destructive',
        onPress: async () => {
          setBusy('cancel');
          try {
            await billingApi.cancel();
            await load();
            await refreshUser();
          } catch (e) {
            setError(e instanceof ApiError ? e.message : 'Could not cancel');
          } finally {
            setBusy(null);
          }
        },
      },
    ]);

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Your plan" subtitle={route.params?.reason ? 'Unlock this and more.' : 'Pick what fits your wardrobe.'} onBack={navigation.goBack} />
      <ScrollView contentContainerStyle={styles.body}>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {sub && (sub.status === 'active' || sub.status === 'cancelled') ? (
          <View style={styles.current}>
            <Text style={typography.h4}>
              {sub.plan === 'pro' ? 'Pro' : 'Plus'} · {sub.status === 'cancelled' ? 'ends' : 'renews'} {sub.current_period_end ? fmt(sub.current_period_end) : '—'}
            </Text>
            {sub.status === 'active' ? <SecondaryButton title={busy === 'cancel' ? 'Cancelling…' : 'Cancel subscription'} onPress={cancel} disabled={busy !== null} /> : <Text style={typography.caption}>Cancelled — you keep access until then.</Text>}
          </View>
        ) : null}

        {pending ? (
          <View style={styles.current}>
            <Text style={typography.h4}>Payment pending for {sub!.plan === 'pro' ? 'Pro' : 'Plus'}</Text>
            <Text style={typography.caption}>Finish checkout, then tap confirm.</Text>
            <View style={styles.row}>
              {sub!.checkout_url ? <SecondaryButton title="Open checkout" onPress={() => Linking.openURL(sub!.checkout_url!)} style={styles.half} /> : null}
              <PrimaryButton title="I've paid" onPress={confirmPending} loading={busy === 'confirm'} style={styles.half} />
            </View>
          </View>
        ) : null}

        {plans.map((p) => {
          const isCurrent = p.tier === tier;
          const isHighlight = p.tier === highlight;
          return (
            <View key={p.tier} style={[styles.plan, isHighlight && styles.planHighlight, isCurrent && styles.planCurrent]}>
              <View style={styles.planTop}>
                <View>
                  <Text style={styles.planName}>{p.name}</Text>
                  <Text style={typography.caption}>{p.tagline}</Text>
                </View>
                <Text style={styles.price}>
                  {p.price_inr_month === 0 ? '₹0' : `₹${p.price_inr_month}`}
                  <Text style={typography.caption}>{p.price_inr_month === 0 ? '' : '/mo'}</Text>
                </Text>
              </View>
              <View style={styles.features}>
                {p.features.map((f) => (
                  <Text key={f} style={styles.feature}>
                    ✓ {f}
                  </Text>
                ))}
                {p.garment_limit ? <Text style={styles.feature}>• Up to {p.garment_limit} garments</Text> : null}
              </View>
              {isCurrent ? (
                <View style={styles.currentBadge}>
                  <Text style={styles.currentBadgeText}>Current plan</Text>
                </View>
              ) : p.tier !== 'free' ? (
                <TouchableOpacity style={styles.choose} onPress={() => choose(p.tier as 'plus' | 'pro')} disabled={busy !== null || pending} accessibilityRole="button">
                  <Text style={styles.chooseText}>{busy === p.tier ? 'Starting…' : tier === 'free' ? `Get ${p.name}` : `Switch to ${p.name}`}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          );
        })}

        <Text style={styles.legal}>Billed monthly via Razorpay. Cancel anytime — access continues to the end of the paid period.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  body: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxl },
  error: { ...typography.caption, color: colors.error },
  current: { backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.xl, padding: spacing.md, gap: spacing.sm, borderWidth: 1, borderColor: colors.primaryContainer },
  row: { flexDirection: 'row', gap: spacing.sm },
  half: { flex: 1 },
  plan: { backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.xl, padding: spacing.md, gap: spacing.md, borderWidth: 1.5, borderColor: colors.borderLight, ...shadows.sm },
  planHighlight: { borderColor: colors.primary },
  planCurrent: { borderColor: colors.success },
  planTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md },
  planName: { ...typography.h2 },
  price: { ...typography.h2, color: colors.primary },
  features: { gap: 4 },
  feature: { ...typography.body2 },
  currentBadge: { alignSelf: 'flex-start', paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: borderRadius.pill, backgroundColor: colors.success },
  currentBadgeText: { ...typography.label, color: colors.white },
  choose: { alignItems: 'center', paddingVertical: spacing.md, borderRadius: borderRadius.pill, backgroundColor: colors.primary },
  chooseText: { ...typography.button, color: colors.textInverse },
  legal: { ...typography.caption, textAlign: 'center' },
});
