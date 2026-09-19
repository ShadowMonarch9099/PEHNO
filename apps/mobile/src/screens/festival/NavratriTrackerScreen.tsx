/**
 * NavratriTracker — 9-day colour grid (today glows) + matching garments from the wardrobe.
 */
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GarmentCard } from '../../components/garment/GarmentCard';
import { GhostLooks, LockedFeature, ScreenHeader } from '../../components/ui';
import type { FestivalScreenProps } from '../../navigation/types';
import { festivalsApi } from '../../services';
import type { NavratriToday } from '../../services/types';
import { borderRadius, colors, shadows, spacing, typography } from '../../theme';

const fmt = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

export default function NavratriTrackerScreen({ navigation }: FestivalScreenProps<'NavratriTracker'>) {
  const { width } = useWindowDimensions();
  const [data, setData] = useState<NavratriToday | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    festivalsApi
      .navratriToday()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load'));
  }, []);

  const cardWidth = (width - spacing.xl * 2 - spacing.sm) / 2;
  const focus = data?.today ?? data?.sequence[0] ?? null;

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="Navratri colours"
        subtitle={data ? (data.is_active ? `Day ${data.day} of 9 — wear ${data.today?.name}` : data.starts_on ? `Starts ${fmt(data.starts_on)} · in ${data.days_until} days` : 'Dates not available') : undefined}
        onBack={navigation.goBack}
      />
      <ScrollView contentContainerStyle={styles.body}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {data ? (
          <>
            <View style={styles.grid}>
              {data.sequence.map((c) => {
                const isToday = data.is_active && data.day === c.day;
                return (
                  <View key={c.day} style={[styles.cell, isToday && styles.cellToday]}>
                    <View style={[styles.swatch, { backgroundColor: c.hex }]} />
                    <Text style={styles.day}>Day {c.day}</Text>
                    <Text style={styles.name}>{c.name}</Text>
                    <Text style={typography.caption}>{fmt(c.date)}</Text>
                    {c.goddess ? <Text style={styles.goddess}>{c.goddess}</Text> : null}
                  </View>
                );
              })}
            </View>

            {focus ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {data.is_active ? `Wear ${focus.name} today` : `${focus.name} for day 1`}
                  {data.locked ? '' : ` · ${data.matching_garments.length} in your wardrobe`}
                </Text>
                {data.locked ? (
                  <LockedFeature paywall={data.locked} compact>
                    <GhostLooks count={2} />
                  </LockedFeature>
                ) : data.matching_garments.length ? (
                  <View style={styles.garments}>
                    {data.matching_garments.map((g) => (
                      <GarmentCard key={g.id} garment={g} width={cardWidth} onPress={() => navigation.navigate('Wardrobe', { screen: 'GarmentDetail', params: { garmentId: g.id } })} />
                    ))}
                  </View>
                ) : (
                  <Text style={typography.body2}>Nothing in {focus.name.toLowerCase()} yet — a dupatta or kurti in this colour completes the nine days.</Text>
                )}
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  body: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxl },
  error: { ...typography.caption, color: colors.error },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cell: { width: '31%', alignItems: 'center', gap: 2, padding: spacing.sm, borderRadius: borderRadius.lg, backgroundColor: colors.surfaceElevated },
  cellToday: { borderWidth: 2, borderColor: colors.primary, ...shadows.md },
  swatch: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.borderLight, marginBottom: 4 },
  day: { ...typography.caption, fontWeight: '700' },
  name: { ...typography.label, color: colors.textPrimary, textAlign: 'center' },
  goddess: { ...typography.caption, fontStyle: 'italic' },
  section: { gap: spacing.sm },
  sectionTitle: { ...typography.h4 },
  garments: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
