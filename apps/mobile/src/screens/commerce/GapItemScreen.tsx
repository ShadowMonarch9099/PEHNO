/**
 * GapItem — detail for one gap: colours, fabrics, occasions, price band.
 * Shopping section: curated per-platform searches with tracked clicks (weeks 18–19).
 */
import React, { useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Chip, ChipGroup, ScreenHeader } from '../../components/ui';
import type { WardrobeScreenProps } from '../../navigation/types';
import { ApiError, commerceApi } from '../../services';
import type { AffiliateLinks, ProductCard } from '../../services/types';
import { labelFor, useMetaStore } from '../../store';
import { borderRadius, colors, spacing, typography } from '../../theme';
import { hexFor } from '../../utils/colors';

const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export default function GapItemScreen({ route, navigation }: WardrobeScreenProps<'GapItem'>) {
  const { gap } = route.params;
  const options = useMetaStore((s) => s.options);
  const [color, setColor] = useState(gap.suggested_colors[0]);
  const [links, setLinks] = useState<AffiliateLinks | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);

  useEffect(() => {
    commerceApi
      .affiliateLinks({ gap_type: gap.garment_type, color, fabric: gap.suggested_fabrics[0], budget: gap.typical_price_inr[1] })
      .then(setLinks)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not load shopping links'));
  }, [gap, color]);

  const open = async (card: ProductCard) => {
    setOpening(card.platform);
    try {
      const { affiliate_url } = await commerceApi.click(card, gap.garment_type);
      await Linking.openURL(affiliate_url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open link');
    } finally {
      setOpening(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={`A ${gap.suggested_colors[0]} ${gap.label.toLowerCase()}`} subtitle={`Unlocks ${gap.new_outfits} new outfit${gap.new_outfits === 1 ? '' : 's'} from what you own.`} onBack={navigation.goBack} />
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.card}>
          <Text style={typography.body1}>{gap.rationale}</Text>
        </View>

        <Section title="Colours that work with your wardrobe">
          <View style={styles.row}>
            {gap.suggested_colors.map((c, i) => (
              <View key={c} style={styles.colorItem}>
                <View style={[styles.swatch, { backgroundColor: hexFor(c) }, i === 0 && styles.swatchBest]} />
                <Text style={styles.colorLabel}>{c}{i === 0 ? ' ★' : ''}</Text>
              </View>
            ))}
          </View>
        </Section>

        {gap.suggested_fabrics.length ? (
          <Section title="Fabrics to look for">
            <View style={styles.row}>
              {gap.suggested_fabrics.map((f) => (
                <Chip key={f} label={labelFor(options.fabrics, f)} />
              ))}
            </View>
          </Section>
        ) : null}

        <Section title="Occasions it serves">
          <View style={styles.row}>
            {gap.occasions.map((o) => (
              <Chip key={o} label={labelFor(options.occasions, o)} />
            ))}
          </View>
        </Section>

        <Section title="Typical price">
          <Text style={typography.body2}>
            {rupees(gap.typical_price_inr[0])} – {rupees(gap.typical_price_inr[1])} at Indian ethnic-wear retailers.
          </Text>
        </Section>

        <View style={styles.shop}>
          <Text style={typography.h4}>Shop this gap</Text>
          <ChipGroup options={gap.suggested_colors.map((c) => ({ slug: c, label: c }))} value={color} onChange={setColor} scroll />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {links?.cards.map((card) => (
            <TouchableOpacity key={card.platform} style={styles.productCard} onPress={() => open(card)} disabled={opening !== null} accessibilityRole="link">
              <View style={styles.flex}>
                <Text style={styles.productName}>{card.name}</Text>
                <Text style={typography.caption}>
                  {card.is_search ? 'Curated search · ' : ''}
                  {card.price_min_inr != null && card.price_max_inr != null ? `${rupees(card.price_min_inr)}–${rupees(card.price_max_inr)}` : ''}
                </Text>
              </View>
              <Text style={styles.buy}>{opening === card.platform ? 'Opening…' : 'Buy →'}</Text>
            </TouchableOpacity>
          ))}
          {links?.untracked ? <Text style={styles.note}>Affiliate tracking activates once partner IDs are configured — links open the store directly for now.</Text> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  body: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxl },
  card: { backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.xl, padding: spacing.md, borderWidth: 1, borderColor: colors.primaryContainer },
  section: { gap: spacing.sm },
  sectionTitle: { ...typography.label, textTransform: 'uppercase', letterSpacing: 1 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  colorItem: { alignItems: 'center', gap: 4 },
  swatch: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.borderLight },
  swatchBest: { borderWidth: 3, borderColor: colors.primary },
  colorLabel: { ...typography.caption, textTransform: 'capitalize' },
  shop: { backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.xl, padding: spacing.md, gap: spacing.sm },
  flex: { flex: 1 },
  error: { ...typography.caption, color: colors.error },
  note: { ...typography.caption },
  productCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: borderRadius.lg, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.borderLight },
  productName: { ...typography.h4 },
  buy: { ...typography.label, color: colors.primary },
});
