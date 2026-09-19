/**
 * ShareOutfit — preview the item-tagged card, share via the native sheet
 * (Instagram Stories / WhatsApp / …), copy the link, or stop sharing.
 */
import * as Clipboard from 'expo-clipboard';
import React, { useEffect, useState } from 'react';
import { Image, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton, ScreenHeader, SecondaryButton } from '../../components/ui';
import type { OutfitScreenProps } from '../../navigation/types';
import { ApiError, socialApi } from '../../services';
import type { ShareState } from '../../services/types';
import { useOutfitStore } from '../../store';
import { borderRadius, colors, spacing, typography } from '../../theme';

export default function ShareOutfitScreen({ route, navigation }: OutfitScreenProps<'ShareOutfit'>) {
  const { outfitId } = route.params;
  const { byId, upsert } = useOutfitStore();
  const outfit = byId[outfitId];
  const [state, setState] = useState<ShareState | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const apply = (s: ShareState) => {
    setState(s);
    if (outfit) upsert({ ...outfit, is_public: s.is_public, share_url: s.share_url, card_url: s.card_url, like_count: s.like_count });
  };

  useEffect(() => {
    // Sharing renders the card and makes the look public — it is the user's explicit action here.
    socialApi
      .share(outfitId)
      .then(apply)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not create the card'))
      .finally(() => setBusy(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outfitId]);

  const shareSheet = async () => {
    if (!state?.share_url) return;
    await Share.share({ message: `Built my look on PEHNO — ${state.share_url}`, url: state.share_url, title: 'My look on PEHNO' });
  };

  const copy = async () => {
    if (!state?.share_url) return;
    await Clipboard.setStringAsync(state.share_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const stop = async () => {
    setBusy(true);
    try {
      apply(await socialApi.unshare(outfitId));
      navigation.goBack();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not unshare');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Share your look" subtitle="Every piece is tagged. Anyone with the link can see this card." onBack={navigation.goBack} />
      <ScrollView contentContainerStyle={styles.body}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {state?.card_url ? (
          <Image source={{ uri: state.card_url }} style={styles.card} resizeMode="contain" />
        ) : (
          <View style={[styles.card, styles.placeholder]}>
            <Text style={typography.body2}>{busy ? 'Rendering your card…' : 'No card yet'}</Text>
          </View>
        )}
        {state?.share_url ? <Text style={styles.link} numberOfLines={1}>{state.share_url}</Text> : null}
      </ScrollView>
      <View style={styles.footer}>
        <PrimaryButton title="Share to Instagram, WhatsApp…" onPress={shareSheet} disabled={!state?.share_url || busy} />
        <View style={styles.row}>
          <SecondaryButton title={copied ? 'Copied!' : 'Copy link'} onPress={copy} disabled={!state?.share_url} style={styles.half} />
          <SecondaryButton title="Stop sharing" onPress={stop} disabled={busy || !state?.is_public} style={styles.half} textStyle={{ color: colors.error }} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  body: { padding: spacing.xl, gap: spacing.md },
  error: { ...typography.caption, color: colors.error },
  card: { width: '100%', aspectRatio: 1080 / 1350, borderRadius: borderRadius.xl, backgroundColor: colors.surfaceElevated },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  link: { ...typography.caption, textAlign: 'center' },
  footer: { padding: spacing.xl, gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderLight },
  row: { flexDirection: 'row', gap: spacing.sm },
  half: { flex: 1 },
});
