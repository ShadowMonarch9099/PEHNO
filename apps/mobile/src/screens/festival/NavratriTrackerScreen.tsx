/**
 * NavratriTrackerScreen — 9-day color grid with matching garments
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, FlatList,
} from 'react-native';
import { colors, spacing, borderRadius, typography, shadows } from '../../theme';
import { ColorDot } from '../../components/ui';
import { GarmentCard } from '../../components/garment';
import { festivalApi } from '../../services/api';

const NAVRATRI_COLORS = [
  { day: 1, color_name: 'Yellow', color_hex: '#FFD700', goddess: 'Shailaputri' },
  { day: 2, color_name: 'Green', color_hex: '#228B22', goddess: 'Brahmacharini' },
  { day: 3, color_name: 'Grey', color_hex: '#808080', goddess: 'Chandraghanta' },
  { day: 4, color_name: 'Orange', color_hex: '#FF8C00', goddess: 'Kushmanda' },
  { day: 5, color_name: 'White', color_hex: '#FFFFFF', goddess: 'Skandamata' },
  { day: 6, color_name: 'Red', color_hex: '#DC143C', goddess: 'Katyayani' },
  { day: 7, color_name: 'Royal Blue', color_hex: '#4169E1', goddess: 'Kalaratri' },
  { day: 8, color_name: 'Pink', color_hex: '#FF69B4', goddess: 'Mahagauri' },
  { day: 9, color_name: 'Purple', color_hex: '#800080', goddess: 'Siddhidatri' },
];

export default function NavratriTrackerScreen({ navigation }: any) {
  const [todayData, setTodayData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    festivalApi.getNavratriToday()
      .then((res) => setTodayData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Navratri 2025 🪦</Text>
          <Text style={styles.subtitle}>9 nights, 9 sacred colors, 9 forms of Devi</Text>
        </View>

        {/* 9-Color Grid */}
        <View style={styles.colorGrid}>
          {NAVRATRI_COLORS.map((nc) => {
            const isToday = todayData?.day === nc.day;
            return (
              <View
                key={nc.day}
                style={[styles.colorCell, isToday && styles.colorCellToday]}
              >
                <View
                  style={[
                    styles.colorCircle,
                    { backgroundColor: nc.color_hex },
                    isToday && styles.colorCircleToday,
                    nc.color_hex === '#FFFFFF' && styles.colorCircleWhite,
                  ]}
                />
                <Text style={styles.colorDay}>Day {nc.day}</Text>
                <Text style={styles.colorName}>{nc.color_name}</Text>
                <Text style={styles.colorGoddess}>{nc.goddess}</Text>
                {isToday && (
                  <View style={styles.todayPill}>
                    <Text style={styles.todayPillText}>Today ✦</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Today's matching garments */}
        {todayData && (
          <View style={styles.matchingSection}>
            <Text style={styles.matchingTitle}>
              Your {todayData.color_name} garments
            </Text>
            <Text style={styles.matchingSubtitle}>
              Wear these today for Day {todayData.day} — {todayData.goddess}
            </Text>

            {todayData.matching_garments?.length > 0 ? (
              <FlatList
                horizontal
                data={todayData.matching_garments}
                keyExtractor={(g: any) => g.id}
                contentContainerStyle={{ gap: spacing.sm }}
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => (
                  <GarmentCard
                    garment={item}
                    onPress={() => navigation.navigate('GarmentDetail', { garmentId: item.id })}
                    size="sm"
                  />
                )}
              />
            ) : (
              <View style={styles.noMatchCard}>
                <Text style={styles.noMatchEmoji}>🔍</Text>
                <Text style={styles.noMatchText}>
                  No {todayData.color_name.toLowerCase()} garments in your wardrobe yet
                </Text>
                <Text style={styles.noMatchHint}>
                  Add some for tomorrow's color: {NAVRATRI_COLORS[Math.min(todayData.day, 8)].color_name}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Goddess descriptions */}
        <Text style={styles.sectionTitle}>The 9 Forms of Goddess Durga</Text>
        {NAVRATRI_COLORS.map((nc) => (
          <View key={nc.day} style={styles.goddessRow}>
            <View style={[styles.goddessColorDot, { backgroundColor: nc.color_hex, borderWidth: nc.color_hex === '#FFFFFF' ? 1 : 0, borderColor: colors.border }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.goddessName}>Day {nc.day} — {nc.goddess}</Text>
              <Text style={styles.goddessColor}>{nc.color_name}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.md, gap: spacing.lg, paddingBottom: 40 },
  header: { gap: spacing.xs, paddingTop: spacing.sm },
  title: { ...typography.h2 },
  subtitle: { ...typography.body2, color: colors.textSecondary },

  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  colorCell: {
    width: '30%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  colorCellToday: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '08',
    transform: [{ scale: 1.04 }],
  },
  colorCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  colorCircleToday: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  colorCircleWhite: { borderWidth: 1.5, borderColor: colors.border },
  colorDay: { ...typography.caption, color: colors.textMuted, fontSize: 10 },
  colorName: { ...typography.label, textAlign: 'center', fontSize: 11 },
  colorGoddess: { fontSize: 9, color: colors.textMuted, textAlign: 'center' },
  todayPill: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.pill,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  todayPillText: { fontSize: 9, color: colors.white, fontWeight: '700' },

  matchingSection: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  matchingTitle: { ...typography.h3 },
  matchingSubtitle: { ...typography.body2, color: colors.textSecondary },
  noMatchCard: { alignItems: 'center', paddingVertical: spacing.md, gap: spacing.xs },
  noMatchEmoji: { fontSize: 36 },
  noMatchText: { ...typography.body2, color: colors.textSecondary, textAlign: 'center' },
  noMatchHint: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },

  sectionTitle: { ...typography.h3 },
  goddessRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  goddessColorDot: { width: 24, height: 24, borderRadius: 12 },
  goddessName: { ...typography.label, color: colors.textPrimary },
  goddessColor: { ...typography.caption, color: colors.textSecondary },
});
