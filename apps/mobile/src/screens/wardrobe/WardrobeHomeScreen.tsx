/**
 * WardrobeHomeScreen — Grid of garments with filter bar
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity,
  ScrollView, RefreshControl,
} from 'react-native';
import { colors, spacing, borderRadius, typography, shadows } from '../../theme';
import { GarmentCard } from '../../components/garment';
import { LoadingOverlay } from '../../components/ui';
import { useWardrobeStore, Garment } from '../../store';
import { wardrobeApi } from '../../services/api';

const OCCASION_FILTERS = ['all', 'casual', 'office', 'festival', 'wedding_guest', 'pooja', 'temple'];
const FABRIC_FILTERS = ['all', 'cotton', 'silk', 'georgette', 'velvet', 'banarasi'];
const SEASON_FILTERS = ['all', 'summer', 'monsoon', 'winter'];

export default function WardrobeHomeScreen({ navigation }: any) {
  const { garments, isLoading, filters, loadGarments, setFilters, setLoading } = useWardrobeStore();
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState<'occasion' | 'fabric' | 'season'>('occasion');

  const fetchGarments = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filters.occasion) params.occasion = filters.occasion;
      if (filters.fabric) params.fabric = filters.fabric;
      if (filters.season) params.season = filters.season;
      const res = await wardrobeApi.list(params);
      loadGarments(res.data.items);
    } catch (e) {
      console.error('Failed to load wardrobe', e);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchGarments(); }, [fetchGarments]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchGarments();
    setRefreshing(false);
  };

  const handleGarmentPress = (garment: Garment) => {
    navigation.navigate('GarmentDetail', { garmentId: garment.id });
  };

  const filterOptions = {
    occasion: OCCASION_FILTERS,
    fabric: FABRIC_FILTERS,
    season: SEASON_FILTERS,
  };

  const currentFilter = filters[activeFilterTab];

  const FilterPill = ({ label, active, onPress }: any) => (
    <TouchableOpacity
      style={[styles.filterPill, active && styles.filterPillActive]}
      onPress={onPress}
    >
      <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>
        {label === 'all' ? 'All' : label.replace('_', ' ')}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Wardrobe</Text>
          <Text style={styles.count}>{garments.length} items</Text>
        </View>
        <TouchableOpacity style={styles.searchBtn}>
          <Text style={styles.searchBtnText}>🔍</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tab Bar */}
      <View style={styles.filterTabs}>
        {(['occasion', 'fabric', 'season'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.filterTab, activeFilterTab === tab && styles.filterTabActive]}
            onPress={() => setActiveFilterTab(tab)}
          >
            <Text style={[styles.filterTabText, activeFilterTab === tab && styles.filterTabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Filter Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterPillsRow}
        contentContainerStyle={{ paddingHorizontal: spacing.md, gap: spacing.xs }}
      >
        {filterOptions[activeFilterTab].map((option) => (
          <FilterPill
            key={option}
            label={option}
            active={option === 'all' ? !currentFilter : currentFilter === option}
            onPress={() => setFilters({ [activeFilterTab]: option === 'all' ? null : option })}
          />
        ))}
      </ScrollView>

      {/* Garment Grid */}
      <FlatList
        data={garments}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.gridRow}
        renderItem={({ item }) => (
          <GarmentCard garment={item} onPress={handleGarmentPress} />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>👗</Text>
              <Text style={styles.emptyTitle}>Your wardrobe is empty</Text>
              <Text style={styles.emptySubtitle}>
                Press the + button below to add your first garment
              </Text>
            </View>
          ) : null
        }
      />

      {/* Floating Upload Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('Upload')}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  title: { ...typography.h2 },
  count: { ...typography.body2, color: colors.textSecondary },
  searchBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  searchBtnText: { fontSize: 18 },

  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  filterTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterTabActive: { backgroundColor: colors.primary + '15', borderColor: colors.primary },
  filterTabText: { ...typography.label, color: colors.textSecondary },
  filterTabTextActive: { color: colors.primary, fontWeight: '700' },

  filterPillsRow: { maxHeight: 40, marginBottom: spacing.xs },
  filterPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterPillText: { ...typography.caption, color: colors.textSecondary, textTransform: 'capitalize' },
  filterPillTextActive: { color: colors.white, fontWeight: '700' },

  grid: { paddingHorizontal: spacing.md, paddingBottom: 100 },
  gridRow: { gap: spacing.sm, justifyContent: 'space-between' },

  emptyState: { flex: 1, alignItems: 'center', paddingTop: 80, gap: spacing.md },
  emptyEmoji: { fontSize: 64 },
  emptyTitle: { ...typography.h3, color: colors.textPrimary },
  emptySubtitle: { ...typography.body2, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: spacing.xl },

  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
  fabText: { color: colors.white, fontSize: 28, fontWeight: '300', lineHeight: 32 },
});
