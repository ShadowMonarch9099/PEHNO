/**
 * WardrobeHome — 2-column grid, occasion/fabric/season filters, 30-item goal, upload FAB.
 */
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GarmentCard } from '../../components/garment/GarmentCard';
import { ChipGroup, ProgressBar } from '../../components/ui';
import { usePendingPoll } from '../../hooks/usePendingPoll';
import type { WardrobeScreenProps } from '../../navigation/types';
import type { Season } from '../../services/types';
import { useT } from '../../i18n';
import { useAuthStore, useMetaStore, useWardrobeStore, WARDROBE_GOAL } from '../../store';
import { borderRadius, colors, shadows, spacing, typography } from '../../theme';

type FilterTab = 'occasion' | 'fabric' | 'season';
const TABS: { slug: FilterTab; label: string }[] = [
  { slug: 'occasion', label: 'Occasion' },
  { slug: 'fabric', label: 'Fabric' },
  { slug: 'season', label: 'Season' },
];

export default function WardrobeHomeScreen({ navigation }: WardrobeScreenProps<'WardrobeHome'>) {
  const { width } = useWindowDimensions();
  const user = useAuthStore((s) => s.user);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const { garments, total, filters, loading, error, offline, refresh, setFilters, clearFilters } = useWardrobeStore();
  const t = useT();
  const { options, load } = useMetaStore();
  const [tab, setTab] = useState<FilterTab>('occasion');
  usePendingPoll();

  useEffect(() => {
    void load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
      void refreshUser(); // entitlements (limits, nudge) follow the garment count
    }, [refresh, refreshUser]),
  );

  const cardWidth = (width - spacing.md * 3) / 2;
  const hasFilter = Boolean(filters.occasion || filters.fabric || filters.season);
  const ent = user?.entitlements ?? null;
  const showNudge = !hasFilter && ent?.nudge === 'plus_wardrobe_20';
  const atLimit = !hasFilter && ent?.garment_limit != null && total >= ent.garment_limit;
  const goal = Math.min(total, WARDROBE_GOAL);

  const tabOptions = tab === 'occasion' ? options.occasions : tab === 'fabric' ? options.fabrics : options.seasons;
  const tabValue = tab === 'occasion' ? filters.occasion : tab === 'fabric' ? filters.fabric : filters.season;
  const onTabChange = (slug: string) => {
    const current = tabValue;
    const next = current === slug ? undefined : slug;
    if (tab === 'occasion') setFilters({ occasion: next });
    else if (tab === 'fabric') setFilters({ fabric: next });
    else setFilters({ season: next as Season | undefined });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={typography.caption}>Namaste{user?.name ? `, ${user.name.split(' ')[0]}` : ''}</Text>
          <Text style={typography.h1}>{t('wardrobe.title')}</Text>
        </View>
        <Text style={styles.count}>{total} {t('wardrobe.items')}</Text>
      </View>
      {offline ? <Text style={styles.offline}>{t('common.offline')}</Text> : null}

      {showNudge || atLimit ? (
        <TouchableOpacity
          style={styles.nudge}
          onPress={() => navigation.navigate('Settings', { screen: 'Subscription', params: { highlight: 'plus', reason: 'unlimited_wardrobe' } })}
          accessibilityRole="button"
        >
          <Text style={styles.nudgeTitle}>{atLimit ? `You've reached the free limit of ${ent?.garment_limit}` : `${total} items in — you're building something real`}</Text>
          <Text style={styles.nudgeText}>{atLimit ? 'Plus unlocks an unlimited wardrobe, festival looks and fabric care.' : 'Plus adds festival looks from your own clothes, fabric care and no limits. See plans →'}</Text>
        </TouchableOpacity>
      ) : null}

      {!hasFilter && total >= 5 ? (
        <View style={styles.toolRow}>
          <TouchableOpacity style={[styles.gapCard, styles.flex]} onPress={() => navigation.navigate('GapReport')} accessibilityRole="button">
            <Text style={styles.gapTitle}>🧩 What's missing?</Text>
            <Text style={typography.caption}>Unlock more outfits{ent?.features.gap_report.unlocked ? '' : ' · Plus'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.gapCard, styles.flex]} onPress={() => navigation.navigate('Roi')} accessibilityRole="button">
            <Text style={styles.gapTitle}>₹ Wardrobe value</Text>
            <Text style={typography.caption}>Cost per wear & idle pieces</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      {!hasFilter && total >= 5 ? (
        <TouchableOpacity style={[styles.gapCard, styles.scanCard]} onPress={() => navigation.navigate('ScanMode')} accessibilityRole="button">
          <Text style={styles.gapTitle}>📷 Scan before you buy</Text>
          <Text style={typography.caption}>Does it work with what you own?{ent?.features.scan_mode.unlocked ? '' : ' · Pro'}</Text>
        </TouchableOpacity>
      ) : null}

      {!hasFilter && total < WARDROBE_GOAL ? (
        <View style={styles.goal}>
          <ProgressBar value={goal / WARDROBE_GOAL} label="Wardrobe goal" hint={`${goal} / ${WARDROBE_GOAL}`} />
        </View>
      ) : null}

      <View style={styles.filters}>
        <ChipGroup options={TABS} value={tab} onChange={setTab} scroll />
        <ChipGroup
          options={tabOptions}
          value={tabValue ?? null}
          onChange={onTabChange}
          scroll
          allLabel="All"
          onAll={clearFilters}
        />
      </View>

      <FlatList
        data={garments}
        keyExtractor={(g) => g.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.grid}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <GarmentCard garment={item} width={cardWidth} onPress={() => navigation.navigate('GarmentDetail', { garmentId: item.id })} />
        )}
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🧺</Text>
              <Text style={typography.h3}>{hasFilter ? 'Nothing matches' : 'Your wardrobe is empty'}</Text>
              <Text style={styles.emptyText}>
                {error ?? (hasFilter ? 'Try another filter.' : 'Tap + to photograph your first pieces.')}
              </Text>
            </View>
          )
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('Upload')} accessibilityRole="button" accessibilityLabel="Add garments">
        <Feather name="plus" size={28} color={colors.textInverse} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  count: { ...typography.label, marginBottom: spacing.xs },
  offline: { ...typography.caption, color: colors.warning, paddingHorizontal: spacing.md, paddingBottom: spacing.xs },
  goal: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  toolRow: { flexDirection: 'row', gap: spacing.sm, marginHorizontal: spacing.md, marginTop: spacing.md },
  scanCard: { marginHorizontal: spacing.md, marginTop: spacing.sm },
  flex: { flex: 1 },
  gapCard: { padding: spacing.md, borderRadius: borderRadius.lg, backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.borderLight, gap: 2 },
  gapTitle: { ...typography.h4 },
  nudge: { marginHorizontal: spacing.md, marginTop: spacing.md, padding: spacing.md, borderRadius: borderRadius.lg, backgroundColor: colors.primary, gap: 2 },
  nudgeTitle: { ...typography.h4, color: colors.textInverse },
  nudgeText: { ...typography.caption, color: colors.textInverse },
  filters: { paddingHorizontal: spacing.md, paddingTop: spacing.md, gap: spacing.sm },
  grid: { padding: spacing.md, gap: spacing.md, paddingBottom: 100 },
  row: { gap: spacing.md },
  empty: { alignItems: 'center', paddingTop: spacing.xxl, gap: spacing.sm, paddingHorizontal: spacing.xl },
  emptyEmoji: { fontSize: 48 },
  emptyText: { ...typography.body2, textAlign: 'center' },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 60,
    height: 60,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
});
