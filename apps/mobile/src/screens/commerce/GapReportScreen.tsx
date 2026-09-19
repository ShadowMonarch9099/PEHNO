/**
 * GapReport — "what single purchase unlocks the most outfits?" (Plus/Pro).
 * Free users see the report shape, locked, with an upgrade CTA.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChipGroup, GhostLooks, LockedFeature, ScreenHeader } from '../../components/ui';
import type { WardrobeScreenProps } from '../../navigation/types';
import { ApiError, commerceApi } from '../../services';
import type { GapReport, Paywall } from '../../services/types';
import { labelFor, useMetaStore } from '../../store';
import { borderRadius, colors, shadows, spacing, typography } from '../../theme';
import { hexFor } from '../../utils/colors';

const BUDGETS = [
  { slug: '', label: 'Any budget' },
  { slug: '1000', label: '≤ ₹1,000' },
  { slug: '2500', label: '≤ ₹2,500' },
  { slug: '5000', label: '≤ ₹5,000' },
];

const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export default function GapReportScreen({ navigation }: WardrobeScreenProps<'GapReport'>) {
  const options = useMetaStore((s) => s.options);
  const [report, setReport] = useState<GapReport | null>(null);
  const [paywall, setPaywall] = useState<Paywall | null>(null);
  const [budget, setBudget] = useState('');
  const [custom, setCustom] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (refresh = false) => {
      setLoading(true);
      setError(null);
      try {
        const b = custom ? Number(custom) : budget ? Number(budget) : undefined;
        setReport(await commerceApi.gapReport({ budget: b && b >= 100 ? b : undefined, refresh }));
        setPaywall(null);
      } catch (e) {
        if (e instanceof ApiError && e.paywall) setPaywall(e.paywall);
        else setError(e instanceof Error ? e.message : 'Could not load the report');
      } finally {
        setLoading(false);
      }
    },
    [budget, custom],
  );

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="What's missing?" subtitle="The single piece that unlocks the most new outfits from what you already own." onBack={navigation.goBack} />
      <ScrollView contentContainerStyle={styles.body} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => load(true)} tintColor={colors.primary} />}>
        {paywall ? (
          <LockedFeature paywall={paywall}>
            <View style={styles.ghostReport}>
              {[1, 2, 3].map((i) => (
                <View key={i} style={styles.ghostCard}>
                  <View style={styles.ghostLine} />
                  <View style={[styles.ghostLine, styles.ghostLineShort]} />
                </View>
              ))}
              <GhostLooks />
            </View>
          </LockedFeature>
        ) : null}

        {!paywall ? (
          <>
            <View style={styles.budgetRow}>
              <ChipGroup options={BUDGETS} value={custom ? null : budget} onChange={(v) => { setBudget(v); setCustom(''); }} scroll />
              <TextInput
                style={styles.budgetInput}
                value={custom}
                onChangeText={(t) => setCustom(t.replace(/\D/g, ''))}
                placeholder="₹ custom"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                returnKeyType="done"
                onSubmitEditing={() => load()}
              />
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {report ? (
              <>
                <View style={styles.stats}>
                  <Stat n={report.wardrobe_size} label="garments" />
                  <Stat n={report.current_outfits} label="outfits today" />
                  <Stat n={report.gaps[0]?.new_outfits ?? 0} label="unlocked by #1" accent />
                </View>
                {report.hint ? <Text style={styles.hint}>{report.hint}</Text> : null}

                {report.gaps.map((gap) => (
                  <TouchableOpacity key={gap.garment_type} style={[styles.card, gap.rank === 1 && styles.cardTop]} onPress={() => navigation.navigate('GapItem', { gap })} accessibilityRole="button">
                    <View style={styles.cardHead}>
                      <Text style={styles.rank}>#{gap.rank}</Text>
                      <View style={styles.flex}>
                        <Text style={styles.cardTitle}>
                          {gap.suggested_colors[0]} {gap.label.toLowerCase()}
                        </Text>
                        <Text style={typography.caption}>
                          +{gap.new_outfits} outfit{gap.new_outfits === 1 ? '' : 's'} · {gap.occasions.slice(0, 3).map((o) => labelFor(options.occasions, o)).join(', ')}
                        </Text>
                      </View>
                      <View style={styles.swatches}>
                        {gap.suggested_colors.slice(0, 3).map((c) => (
                          <View key={c} style={[styles.swatch, { backgroundColor: hexFor(c) }]} />
                        ))}
                      </View>
                    </View>
                    <Text style={typography.body2}>{gap.rationale}</Text>
                    <View style={styles.cardFoot}>
                      <Text style={typography.caption}>
                        Typically {rupees(gap.typical_price_inr[0])}–{rupees(gap.typical_price_inr[1])}
                      </Text>
                      <Text style={styles.shop}>Shop this gap →</Text>
                    </View>
                  </TouchableOpacity>
                ))}
                <Text style={styles.meta}>
                  {report.cached ? 'From your weekly report' : 'Freshly computed'} · pull to refresh
                </Text>
              </>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const Stat = ({ n, label, accent }: { n: number; label: string; accent?: boolean }) => (
  <View style={styles.stat}>
    <Text style={[styles.statN, accent && styles.statAccent]}>{n}</Text>
    <Text style={typography.caption}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  body: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxl },
  flex: { flex: 1 },
  error: { ...typography.caption, color: colors.error },
  hint: { ...typography.caption },
  meta: { ...typography.caption, textAlign: 'center' },
  budgetRow: { gap: spacing.sm },
  budgetInput: { borderWidth: 1.5, borderColor: colors.border, borderRadius: borderRadius.lg, backgroundColor: colors.surfaceElevated, paddingHorizontal: spacing.md, height: 44, ...typography.body2 },
  stats: { flexDirection: 'row', gap: spacing.sm },
  stat: { flex: 1, backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.lg, padding: spacing.md, alignItems: 'center' },
  statN: { ...typography.h2 },
  statAccent: { color: colors.primary },
  card: { backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.xl, padding: spacing.md, gap: spacing.sm, ...shadows.sm },
  cardTop: { borderWidth: 1.5, borderColor: colors.primary },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rank: { ...typography.h3, color: colors.primary, width: 32 },
  cardTitle: { ...typography.h4, textTransform: 'capitalize' },
  swatches: { flexDirection: 'row', gap: 4 },
  swatch: { width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: colors.borderLight },
  cardFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  shop: { ...typography.label, color: colors.primary },
  ghostReport: { padding: spacing.md, gap: spacing.sm },
  ghostCard: { backgroundColor: colors.background, borderRadius: borderRadius.lg, padding: spacing.md, gap: spacing.sm },
  ghostLine: { height: 12, borderRadius: 6, backgroundColor: colors.border },
  ghostLineShort: { width: '60%' },
});
