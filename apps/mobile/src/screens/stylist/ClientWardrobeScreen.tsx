/**
 * ClientWardrobe — stylist's read-only view of a client's wardrobe during a
 * confirmed session. First name + city + garments only; tap a piece for details.
 */
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GarmentCard } from '../../components/garment/GarmentCard';
import { ChipGroup, ScreenHeader } from '../../components/ui';
import type { SettingsScreenProps } from '../../navigation/types';
import { ApiError, stylistsApi } from '../../services';
import type { ClientWardrobe, Garment } from '../../services/types';
import { labelFor, useMetaStore } from '../../store';
import { borderRadius, colors, spacing, typography } from '../../theme';

export default function ClientWardrobeScreen({ route, navigation }: SettingsScreenProps<'ClientWardrobe'>) {
  const { bookingId } = route.params;
  const options = useMetaStore((s) => s.options);
  const load = useMetaStore((s) => s.load);
  const { width } = useWindowDimensions();
  const [data, setData] = useState<ClientWardrobe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<string | null>(null);

  useEffect(() => {
    void load();
    stylistsApi
      .clientWardrobe(bookingId)
      .then(setData)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Wardrobe not available'));
  }, [bookingId, load]);

  const garments = data?.garments ?? [];
  const types = Array.from(new Set(garments.map((g) => g.garment_type))).map((t) => ({ slug: t, label: labelFor(options.garment_types, t) }));
  const shown = type ? garments.filter((g) => g.garment_type === type) : garments;
  const cardWidth = (width - spacing.md * 3) / 2;

  const show = (g: Garment) =>
    Alert.alert(
      `${g.color_primary} ${labelFor(options.garment_types, g.garment_type)}`,
      [
        labelFor(options.fabrics, g.fabric_type),
        g.occasion_tags.length ? `Occasions: ${g.occasion_tags.map((o) => labelFor(options.occasions, o)).join(', ')}` : null,
        g.season_tags.length ? `Seasons: ${g.season_tags.join(', ')}` : null,
        `Worn ${g.wear_count}×`,
        g.notes ? `Notes: ${g.notes}` : null,
      ]
        .filter(Boolean)
        .join('\n'),
    );

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title={data ? `${data.client_first_name}'s wardrobe` : 'Client wardrobe'}
        subtitle={data ? `${data.city} · ${labelFor(options.regional_styles, data.regional_style)} · ${garments.length} pieces` : undefined}
        onBack={navigation.goBack}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {data?.notes ? (
        <View style={styles.brief}>
          <Text style={typography.label}>Client's brief</Text>
          <Text style={typography.body2}>{data.notes}</Text>
        </View>
      ) : null}
      {types.length > 1 ? (
        <View style={styles.filters}>
          <ChipGroup options={types} value={type} onChange={(t) => setType(t === type ? null : t)} scroll allLabel="All" onAll={() => setType(null)} />
        </View>
      ) : null}
      <FlatList
        data={shown}
        keyExtractor={(g) => g.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <GarmentCard garment={item} width={cardWidth} onPress={() => show(item)} />}
        ListEmptyComponent={data && !garments.length ? <Text style={styles.empty}>This client hasn't uploaded any classified garments yet.</Text> : null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  error: { ...typography.caption, color: colors.error, paddingHorizontal: spacing.xl },
  brief: { marginHorizontal: spacing.xl, marginBottom: spacing.sm, backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.lg, padding: spacing.md, gap: 4 },
  filters: { paddingHorizontal: spacing.xl, paddingBottom: spacing.sm },
  list: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  row: { gap: spacing.md },
  empty: { ...typography.body2, textAlign: 'center', padding: spacing.xl },
});
