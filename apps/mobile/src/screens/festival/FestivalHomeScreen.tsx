/**
 * FestivalHome — Navratri tracker card (when near/active) + upcoming festival countdowns.
 */
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FestivalBanner } from '../../components/festival/FestivalBanner';
import type { FestivalScreenProps } from '../../navigation/types';
import { useFestivalStore } from '../../store/festival';
import { borderRadius, colors, shadows, spacing, typography } from '../../theme';
import { useT } from '../../i18n';

const fmt = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

export default function FestivalHomeScreen({ navigation }: FestivalScreenProps<'FestivalHome'>) {
  const t = useT();
  const { upcoming: festivals, navratri, loading, error, loadFestivals } = useFestivalStore();
  const load = useCallback(() => loadFestivals(true), [loadFestivals]);

  useFocusEffect(
    useCallback(() => {
      void loadFestivals();
    }, [loadFestivals]),
  );

  const showNavratri = navratri && (navratri.is_active || (navratri.days_until !== null && navratri.days_until <= 30));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.body} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}>
        <Text style={typography.h1}>{t('festival.title')}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {showNavratri && navratri ? (
          <TouchableOpacity style={styles.navratri} onPress={() => navigation.navigate('NavratriTracker')} accessibilityRole="button">
            <View style={styles.navratriRow}>
              <View style={[styles.bigSwatch, { backgroundColor: (navratri.today ?? navratri.sequence[0]).hex }]} />
              <View style={styles.flex}>
                <Text style={styles.navratriTitle}>
                  {navratri.is_active ? `Navratri day ${navratri.day} · ${navratri.today?.name}` : `Navratri in ${navratri.days_until} days`}
                </Text>
                <Text style={typography.body2}>
                  {navratri.is_active
                    ? `${navratri.matching_garments.length} matching ${navratri.matching_garments.length === 1 ? 'item' : 'items'} in your wardrobe`
                    : `Starts ${fmt(navratri.starts_on!)} with ${navratri.sequence[0].name}. See all nine colours →`}
                </Text>
              </View>
            </View>
            <View style={styles.dots}>
              {navratri.sequence.map((c) => (
                <View key={c.day} style={[styles.dot, { backgroundColor: c.hex }, navratri.day === c.day && styles.dotToday]} />
              ))}
            </View>
          </TouchableOpacity>
        ) : null}

        {festivals.map((f) => (
          <FestivalBanner key={f.slug} festival={f} onPress={() => navigation.navigate('FestivalDetail', { slug: f.slug })} />
        ))}
        {!loading && !festivals.length && !error ? <Text style={typography.body2}>No festivals in the next few months.</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  body: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  flex: { flex: 1 },
  error: { ...typography.caption, color: colors.error },
  navratri: { backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.xl, padding: spacing.md, gap: spacing.md, borderWidth: 1, borderColor: colors.primary, ...shadows.sm },
  navratriRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  navratriTitle: { ...typography.h3 },
  bigSwatch: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: colors.borderLight },
  dots: { flexDirection: 'row', justifyContent: 'space-between' },
  dot: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: colors.borderLight },
  dotToday: { borderWidth: 3, borderColor: colors.primary },
  card: { backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.xl, padding: spacing.md, gap: spacing.sm, ...shadows.sm },
  cardActive: { borderWidth: 1, borderColor: colors.primaryContainer },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { ...typography.h3 },
  badge: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  badgeActive: { color: colors.success },
  swatches: { flexDirection: 'row', gap: spacing.xs },
  swatch: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: colors.borderLight },
});
