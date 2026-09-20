/**
 * Campaigns — sponsored challenges and curated collections for this user's segment.
 */
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LazyImage, ProgressBar, ScreenHeader } from '../../components/ui';
import type { OutfitScreenProps } from '../../navigation/types';
import { brandsApi } from '../../services';
import type { Campaign } from '../../services/types';
import { borderRadius, colors, spacing, typography } from '../../theme';

export default function CampaignsScreen({ navigation }: OutfitScreenProps<'Campaigns'>) {
  const [items, setItems] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await brandsApi.campaigns());
    } catch {
      /* keep last */
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Brand challenges" subtitle="Style looks from your own wardrobe, win from partner brands." onBack={navigation.goBack} />
      <FlatList
        data={items}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
        renderItem={({ item: c }) => (
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('CampaignDetail', { campaignId: c.id })} accessibilityRole="button">
            {c.hero_image_url ? <LazyImage uri={c.hero_image_url} style={styles.hero} /> : null}
            <View style={styles.body}>
              <View style={styles.row}>
                <Text style={styles.brand}>{c.brand.name}</Text>
                <Text style={[styles.kind, c.kind === 'challenge' ? styles.kindChallenge : null]}>{c.kind === 'challenge' ? 'Challenge' : 'Collection'}</Text>
              </View>
              <Text style={typography.h4}>{c.title}</Text>
              {c.rules_text ? <Text style={typography.caption}>{c.rules_text}</Text> : <Text style={typography.caption}>{c.description}</Text>}
              {c.entry && c.challenge ? (
                <View style={styles.progress}>
                  <ProgressBar value={c.entry.progress / c.entry.goal} />
                  <Text style={typography.caption}>
                    {c.entry.completed_at ? 'Completed 🎉' : `${c.entry.progress} of ${c.entry.goal} looks`}
                  </Text>
                </View>
              ) : null}
              {c.reward_text ? <Text style={styles.reward}>🏆 {c.reward_text}</Text> : null}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={typography.h3}>Nothing running for you right now</Text>
              <Text style={styles.emptyText}>Partner challenges are targeted by city and style. Check back soon.</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxl },
  card: { backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.xl, overflow: 'hidden' },
  hero: { width: '100%', height: 140 },
  body: { padding: spacing.md, gap: spacing.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { ...typography.label, color: colors.primary },
  kind: { ...typography.caption, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  kindChallenge: { borderColor: colors.primary, color: colors.primary },
  progress: { gap: 4, marginTop: spacing.xs },
  reward: { ...typography.caption, color: colors.success },
  empty: { alignItems: 'center', gap: spacing.sm, padding: spacing.xl },
  emptyText: { ...typography.body2, textAlign: 'center' },
});
