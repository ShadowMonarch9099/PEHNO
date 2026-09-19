/**
 * ScanMode (Pro) — photograph an item in a store (or a screenshot) and ask
 * "does this work with what I own?"
 */
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GarmentCard } from '../../components/garment/GarmentCard';
import { GhostLooks, LockedFeature, PrimaryButton, ScreenHeader, SecondaryButton } from '../../components/ui';
import type { WardrobeScreenProps } from '../../navigation/types';
import { ApiError, commerceApi, type LocalPhoto } from '../../services';
import type { Paywall, ScanResult } from '../../services/types';
import { labelFor, useAuthStore, useMetaStore } from '../../store';
import { borderRadius, colors, spacing, typography } from '../../theme';

const VERDICT = {
  buy: { label: 'Worth it', color: colors.success, emoji: '✅' },
  maybe: { label: 'Maybe', color: colors.warning, emoji: '🤔' },
  skip: { label: 'Skip it', color: colors.error, emoji: '🛑' },
};

export default function ScanModeScreen({ navigation }: WardrobeScreenProps<'ScanMode'>) {
  const options = useMetaStore((s) => s.options);
  const ent = useAuthStore((s) => s.user?.entitlements);
  const [photo, setPhoto] = useState<LocalPhoto | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [paywall, setPaywall] = useState<Paywall | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locked = ent && !ent.features.scan_mode.unlocked
    ? { message: ent.features.scan_mode.label + ' is a Pro feature.', feature: 'scan_mode', required_tier: 'pro' as const, upgrade_path: '/billing/plans' }
    : paywall;

  const pick = async (fromCamera: boolean) => {
    setError(null);
    const perm = fromCamera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return setError(fromCamera ? 'Camera permission needed.' : 'Photo permission needed.');
    const res = fromCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 });
    if (res.canceled) return;
    const a = res.assets[0];
    const p = { uri: a.uri, fileName: a.fileName, mimeType: a.mimeType };
    setPhoto(p);
    setResult(null);
    await run(p);
  };

  const run = async (p: LocalPhoto) => {
    setBusy(true);
    setError(null);
    try {
      setResult(await commerceApi.scan(p));
      setPaywall(null);
    } catch (e) {
      if (e instanceof ApiError && e.paywall) setPaywall(e.paywall);
      else setError(e instanceof ApiError ? e.message : 'Scan failed. Try a clearer photo.');
    } finally {
      setBusy(false);
    }
  };

  const v = result ? VERDICT[result.verdict] : null;

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Scan before you buy" subtitle="Photograph it in the store or screenshot it online." onBack={navigation.goBack} />
      <ScrollView contentContainerStyle={styles.body}>
        {locked ? (
          <LockedFeature paywall={locked}>
            <GhostLooks />
          </LockedFeature>
        ) : (
          <>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.action} onPress={() => pick(true)} disabled={busy}>
                <Feather name="camera" size={28} color={colors.primary} />
                <Text style={styles.actionText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.action} onPress={() => pick(false)} disabled={busy}>
                <Feather name="image" size={28} color={colors.primary} />
                <Text style={styles.actionText}>Screenshot</Text>
              </TouchableOpacity>
            </View>

            {photo ? <Image source={{ uri: photo.uri }} style={styles.preview} /> : null}
            {busy ? <Text style={styles.status}>Checking your wardrobe…</Text> : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}

            {result && v ? (
              <>
                <View style={[styles.verdict, { borderColor: v.color }]}>
                  <Text style={[styles.verdictLabel, { color: v.color }]}>
                    {v.emoji} {v.label}
                  </Text>
                  <Text style={typography.h3}>
                    {result.garment_type === 'unknown' ? 'Not sure what this is' : `${result.color_primary} ${labelFor(options.garment_types, result.garment_type).toLowerCase()}`}
                  </Text>
                  <View style={styles.statRow}>
                    <Stat n={`${result.compatibility}%`} label="compatibility" />
                    <Stat n={String(result.pairs_with.length)} label="pairs with" />
                    <Stat n={`+${result.new_outfits}`} label="new outfits" />
                  </View>
                  {result.rationale.map((r) => (
                    <Text key={r} style={typography.body2}>
                      • {r}
                    </Text>
                  ))}
                </View>

                {result.duplicate ? (
                  <View style={styles.dup}>
                    <Text style={styles.dupTitle}>You already own this</Text>
                    <GarmentCard garment={result.duplicate} width={120} onPress={() => navigation.navigate('GarmentDetail', { garmentId: result.duplicate!.id })} />
                  </View>
                ) : null}

                {result.pairs_with.length ? (
                  <View style={styles.pairs}>
                    <Text style={styles.pairsTitle}>Pairs with</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pairsRow}>
                      {result.pairs_with.map((g) => (
                        <GarmentCard key={g.id} garment={g} width={110} onPress={() => navigation.navigate('GarmentDetail', { garmentId: g.id })} />
                      ))}
                    </ScrollView>
                  </View>
                ) : null}

                <View style={styles.footer}>
                  <PrimaryButton title="Bought it — add to wardrobe" onPress={() => navigation.navigate('Upload')} />
                  <SecondaryButton title="Scan another" onPress={() => { setPhoto(null); setResult(null); }} />
                </View>
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const Stat = ({ n, label }: { n: string; label: string }) => (
  <View style={styles.stat}>
    <Text style={styles.statN}>{n}</Text>
    <Text style={typography.caption}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  body: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxl },
  actions: { flexDirection: 'row', gap: spacing.md },
  action: { flex: 1, alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.lg, borderRadius: borderRadius.lg, borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed', backgroundColor: colors.surfaceElevated },
  actionText: { ...typography.label, color: colors.primary },
  preview: { width: '100%', aspectRatio: 0.9, borderRadius: borderRadius.xl, backgroundColor: colors.borderLight },
  status: { ...typography.body2, textAlign: 'center' },
  error: { ...typography.caption, color: colors.error },
  verdict: { backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.xl, padding: spacing.md, gap: spacing.sm, borderWidth: 2 },
  verdictLabel: { ...typography.label },
  statRow: { flexDirection: 'row', gap: spacing.sm },
  stat: { flex: 1, alignItems: 'center', padding: spacing.sm, borderRadius: borderRadius.lg, backgroundColor: colors.background },
  statN: { ...typography.h3, color: colors.primary },
  dup: { gap: spacing.sm },
  dupTitle: { ...typography.h4, color: colors.error },
  pairs: { gap: spacing.sm },
  pairsTitle: { ...typography.h4 },
  pairsRow: { gap: spacing.sm },
  footer: { gap: spacing.sm },
});
