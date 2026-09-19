/**
 * GapItem — detail for one gap: colours, fabrics, occasions, price band.
 * Affiliate product cards (Myntra / Ajio / Nykaa) plug in here in weeks 18–19.
 */
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Chip, ScreenHeader, SecondaryButton } from '../../components/ui';
import type { WardrobeScreenProps } from '../../navigation/types';
import { labelFor, useMetaStore } from '../../store';
import { borderRadius, colors, spacing, typography } from '../../theme';
import { hexFor } from '../../utils/colors';

const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export default function GapItemScreen({ route, navigation }: WardrobeScreenProps<'GapItem'>) {
  const { gap } = route.params;
  const options = useMetaStore((s) => s.options);

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
          <Text style={typography.h4}>Curated picks</Text>
          <Text style={typography.body2}>Matching products from Myntra, Ajio and Nykaa land here once affiliate partnerships are live (build weeks 18–19).</Text>
          <SecondaryButton title="Back to report" onPress={navigation.goBack} />
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
});
