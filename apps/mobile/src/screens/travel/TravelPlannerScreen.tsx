/**
 * TravelPlanner — destination, dates, activities, item budget → generate.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Chip, ChipGroup, LockedFeature, PrimaryButton, ScreenHeader } from '../../components/ui';
import type { OutfitScreenProps } from '../../navigation/types';
import { ApiError, travelApi } from '../../services';
import type { Destination, Paywall } from '../../services/types';
import { useMetaStore } from '../../store';
import { borderRadius, colors, spacing, typography } from '../../theme';

const iso = (d: Date) => d.toISOString().slice(0, 10);
const DAY_CHOICES = [2, 3, 4, 5, 7, 10, 14];
const ITEM_CHOICES = [8, 10, 12, 15, 20];

export default function TravelPlannerScreen({ navigation }: OutfitScreenProps<'TravelPlanner'>) {
  const options = useMetaStore((s) => s.options);
  const loadMeta = useMetaStore((s) => s.load);
  const [dests, setDests] = useState<Destination[]>([]);
  const [destination, setDestination] = useState('');
  const [start, setStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return iso(d);
  });
  const [days, setDays] = useState('4');
  const [activities, setActivities] = useState<string[]>(['casual']);
  const [maxItems, setMaxItems] = useState('12');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paywall, setPaywall] = useState<Paywall | null>(null);

  useEffect(() => {
    void loadMeta();
    travelApi.destinations().then(setDests).catch(() => undefined);
  }, [loadMeta]);

  const picked = useMemo(() => dests.find((d) => d.name.toLowerCase() === destination.trim().toLowerCase()), [dests, destination]);

  const pickDest = (d: Destination) => {
    setDestination(d.name);
    setActivities(d.default_activities);
  };

  const endDate = () => {
    const d = new Date(start);
    d.setDate(d.getDate() + Number(days) - 1);
    return iso(d);
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const plan = await travelApi.plan({ destination: destination.trim(), start_date: start, end_date: endDate(), activities, max_items: Number(maxItems) });
      navigation.replace('TravelPlan', { planId: plan.id });
    } catch (e) {
      if (e instanceof ApiError && e.paywall) setPaywall(e.paywall);
      else setError(e instanceof ApiError ? e.message : 'Could not build a plan');
    } finally {
      setBusy(false);
    }
  };

  const valid = destination.trim().length >= 2 && /^\d{4}-\d{2}-\d{2}$/.test(start) && !Number.isNaN(new Date(start).getTime());

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Plan a trip" subtitle="We'll pick the fewest pieces that dress every day." onBack={navigation.goBack} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {paywall ? <LockedFeature paywall={paywall} compact /> : null}

          <Text style={typography.label}>Where to?</Text>
          <TextInput style={styles.input} value={destination} onChangeText={setDestination} placeholder="Jaipur, Goa, Manali… any city" placeholderTextColor={colors.textMuted} autoCapitalize="words" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {dests.map((d) => (
              <Chip key={d.slug} label={d.name} selected={picked?.slug === d.slug} onPress={() => pickDest(d)} />
            ))}
          </ScrollView>
          {picked ? <Text style={styles.context}>{picked.vibe} — {picked.context}</Text> : null}

          <Text style={typography.label}>Leaving on (YYYY-MM-DD)</Text>
          <TextInput style={styles.input} value={start} onChangeText={setStart} keyboardType="numbers-and-punctuation" placeholderTextColor={colors.textMuted} />
          <Text style={typography.label}>For how many days?</Text>
          <ChipGroup options={DAY_CHOICES.map((n) => ({ slug: String(n), label: `${n}` }))} value={days} onChange={setDays} scroll />

          <Text style={typography.label}>What's on? (day-to-day activities fill days; functions get their own evening looks)</Text>
          <ChipGroup
            options={options.occasions}
            value={activities}
            onChange={(o) => setActivities((xs) => (xs.includes(o) ? xs.filter((x) => x !== o) : [...xs, o]))}
          />

          <Text style={typography.label}>Pack at most</Text>
          <ChipGroup options={ITEM_CHOICES.map((n) => ({ slug: String(n), label: `${n} pieces` }))} value={maxItems} onChange={setMaxItems} scroll />

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>
        <View style={styles.footer}>
          <PrimaryButton title="Build my packing list" onPress={submit} loading={busy} disabled={!valid || !activities.length} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  body: { padding: spacing.xl, gap: spacing.sm, paddingBottom: spacing.xxl },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.md,
    height: 48,
    ...typography.body1,
  },
  chips: { gap: spacing.xs, paddingVertical: spacing.xs },
  context: { ...typography.caption, marginBottom: spacing.sm },
  error: { ...typography.caption, color: colors.error },
  footer: { padding: spacing.xl, borderTopWidth: 1, borderTopColor: colors.borderLight },
});
