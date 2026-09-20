/**
 * CampaignDetail — rules, progress, products (tracked click-through), join,
 * and "count a look": pick one of your recent outfits to submit.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LazyImage, PrimaryButton, ProgressBar, ScreenHeader, SecondaryButton } from '../../components/ui';
import type { OutfitScreenProps } from '../../navigation/types';
import { ApiError, brandsApi, outfitsApi } from '../../services';
import type { Campaign, Outfit } from '../../services/types';
import { labelFor, useMetaStore } from '../../store';
import { borderRadius, colors, spacing, typography } from '../../theme';

const pretty = (s: string) => s.replace(/_/g, ' ');

export default function CampaignDetailScreen({ route, navigation }: OutfitScreenProps<'CampaignDetail'>) {
  const { campaignId } = route.params;
  const options = useMetaStore((s) => s.options);
  const [c, setC] = useState<Campaign | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const [recent, setRecent] = useState<Outfit[]>([]);

  const load = useCallback(async () => {
    try {
      setC(await brandsApi.campaign(campaignId));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Campaign not found');
    }
  }, [campaignId]);

  useEffect(() => {
    void load();
  }, [load]);

  const join = async () => {
    setBusy(true);
    try {
      setC(await brandsApi.join(campaignId));
    } catch (e) {
      Alert.alert('Could not join', e instanceof ApiError ? e.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const openPicker = async () => {
    setPicking(true);
    try {
      const page = await outfitsApi.history(1);
      setRecent(page.items.filter((o) => !c?.entry?.outfit_ids.includes(o.id)));
    } catch {
      setRecent([]);
    }
  };

  const submit = async (outfit: Outfit) => {
    setBusy(true);
    try {
      const next = await brandsApi.submit(campaignId, outfit.id);
      setC(next);
      setPicking(false);
      if (next.entry?.completed_at) Alert.alert('Challenge complete! 🎉', next.reward_text ?? 'Thanks for taking part.');
    } catch (e) {
      Alert.alert("That look doesn't count", e instanceof ApiError ? e.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const shop = async (productIndex?: number) => {
    try {
      const url = await brandsApi.click(campaignId, productIndex);
      await Linking.openURL(url);
    } catch (e) {
      Alert.alert('Could not open link', e instanceof ApiError ? e.message : undefined);
    }
  };

  const entry = c?.entry;
  const isChallenge = c?.kind === 'challenge';

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={c?.title ?? 'Campaign'} subtitle={c ? `${c.brand.name}${c.brand.tagline ? ` · ${c.brand.tagline}` : ''}` : undefined} onBack={navigation.goBack} />
      <ScrollView contentContainerStyle={styles.body}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {c ? (
          <>
            {c.hero_image_url ? <LazyImage uri={c.hero_image_url} style={styles.hero} /> : null}
            <Text style={typography.body1}>{c.description}</Text>
            {c.hashtag ? <Text style={styles.hashtag}>{c.hashtag}</Text> : null}
            {c.ends_at ? <Text style={typography.caption}>Ends {new Date(c.ends_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })} · {c.participants} taking part</Text> : null}

            {isChallenge ? (
              <View style={styles.rules}>
                <Text style={typography.h4}>How it works</Text>
                <Text style={typography.body2}>{c.rules_text}</Text>
                {c.reward_text ? <Text style={styles.reward}>🏆 {c.reward_text}</Text> : null}
                {entry ? (
                  <>
                    <ProgressBar value={entry.progress / entry.goal} label={entry.completed_at ? 'Completed 🎉' : 'Your progress'} hint={`${entry.progress} / ${entry.goal}`} />
                    {!entry.completed_at ? <PrimaryButton title="Count a look" onPress={openPicker} loading={busy} /> : null}
                  </>
                ) : (
                  <PrimaryButton title="Join the challenge" onPress={join} loading={busy} />
                )}
              </View>
            ) : null}

            {picking ? (
              <View style={styles.picker}>
                <View style={styles.pickerHead}>
                  <Text style={typography.h4}>Pick a look</Text>
                  <TouchableOpacity onPress={() => setPicking(false)} accessibilityRole="button">
                    <Text style={styles.link}>Cancel</Text>
                  </TouchableOpacity>
                </View>
                {recent.length ? (
                  recent.slice(0, 12).map((o) => (
                    <TouchableOpacity key={o.id} style={styles.outfitRow} onPress={() => submit(o)} disabled={busy} accessibilityRole="button">
                      <View style={styles.thumbs}>
                        {o.garments.slice(0, 3).map((g) => (
                          <LazyImage key={g.id} uri={g.thumbnail_url ?? g.image_url} style={styles.thumb} />
                        ))}
                      </View>
                      <View style={styles.flex}>
                        <Text style={typography.label}>{labelFor(options.occasions, o.occasion)}</Text>
                        <Text style={typography.caption} numberOfLines={1}>
                          {o.garments.map((g) => `${g.color_primary} ${pretty(g.garment_type)}`).join(' + ')}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={typography.caption}>No recent looks. Generate one from Today's look or an occasion, then come back.</Text>
                )}
                <SecondaryButton title="Make a new look" onPress={() => navigation.navigate('OccasionPicker')} />
              </View>
            ) : null}

            {c.products.length ? (
              <View style={styles.section}>
                <Text style={typography.h4}>{isChallenge ? 'Pieces that count' : 'The collection'}</Text>
                {c.products.map((p, i) => (
                  <TouchableOpacity key={i} style={styles.product} onPress={() => shop(i)} accessibilityRole="link">
                    {p.image_url ? <LazyImage uri={p.image_url} style={styles.productImg} /> : <View style={[styles.productImg, styles.productPlaceholder]} />}
                    <View style={styles.flex}>
                      <Text style={typography.label}>{p.name}</Text>
                      <Text style={typography.caption}>
                        {p.price_inr != null ? `₹${p.price_inr.toLocaleString('en-IN')}` : ''}
                        {p.garment_type ? ` · ${pretty(p.garment_type)}` : ''}
                      </Text>
                    </View>
                    <Text style={styles.arrow}>→</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
            {c.cta_url ? <SecondaryButton title={c.cta_label} onPress={() => shop()} /> : null}
            <Text style={typography.caption}>Links may earn PEHNO a commission. Prices are set by the brand.</Text>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  body: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxl },
  error: { ...typography.caption, color: colors.error },
  hero: { width: '100%', height: 180, borderRadius: borderRadius.xl },
  hashtag: { ...typography.label, color: colors.accent },
  rules: { backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.xl, padding: spacing.md, gap: spacing.sm },
  reward: { ...typography.body2, color: colors.success },
  picker: { borderWidth: 1.5, borderColor: colors.border, borderRadius: borderRadius.xl, padding: spacing.md, gap: spacing.sm },
  pickerHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  link: { ...typography.label, color: colors.accent },
  outfitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  thumbs: { flexDirection: 'row', gap: 2 },
  thumb: { width: 36, height: 44, borderRadius: borderRadius.sm, backgroundColor: colors.borderLight },
  flex: { flex: 1, gap: 2 },
  section: { gap: spacing.sm },
  product: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.lg, padding: spacing.sm },
  productImg: { width: 56, height: 68, borderRadius: borderRadius.md },
  productPlaceholder: { backgroundColor: colors.borderLight },
  arrow: { ...typography.h3, color: colors.primary },
});
