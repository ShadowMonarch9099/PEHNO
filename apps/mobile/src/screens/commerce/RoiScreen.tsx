/**
 * ROI — cost-per-wear leaderboard (worst value first) + underutilised pieces with pairings.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChipGroup, LazyImage, ScreenHeader } from '../../components/ui';
import type { WardrobeScreenProps } from '../../navigation/types';
import { wardrobeApi } from '../../services';
import type { RoiReport, RoiRow, Underutilised } from '../../services/types';
import { labelFor, useMetaStore } from '../../store';
import { borderRadius, colors, spacing, typography } from '../../theme';

const rupees = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const VERDICT: Record<RoiRow['verdict'], { label: string; color: string }> = {
  poor: { label: 'Poor value', color: colors.error },
  ok: { label: 'Fair', color: colors.warning },
  great: { label: 'Great value', color: colors.success },
  unworn: { label: 'Never worn', color: colors.textMuted },
  unpriced: { label: 'Add a price', color: colors.textMuted },
};

export default function RoiScreen({ navigation }: WardrobeScreenProps<'Roi'>) {
  const options = useMetaStore((s) => s.options);
  const [roi, setRoi] = useState<RoiReport | null>(null);
  const [idle, setIdle] = useState<Underutilised[]>([]);
  const [tab, setTab] = useState<'roi' | 'idle'>('roi');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [r, u] = await Promise.all([wardrobeApi.roi(), wardrobeApi.underutilised()]);
      setRoi(r);
      setIdle(u);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const open = (garmentId: string) => navigation.navigate('GarmentDetail', { garmentId });

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Wardrobe value" subtitle="What each piece really costs you per wear — and what's gathering dust." onBack={navigation.goBack} />
      <ScrollView contentContainerStyle={styles.body} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {roi ? (
          <View style={styles.stats}>
            <Stat label="avg ₹/wear" value={roi.summary.avg_cost_per_wear != null ? rupees(roi.summary.avg_cost_per_wear) : '—'} />
            <Stat label="best" value={roi.summary.best != null ? rupees(roi.summary.best) : '—'} good />
            <Stat label="worst" value={roi.summary.worst != null ? rupees(roi.summary.worst) : '—'} bad />
          </View>
        ) : null}

        <ChipGroup
          options={[
            { slug: 'roi', label: 'Cost per wear' },
            { slug: 'idle', label: `Underutilised${idle.length ? ` (${idle.length})` : ''}` },
          ]}
          value={tab}
          onChange={setTab}
        />

        {tab === 'roi' && roi
          ? roi.rows.map((row) => {
              const g = row.garment;
              const v = VERDICT[row.verdict];
              return (
                <TouchableOpacity key={g.id} style={styles.row} onPress={() => open(g.id)} accessibilityRole="button">
                  <LazyImage uri={g.thumbnail_url ?? g.image_url} style={styles.thumb} />
                  <View style={styles.flex}>
                    <Text style={styles.rowTitle}>{g.garment_type === 'unknown' ? 'New item' : labelFor(options.garment_types, g.garment_type)}</Text>
                    <Text style={typography.caption}>
                      {g.wear_count} wear{g.wear_count === 1 ? '' : 's'}
                      {g.purchase_price != null ? ` · paid ${rupees(g.purchase_price)}` : ''}
                    </Text>
                  </View>
                  <View style={styles.right}>
                    <Text style={[styles.cpw, { color: v.color }]}>{row.cost_per_wear != null ? `${rupees(row.cost_per_wear)}/wear` : '—'}</Text>
                    <Text style={[typography.caption, { color: v.color }]}>{v.label}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          : null}

        {tab === 'idle'
          ? idle.length
            ? idle.map((item) => (
                <View key={item.garment.id} style={styles.idleCard}>
                  <TouchableOpacity style={styles.row} onPress={() => open(item.garment.id)}>
                    <LazyImage uri={item.garment.thumbnail_url ?? item.garment.image_url} style={styles.thumb} />
                    <View style={styles.flex}>
                      <Text style={styles.rowTitle}>{labelFor(options.garment_types, item.garment.garment_type)}</Text>
                      <Text style={typography.caption}>{item.days_idle != null ? `Not worn for ${item.days_idle} days` : 'Never worn'}</Text>
                    </View>
                  </TouchableOpacity>
                  {item.pairings.length ? (
                    <View style={styles.pairings}>
                      <Text style={styles.pairTitle}>Try it with</Text>
                      {item.pairings.map((p) => (
                        <TouchableOpacity key={p.garment.id} style={styles.pair} onPress={() => open(p.garment.id)}>
                          <LazyImage uri={p.garment.thumbnail_url ?? p.garment.image_url} style={styles.pairThumb} />
                          <Text style={typography.body2}>
                            your {p.garment.color_primary} {labelFor(options.garment_types, p.garment.garment_type).toLowerCase()} · {labelFor(options.occasions, p.occasion)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <Text style={typography.caption}>Nothing in your wardrobe pairs with it yet — see What's missing?</Text>
                  )}
                </View>
              ))
            : !loading && <Text style={styles.empty}>Everything you own has been worn recently. 👏</Text>
          : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const Stat = ({ label, value, good, bad }: { label: string; value: string; good?: boolean; bad?: boolean }) => (
  <View style={styles.stat}>
    <Text style={[styles.statValue, good && { color: colors.success }, bad && { color: colors.error }]}>{value}</Text>
    <Text style={typography.caption}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  body: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxl },
  flex: { flex: 1 },
  error: { ...typography.caption, color: colors.error },
  empty: { ...typography.body2, textAlign: 'center', paddingTop: spacing.lg },
  stats: { flexDirection: 'row', gap: spacing.sm },
  stat: { flex: 1, backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.lg, padding: spacing.md, alignItems: 'center' },
  statValue: { ...typography.h3 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.sm, borderRadius: borderRadius.lg, backgroundColor: colors.surfaceElevated },
  thumb: { width: 56, height: 68, borderRadius: borderRadius.md, backgroundColor: colors.borderLight },
  rowTitle: { ...typography.h4, textTransform: 'capitalize' },
  right: { alignItems: 'flex-end' },
  cpw: { ...typography.label },
  idleCard: { gap: spacing.sm, padding: spacing.sm, borderRadius: borderRadius.xl, backgroundColor: colors.surfaceElevated },
  pairings: { gap: spacing.xs, paddingHorizontal: spacing.sm, paddingBottom: spacing.xs },
  pairTitle: { ...typography.label },
  pair: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pairThumb: { width: 32, height: 40, borderRadius: 6, backgroundColor: colors.borderLight },
});
