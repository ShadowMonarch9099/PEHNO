/**
 * StylistApply — apply to be listed (or update your listing). Admin verifies.
 */
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChipGroup, PrimaryButton, ScreenHeader } from '../../components/ui';
import type { SettingsScreenProps } from '../../navigation/types';
import { ApiError, stylistsApi } from '../../services';
import type { StylistProfile } from '../../services/types';
import { borderRadius, colors, spacing, typography } from '../../theme';

const pretty = (s: string) => s.replace(/_/g, ' ');

export default function StylistApplyScreen({ navigation }: SettingsScreenProps<'StylistApply'>) {
  const [profile, setProfile] = useState<StylistProfile | null>(null);
  const [all, setAll] = useState<string[]>([]);
  const [bio, setBio] = useState('');
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [price, setPrice] = useState('1500');
  const [urls, setUrls] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    stylistsApi.specialties().then(setAll).catch(() => undefined);
    stylistsApi
      .me()
      .then((p) => {
        setProfile(p);
        if (p.is_stylist) {
          setBio(p.bio ?? '');
          setSpecialties(p.specialties);
          setPrice(String(p.price_per_session_inr ?? 1500));
          setUrls(p.portfolio_urls.join('\n'));
        }
      })
      .catch(() => undefined);
  }, []);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const p = await stylistsApi.apply({
        bio: bio.trim(),
        specialties,
        price_per_session_inr: Number(price) || 0,
        portfolio_urls: urls
          .split(/\s+/)
          .map((u) => u.trim())
          .filter(Boolean),
      });
      setProfile(p);
      setSaved(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not submit');
    } finally {
      setBusy(false);
    }
  };

  const status = profile?.is_stylist ? (profile.verified ? 'Verified · listed to users' : 'Under review — we verify every stylist by hand') : null;

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={profile?.is_stylist ? 'Your stylist listing' : 'Become a PEHNO stylist'} subtitle={status ?? 'Paid 60-min sessions with users, built on their real wardrobes.'} onBack={navigation.goBack} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.terms}>
            <Text style={typography.body2}>• You set the price; PEHNO keeps 20% per paid session.</Text>
            <Text style={typography.body2}>• Pro members get 10% off — the discount comes out of the session price.</Text>
            <Text style={typography.body2}>• During a confirmed session you can view the client's wardrobe (first name + city only).</Text>
          </View>

          <Text style={typography.label}>About you (40–1500 characters)</Text>
          <TextInput style={[styles.input, styles.multiline]} value={bio} onChangeText={setBio} placeholder="Ten years dressing brides across Pune…" placeholderTextColor={colors.textMuted} multiline maxLength={1500} />

          <Text style={typography.label}>Specialties (up to 5)</Text>
          <ChipGroup
            options={all.map((s) => ({ slug: s, label: pretty(s) }))}
            value={specialties}
            onChange={(s) => setSpecialties((xs) => (xs.includes(s) ? xs.filter((x) => x !== s) : xs.length < 5 ? [...xs, s] : xs))}
          />

          <Text style={typography.label}>Price per session (₹199 – ₹50,000)</Text>
          <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="numeric" placeholderTextColor={colors.textMuted} />

          <Text style={typography.label}>Portfolio links (one per line)</Text>
          <TextInput style={[styles.input, styles.multiline]} value={urls} onChangeText={setUrls} placeholder="https://instagram.com/you" placeholderTextColor={colors.textMuted} multiline autoCapitalize="none" />

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {saved ? <Text style={styles.ok}>Saved. {profile?.verified ? 'Your listing is live.' : 'We’ll review and switch your listing on.'}</Text> : null}
        </ScrollView>
        <View style={styles.footer}>
          <PrimaryButton title={profile?.is_stylist ? 'Update listing' : 'Submit application'} onPress={submit} loading={busy} disabled={bio.trim().length < 40 || !specialties.length} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  body: { padding: spacing.xl, gap: spacing.sm, paddingBottom: spacing.xxl },
  terms: { backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.lg, padding: spacing.md, gap: 4, marginBottom: spacing.sm },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.md,
    height: 48,
    ...typography.body1,
    marginBottom: spacing.sm,
  },
  multiline: { height: 110, paddingTop: spacing.sm, textAlignVertical: 'top' },
  error: { ...typography.caption, color: colors.error },
  ok: { ...typography.caption, color: colors.success },
  footer: { padding: spacing.xl, borderTopWidth: 1, borderTopColor: colors.borderLight },
});
