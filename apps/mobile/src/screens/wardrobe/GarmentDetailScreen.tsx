/**
 * GarmentDetail — photo, classification, stats (wears, cost-per-wear), actions.
 */
import React, { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Chip, PrimaryButton, ScreenHeader, SecondaryButton } from '../../components/ui';
import type { WardrobeScreenProps } from '../../navigation/types';
import { wardrobeApi } from '../../services';
import { labelFor, useMetaStore, useWardrobeStore } from '../../store';
import { borderRadius, colors, spacing, typography } from '../../theme';

const rupees = (n: number | null) => (n === null ? '—' : `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`);

export default function GarmentDetailScreen({ route, navigation }: WardrobeScreenProps<'GarmentDetail'>) {
  const { garmentId } = route.params;
  const cached = useWardrobeStore((s) => s.garments.find((g) => g.id === garmentId));
  const { upsert, remove, logWear } = useWardrobeStore();
  const options = useMetaStore((s) => s.options);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Always refetch: classification may have completed since the grid loaded.
    wardrobeApi.get(garmentId).then(upsert).catch(() => undefined);
  }, [garmentId, upsert]);

  if (!cached) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Loading…" onBack={navigation.goBack} />
      </SafeAreaView>
    );
  }
  const g = cached;
  const pending = g.classification_status === 'pending';
  const title = g.garment_type === 'unknown' ? 'New item' : labelFor(options.garment_types, g.garment_type);

  const confirmDelete = () =>
    Alert.alert('Remove this item?', 'It will be deleted from your wardrobe.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await remove(g.id);
            navigation.goBack();
          } finally {
            setBusy(false);
          }
        },
      },
    ]);

  const wear = async () => {
    setBusy(true);
    try {
      await logWear(g.id);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={title} onBack={navigation.goBack} />
      <ScrollView contentContainerStyle={styles.body}>
        <Image source={{ uri: g.image_url }} style={styles.image} resizeMode="cover" />

        {pending ? (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>✨ Classifying… you can fill in details yourself meanwhile.</Text>
          </View>
        ) : null}

        <View style={styles.statsRow}>
          <Stat label="Worn" value={`${g.wear_count}×`} />
          <Stat label="Cost / wear" value={rupees(g.cost_per_wear)} />
          <Stat label="Paid" value={rupees(g.purchase_price)} />
        </View>

        <Section title="Details">
          <Row k="Fabric" v={g.fabric_type === 'unknown' ? '—' : labelFor(options.fabrics, g.fabric_type)} />
          <Row k="Colour" v={g.color_primary === 'unknown' ? '—' : labelFor(options.colors, g.color_primary)} />
          {g.color_accent ? <Row k="Accent" v={labelFor(options.colors, g.color_accent)} /> : null}
          <Row k="Condition" v={labelFor(options.conditions, g.condition)} />
          {g.regional_style ? <Row k="Style" v={labelFor(options.regional_styles, g.regional_style)} /> : null}
          {g.user_verified ? <Row k="Verified" v="By you ✓" /> : g.ai_confidence ? <Row k="AI confidence" v={`${Math.round(g.ai_confidence * 100)}%`} /> : null}
        </Section>

        {g.occasion_tags.length ? (
          <Section title="Occasions">
            <View style={styles.chips}>
              {g.occasion_tags.map((o) => (
                <Chip key={o} label={labelFor(options.occasions, o)} />
              ))}
            </View>
          </Section>
        ) : null}
        {g.season_tags.length ? (
          <Section title="Seasons">
            <View style={styles.chips}>
              {g.season_tags.map((s) => (
                <Chip key={s} label={labelFor(options.seasons, s)} />
              ))}
            </View>
          </Section>
        ) : null}
        {g.notes ? (
          <Section title="Notes">
            <Text style={typography.body2}>{g.notes}</Text>
          </Section>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton title="I wore this today" onPress={wear} loading={busy} />
        <View style={styles.footerRow}>
          <SecondaryButton title="Edit details" onPress={() => navigation.navigate('GarmentEdit', { garmentId: g.id })} style={styles.half} />
          <SecondaryButton title="Delete" onPress={confirmDelete} style={styles.half} textStyle={{ color: colors.error }} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const Stat = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.stat}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={typography.caption}>{label}</Text>
  </View>
);
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);
const Row = ({ k, v }: { k: string; v: string }) => (
  <View style={styles.row}>
    <Text style={typography.body2}>{k}</Text>
    <Text style={styles.rowValue}>{v}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  body: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxl },
  image: { width: '100%', aspectRatio: 0.85, borderRadius: borderRadius.xl, backgroundColor: colors.borderLight },
  notice: { backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.lg, padding: spacing.md },
  noticeText: { ...typography.body2 },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  stat: { flex: 1, backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.lg, padding: spacing.md, alignItems: 'center', gap: 2 },
  statValue: { ...typography.h3 },
  section: { gap: spacing.sm },
  sectionTitle: { ...typography.label, textTransform: 'uppercase', letterSpacing: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  rowValue: { ...typography.body2, color: colors.textPrimary, fontWeight: '600', textTransform: 'capitalize' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  footer: { padding: spacing.xl, gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderLight },
  footerRow: { flexDirection: 'row', gap: spacing.sm },
  half: { flex: 1 },
});
