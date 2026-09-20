/**
 * OOTDFeed — recent shared looks from the viewer's city. Tap a piece to see
 * what it is; heart to like.
 */
import { Feather } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LazyImage, ScreenHeader } from '../../components/ui';
import type { OutfitScreenProps } from '../../navigation/types';
import { socialApi } from '../../services';
import type { FeedItem } from '../../services/types';
import { labelFor, useAuthStore, useMetaStore } from '../../store';
import { borderRadius, colors, shadows, spacing, typography } from '../../theme';

export default function OOTDFeedScreen({ navigation }: OutfitScreenProps<'OOTDFeed'>) {
  const user = useAuthStore((s) => s.user);
  const options = useMetaStore((s) => s.options);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await socialApi.feed());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the feed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleLike = async (item: FeedItem) => {
    const next = item.liked ? await socialApi.unlike(item.outfit_id) : await socialApi.like(item.outfit_id);
    setItems((xs) => xs.map((x) => (x.outfit_id === item.outfit_id ? { ...x, liked: !item.liked, like_count: next.like_count } : x)));
  };

  const showPiece = (item: FeedItem, gid: string) => {
    const g = item.garments.find((x) => x.id === gid);
    if (!g) return;
    Alert.alert(
      `${g.color_primary} ${labelFor(options.garment_types, g.garment_type)}`,
      `${labelFor(options.fabrics, g.fabric_type)} · ${g.occasion_tags.map((o) => labelFor(options.occasions, o)).join(', ') || 'no occasions tagged'}`,
    );
  };

  const aesthetic = items[0]?.aesthetic;

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={`${user?.city ?? 'City'} looks`} subtitle={aesthetic ? `${aesthetic} — what people near you are wearing.` : 'Shared looks from people in your city.'} onBack={navigation.goBack} />
      <FlatList
        data={items}
        keyExtractor={(i) => i.outfit_id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            {item.card_url ? <LazyImage uri={item.card_url} style={styles.cardImage} /> : null}
            <View style={styles.meta}>
              <View style={styles.flex}>
                <Text style={styles.owner}>{item.owner_first_name} · {item.city}</Text>
                <Text style={typography.caption}>
                  {labelFor(options.occasions, item.occasion)}
                  {item.festival ? ` · ${item.festival.replace(/-/g, ' ')}` : ''}
                </Text>
              </View>
              <TouchableOpacity style={styles.like} onPress={() => toggleLike(item)} accessibilityRole="button" accessibilityLabel="Like">
                <Feather name="heart" size={18} color={item.liked ? colors.error : colors.primary} />
                <Text style={styles.likeCount}>{item.like_count}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.pieces}>
              {item.garments.map((g) => (
                <TouchableOpacity key={g.id} style={styles.piece} onPress={() => showPiece(item, g.id)}>
                  <Text style={styles.pieceText}>{g.color_primary} {labelFor(options.garment_types, g.garment_type).toLowerCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.empty}>
              <Text style={typography.h3}>No looks shared here yet</Text>
              <Text style={styles.emptyText}>{error ?? 'Be the first — share a look from the Outfits tab.'}</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  list: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxl },
  card: { backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.xl, overflow: 'hidden', ...shadows.sm },
  cardImage: { width: '100%', aspectRatio: 1080 / 1350, backgroundColor: colors.borderLight },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  owner: { ...typography.h4 },
  like: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: borderRadius.pill, borderWidth: 1, borderColor: colors.border },
  likeCount: { ...typography.label, color: colors.textPrimary },
  pieces: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  piece: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: borderRadius.pill, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.borderLight },
  pieceText: { ...typography.caption, textTransform: 'capitalize', color: colors.textPrimary },
  empty: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.xxl },
  emptyText: { ...typography.body2, textAlign: 'center' },
});
