/**
 * TravelPlan — the packing list: capsule (with wear counts), day-by-day looks,
 * destination notes, and gaps worth buying (→ affiliate links).
 */
import React, { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WeatherCard } from '../../components/outfit/WeatherCard';
import { ScreenHeader, SecondaryButton } from '../../components/ui';
import type { OutfitScreenProps } from '../../navigation/types';
import { ApiError, travelApi } from '../../services';
import type { Garment, TravelPlan, TripLook } from '../../services/types';
import { labelFor, useMetaStore } from '../../store';
import { borderRadius, colors, spacing, typography } from '../../theme';

const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
const pretty = (s: string) => s.replace(/_/g, ' ');

export default function TravelPlanScreen({ route, navigation }: OutfitScreenProps<'TravelPlan'>) {
  const { planId } = route.params;
  const options = useMetaStore((s) => s.options);
  const { width } = useWindowDimensions();
  const [plan, setPlan] = useState<TravelPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showWeather, setShowWeather] = useState(false);

  useEffect(() => {
    travelApi
      .get(planId)
      .then(setPlan)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Plan not found'));
  }, [planId]);

  const byId: Record<string, Garment> = {};
  plan?.items.forEach((i) => (byId[i.garment.id] = i.garment));
  const tile = (width - spacing.xl * 2 - spacing.sm * 3) / 4;

  const openGarment = (garmentId: string) => navigation.navigate('Wardrobe', { screen: 'GarmentDetail', params: { garmentId } });

  const Look = ({ lk }: { lk: TripLook }) => (
    <View style={styles.look}>
      <View style={styles.lookHead}>
        <Text style={typography.label}>
          Day {lk.day} · {lk.part === 'evening' ? 'Evening' : 'Day'} · {lk.occasion_label}
        </Text>
        <Text style={typography.caption}>{fmt(lk.date)}</Text>
      </View>
      <View style={styles.lookRow}>
        {lk.garment_ids.map((gid) => {
          const g = byId[gid];
          return g ? (
            <TouchableOpacity key={gid} onPress={() => openGarment(gid)} accessibilityRole="button">
              <Image source={{ uri: g.thumbnail_url ?? g.image_url }} style={[styles.thumb, { width: tile, height: tile * 1.2 }]} />
              <Text style={styles.thumbLabel} numberOfLines={1}>
                {g.color_primary} {pretty(g.garment_type)}
              </Text>
            </TouchableOpacity>
          ) : null;
        })}
      </View>
      {lk.rationale.length ? <Text style={typography.caption}>{lk.rationale.slice(0, 2).join(' · ')}</Text> : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={plan ? plan.destination : 'Packing list'} subtitle={plan ? `${fmt(plan.start_date)} – ${fmt(plan.end_date)} · ${plan.weather_summary}` : undefined} onBack={() => navigation.navigate('TravelHome')} backLabel="Trips" />
      <ScrollView contentContainerStyle={styles.body}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {plan ? (
          <>
            <View style={styles.hero}>
              <Text style={styles.heroNum}>
                {plan.item_count} <Text style={styles.heroSmall}>pieces</Text> → {plan.look_count} <Text style={styles.heroSmall}>looks</Text>
              </Text>
              <Text style={typography.caption}>
                {plan.days} day{plan.days === 1 ? '' : 's'} · {plan.looks.length} slots dressed
                {plan.unfilled.length ? ` · ${plan.unfilled.length} need something new` : ''}
              </Text>
            </View>
            {plan.hint ? <Text style={styles.hint}>{plan.hint}</Text> : null}

            <View style={styles.notes}>
              <Text style={typography.h4}>{plan.vibe}</Text>
              <Text style={typography.body2}>{plan.context}</Text>
              {plan.tips.map((t) => (
                <Text key={t} style={typography.body2}>
                  • {t}
                </Text>
              ))}
              {plan.palette.length ? <Text style={typography.caption}>Local palette: {plan.palette.join(', ')}</Text> : null}
            </View>

            <TouchableOpacity onPress={() => setShowWeather((v) => !v)} accessibilityRole="button">
              <Text style={styles.toggle}>{showWeather ? 'Hide' : 'Show'} day-by-day weather</Text>
            </TouchableOpacity>
            {showWeather ? plan.weather.map((w) => <WeatherCard key={w.day} weather={w.weather} />) : null}

            {plan.items.length ? (
              <>
                <Text style={typography.h3}>Pack these</Text>
                <View style={styles.grid}>
                  {plan.items.map((it) => (
                    <TouchableOpacity key={it.garment.id} style={{ width: tile }} onPress={() => openGarment(it.garment.id)} accessibilityRole="button">
                      <Image source={{ uri: it.garment.thumbnail_url ?? it.garment.image_url }} style={[styles.thumb, { width: tile, height: tile * 1.2 }]} />
                      <View style={styles.wears}>
                        <Text style={styles.wearsText}>×{it.wears}</Text>
                      </View>
                      <Text style={styles.thumbLabel} numberOfLines={1}>
                        {it.garment.color_primary} {labelFor(options.garment_types, it.garment.garment_type)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ) : null}

            {plan.looks.length ? (
              <>
                <Text style={typography.h3}>Day by day</Text>
                {plan.looks.map((lk, i) => (
                  <Look key={i} lk={lk} />
                ))}
              </>
            ) : null}

            {plan.gaps.length ? (
              <>
                <Text style={typography.h3}>Worth buying before you go</Text>
                {plan.gaps.map((gap) => (
                  <TouchableOpacity key={gap.rank} style={styles.gap} onPress={() => navigation.navigate('Wardrobe', { screen: 'GapItem', params: { gap } })} accessibilityRole="button">
                    <View style={styles.flex}>
                      <Text style={typography.h4}>
                        {gap.suggested_colors[0]} {gap.label.toLowerCase()}
                      </Text>
                      <Text style={typography.caption}>{gap.rationale}</Text>
                      <Text style={typography.caption}>
                        ₹{gap.typical_price_inr[0]}–{gap.typical_price_inr[1]} · {gap.suggested_fabrics.map(pretty).join(', ')}
                      </Text>
                    </View>
                    <Text style={styles.arrow}>→</Text>
                  </TouchableOpacity>
                ))}
              </>
            ) : null}
            {plan.unfilled.length ? (
              <View style={styles.unfilled}>
                {plan.unfilled.map((u, i) => (
                  <Text key={i} style={typography.caption}>
                    Day {u.day} {u.part} · {u.occasion_label}: nothing in your wardrobe fits yet
                  </Text>
                ))}
              </View>
            ) : null}

            <SecondaryButton title="Plan another trip" onPress={() => navigation.navigate('TravelPlanner')} />
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  body: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxl },
  error: { ...typography.caption, color: colors.error },
  hero: { backgroundColor: colors.primary, borderRadius: borderRadius.xl, padding: spacing.lg, gap: 4 },
  heroNum: { ...typography.h1, color: colors.textInverse },
  heroSmall: { ...typography.body2, color: colors.textInverse },
  hint: { ...typography.caption, color: colors.warning },
  notes: { backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.xl, padding: spacing.md, gap: spacing.xs },
  toggle: { ...typography.label, color: colors.accent },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  thumb: { borderRadius: borderRadius.md, backgroundColor: colors.borderLight },
  thumbLabel: { ...typography.caption, textTransform: 'capitalize', marginTop: 2 },
  wears: { position: 'absolute', top: 4, right: 4, backgroundColor: colors.primary, borderRadius: borderRadius.pill, paddingHorizontal: 6, paddingVertical: 1 },
  wearsText: { ...typography.caption, color: colors.textInverse, fontWeight: '700' },
  look: { backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.lg, padding: spacing.md, gap: spacing.sm },
  lookHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  lookRow: { flexDirection: 'row', gap: spacing.sm },
  gap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1.5, borderColor: colors.border, borderRadius: borderRadius.lg, padding: spacing.md },
  flex: { flex: 1, gap: 2 },
  arrow: { ...typography.h3, color: colors.primary },
  unfilled: { gap: 2 },
});
