/**
 * FestivalHomeScreen — Upcoming festivals timeline with countdown badges
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, RefreshControl, TouchableOpacity,
} from 'react-native';
import { colors, spacing, borderRadius, typography, shadows } from '../../theme';
import { FestivalBanner } from '../../components/outfit';
import { useFestivalStore, Festival } from '../../store';
import { festivalApi } from '../../services/api';
import { ColorDot } from '../../components/ui';

export default function FestivalHomeScreen({ navigation }: any) {
  const { upcomingFestivals, navratriDay, loadFestivals, setNavratriDay, isLoading, setLoading } = useFestivalStore();
  const [refreshing, setRefreshing] = useState(false);

  const fetchFestivals = async () => {
    setLoading(true);
    try {
      const [festivalsRes, navratriRes] = await Promise.allSettled([
        festivalApi.getUpcoming(),
        festivalApi.getNavratriToday(),
      ]);
      if (festivalsRes.status === 'fulfilled') {
        loadFestivals(festivalsRes.value.data);
      }
      if (navratriRes.status === 'fulfilled') {
        setNavratriDay(navratriRes.value.data);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchFestivals(); }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchFestivals();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
      >
        <Text style={styles.title}>Festival Calendar 🪔</Text>
        <Text style={styles.subtitle}>Curated looks for upcoming celebrations</Text>

        {/* Navratri Tracker (if active) */}
        {navratriDay && (
          <TouchableOpacity
            style={styles.navratriCard}
            onPress={() => navigation.navigate('NavratriTracker')}
            activeOpacity={0.9}
          >
            <View style={styles.navratriHeader}>
              <Text style={styles.navratriTitle}>Navratri Color Today</Text>
              <Text style={styles.navratriArrow}>See all 9 days →</Text>
            </View>
            <View style={styles.navratriContent}>
              <ColorDot
                color={navratriDay.color_hex}
                isToday
                size={56}
              />
              <View style={styles.navratriInfo}>
                <Text style={styles.navratriColorName}>
                  {navratriDay.color_name}
                </Text>
                <Text style={styles.navratrDay}>Day {navratriDay.day} — Navratri</Text>
                <Text style={styles.navratriMatching}>
                  View matching clothes from your wardrobe →
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* Upcoming Festivals */}
        <Text style={styles.sectionTitle}>Upcoming Festivals</Text>
        {upcomingFestivals.length > 0 ? (
          upcomingFestivals.map((festival: Festival & { days_until: number }) => (
            <FestivalBanner
              key={festival.id}
              festival={festival}
              onPress={() => navigation.navigate('FestivalDetail', { slug: festival.slug })}
            />
          ))
        ) : !isLoading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🎊</Text>
            <Text style={styles.emptyTitle}>No upcoming festivals</Text>
            <Text style={styles.emptySubtitle}>Check back close to festival season!</Text>
          </View>
        ) : null}

        {/* Festival Guide teaser */}
        <TouchableOpacity
          style={styles.guideCard}
          onPress={() => navigation.navigate('FestivalDetail', { slug: 'diwali' })}
          activeOpacity={0.9}
        >
          <Text style={styles.guideEmoji}>🪔</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.guideTitle}>Diwali Dress Guide</Text>
            <Text style={styles.guideSubtitle}>What to wear for the festival of lights</Text>
          </View>
          <Text style={styles.guideArrow}>→</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.md, gap: spacing.md, paddingBottom: 40 },
  title: { ...typography.h2, marginTop: spacing.sm },
  subtitle: { ...typography.body2, color: colors.textSecondary },

  navratriCard: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    gap: spacing.md,
    ...shadows.md,
  },
  navratriHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navratriTitle: { ...typography.h4, color: colors.white },
  navratriArrow: { ...typography.caption, color: colors.accent },
  navratriContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  navratriInfo: { flex: 1, gap: 4 },
  navratriColorName: { fontSize: 22, fontWeight: '700', color: colors.white },
  navratrDay: { ...typography.body2, color: colors.white + 'AA' },
  navratriMatching: { ...typography.caption, color: colors.accent },

  sectionTitle: { ...typography.h3 },

  emptyState: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { ...typography.h3 },
  emptySubtitle: { ...typography.body2, color: colors.textSecondary },

  guideCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  guideEmoji: { fontSize: 36 },
  guideTitle: { ...typography.h4 },
  guideSubtitle: { ...typography.body2, color: colors.textSecondary },
  guideArrow: { ...typography.h3, color: colors.primary },
});
