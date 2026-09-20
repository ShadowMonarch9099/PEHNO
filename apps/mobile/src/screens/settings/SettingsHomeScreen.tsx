/**
 * SettingsHome — profile summary, tier badge, sign out. Sub-screens arrive later.
 */
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChipGroup, SecondaryButton } from '../../components/ui';
import { useI18nStore, useT, type Language } from '../../i18n';
import type { SettingsScreenProps } from '../../navigation/types';
import { stylistsApi, usersApi } from '../../services';
import type { StylistProfile, UserStats } from '../../services/types';
import { labelFor, useAuthStore, useMetaStore } from '../../store';
import { borderRadius, colors, spacing, typography } from '../../theme';

export default function SettingsHomeScreen({ navigation }: SettingsScreenProps<'SettingsHome'>) {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const setUser = useAuthStore((s) => s.setUser);
  const options = useMetaStore((s) => s.options);
  const t = useT();
  const language = useI18nStore((s) => s.language);
  const setLanguage = useI18nStore((s) => s.setLanguage);

  const changeLanguage = async (lang: Language) => {
    await setLanguage(lang); // UI flips immediately; profile keeps other devices in sync
    usersApi.update({ language: lang }).then(setUser).catch(() => undefined);
  };
  const [stats, setStats] = useState<UserStats | null>(null);
  const [stylist, setStylist] = useState<StylistProfile | null>(null);

  useEffect(() => {
    usersApi.stats().then(setStats).catch(() => undefined);
    stylistsApi.me().then(setStylist).catch(() => undefined);
  }, []);

  if (!user) return null;
  const initial = (user.name || user.phone.slice(-2)).charAt(0).toUpperCase();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={typography.h1}>{t('settings.title')}</Text>

        <View style={styles.profile}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.profileText}>
            <Text style={typography.h3}>{user.name || t('settings.addName')}</Text>
            <Text style={typography.caption}>{user.phone} · {user.city}</Text>
          </View>
          <View style={styles.tier}>
            <Text style={styles.tierText}>{user.subscription_tier.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Row k={t('settings.bodyType')} v={user.body_type} />
          <Row k={t('settings.skinTone')} v={user.skin_tone} />
          <Row k={t('settings.style')} v={labelFor(options.regional_styles, user.regional_style)} />
          {stats ? <Row k={t('settings.wardrobe')} v={`${stats.garment_count} ${t('wardrobe.items')} · ${stats.total_wears} ${t('settings.wears')}`} /> : null}
        </View>

        <View style={styles.card}>
          <Text style={typography.h4}>{t('settings.language')}</Text>
          <ChipGroup
            options={[
              { slug: 'en', label: t('settings.language.en') },
              { slug: 'hi', label: t('settings.language.hi') },
            ]}
            value={language}
            onChange={(l) => void changeLanguage(l as Language)}
          />
        </View>

        <TouchableOpacity style={styles.rowLink} onPress={() => navigation.navigate('Subscription')} accessibilityRole="button">
          <Text style={typography.h4}>{t('settings.subscription')}</Text>
          <Text style={typography.caption}>{user.subscription_tier === 'free' ? t('settings.free') : `${user.subscription_tier === 'pro' ? 'Pro' : 'Plus'} · ${t('settings.manage')}`} →</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.rowLink} onPress={() => navigation.navigate('NotificationPrefs')} accessibilityRole="button">
          <Text style={typography.h4}>{t('settings.notifications')}</Text>
          <Text style={typography.caption}>{t('settings.notificationsHint')} →</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.rowLink} onPress={() => navigation.navigate('Outfits', { screen: 'MyBookings' })} accessibilityRole="button">
          <Text style={typography.h4}>{t('settings.stylistSessions')}</Text>
          <Text style={typography.caption}>{t('settings.yourBookings')} →</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.rowLink} onPress={() => navigation.navigate('StylistApply')} accessibilityRole="button">
          <Text style={typography.h4}>{stylist?.is_stylist ? t('settings.yourListing') : t('settings.becomeStylist')}</Text>
          <Text style={typography.caption}>{stylist?.is_stylist ? (stylist.verified ? t('settings.verified') : t('settings.underReview')) : t('settings.apply')} →</Text>
        </TouchableOpacity>
        {stylist?.is_stylist ? (
          <TouchableOpacity style={styles.rowLink} onPress={() => navigation.navigate('IncomingBookings')} accessibilityRole="button">
            <Text style={typography.h4}>{t('settings.bookedWithYou')}</Text>
            <Text style={typography.caption}>{t('settings.manage')} →</Text>
          </TouchableOpacity>
        ) : null}
        <SecondaryButton title={t('settings.signOut')} onPress={signOut} />
      </ScrollView>
    </SafeAreaView>
  );
}

const Row = ({ k, v }: { k: string; v: string }) => (
  <View style={styles.row}>
    <Text style={typography.body2}>{k}</Text>
    <Text style={styles.rowValue}>{v}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  body: { padding: spacing.xl, gap: spacing.lg },
  profile: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...typography.h2, color: colors.textInverse },
  profileText: { flex: 1, gap: 2 },
  tier: { backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.pill, paddingHorizontal: spacing.sm, paddingVertical: 4, borderWidth: 1, borderColor: colors.border },
  tierText: { ...typography.caption, fontWeight: '700', color: colors.primary },
  card: { backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.lg, padding: spacing.md },
  rowLink: { backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.lg, padding: spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  rowValue: { ...typography.body2, color: colors.textPrimary, fontWeight: '600', textTransform: 'capitalize' },
});
