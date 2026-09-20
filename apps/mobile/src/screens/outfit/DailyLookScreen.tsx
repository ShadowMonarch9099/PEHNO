/**
 * DailyLook — greeting, weather, today's outfit, "show me another", quick links.
 */
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OutfitCard } from '../../components/outfit/OutfitCard';
import { WeatherCard } from '../../components/outfit/WeatherCard';
import { PrimaryButton, SecondaryButton } from '../../components/ui';
import type { OutfitScreenProps } from '../../navigation/types';
import { ApiError } from '../../services';
import { useT } from '../../i18n';
import { useAuthStore, useMetaStore, useOutfitStore } from '../../store';
import { borderRadius, colors, spacing, typography } from '../../theme';

const greetingKey = () => {
  const h = new Date().getHours();
  return h < 12 ? 'daily.morning' : h < 17 ? 'daily.afternoon' : 'daily.evening';
};

export default function DailyLookScreen({ navigation }: OutfitScreenProps<'DailyLook'>) {
  const t = useT();
  const user = useAuthStore((s) => s.user);
  const load = useMetaStore((s) => s.load);
  const { daily, byId, loadDaily, feedback, toggleSave, wear } = useOutfitStore();
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const outfit = daily.outfit ? (byId[daily.outfit.id] ?? daily.outfit) : null;
  const social = Boolean(user?.entitlements?.flags?.social);

  const refresh = useCallback(
    async (regenerate = false) => {
      setLoading(true);
      setError(null);
      try {
        await loadDaily(regenerate);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : t('daily.error'));
      } finally {
        setLoading(false);
      }
    },
    [loadDaily, t],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
      if (daily.loadedFor !== new Date().toDateString()) void refresh();
    }, [load, refresh, daily.loadedFor]),
  );

  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.body} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => refresh()} tintColor={colors.primary} />}>
        <Text style={typography.caption}>
          {t(greetingKey())}
          {user?.name ? `, ${user.name.split(' ')[0]}` : ''}
        </Text>
        <Text style={typography.h1}>{t('daily.title')}</Text>
        {daily.offline ? <Text style={styles.offline}>{t('common.offline')}</Text> : null}

        {daily.weather ? <WeatherCard weather={daily.weather} /> : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {outfit ? (
          <OutfitCard
            outfit={outfit}
            busy={busy}
            onFeedback={(v) => act(() => feedback(outfit.id, v))}
            onToggleSave={() => act(() => toggleSave(outfit.id))}
            onWear={() => act(() => wear(outfit.id))}
            onShare={social ? () => navigation.navigate('ShareOutfit', { outfitId: outfit.id }) : undefined}
            onGarmentPress={(garmentId) => navigation.navigate('Wardrobe', { screen: 'GarmentDetail', params: { garmentId } })}
          />
        ) : !loading ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🪄</Text>
            <Text style={typography.h3}>{t('daily.noLook')}</Text>
            <Text style={styles.emptyText}>{daily.hint ?? t('daily.noLookHint')}</Text>
            <SecondaryButton title={t('daily.goWardrobe')} onPress={() => navigation.navigate('Wardrobe')} />
          </View>
        ) : null}

        {daily.hint && outfit ? <Text style={styles.hint}>{daily.hint}</Text> : null}

        <View style={styles.buttons}>
          {outfit ? <SecondaryButton title={t('daily.another')} onPress={() => refresh(true)} disabled={loading} /> : null}
          <PrimaryButton title={t('daily.occasion')} onPress={() => navigation.navigate('OccasionPicker')} />
        </View>

        <View style={styles.links}>
          <TouchableOpacity style={styles.link} onPress={() => navigation.navigate('OutfitHistory', { saved: true })}>
            <Text style={styles.linkText}>🔖 {t('daily.saved')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.link} onPress={() => navigation.navigate('OutfitHistory', {})}>
            <Text style={styles.linkText}>🕘 {t('daily.history')}</Text>
          </TouchableOpacity>
          {social ? (
            <TouchableOpacity style={styles.link} onPress={() => navigation.navigate('OOTDFeed')}>
              <Text style={styles.linkText}>🏙️ {t('daily.city')}</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={styles.link} onPress={() => navigation.navigate('TravelHome')}>
            <Text style={styles.linkText}>✈️ {t('daily.travel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.link} onPress={() => navigation.navigate('Campaigns')}>
            <Text style={styles.linkText}>🏷️ {t('daily.brands')}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.stylistBanner} onPress={() => navigation.navigate('StylistList')} accessibilityRole="button">
          <View style={styles.flex}>
            <Text style={typography.h4}>{t('daily.stylistTitle')}</Text>
            <Text style={typography.caption}>{t('daily.stylistBody')}{user?.subscription_tier === 'pro' ? t('daily.proDiscount') : ''}.</Text>
          </View>
          <Text style={styles.arrow}>→</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  body: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  error: { ...typography.caption, color: colors.error },
  offline: { ...typography.caption, color: colors.warning },
  hint: { ...typography.caption, textAlign: 'center' },
  empty: { alignItems: 'center', gap: spacing.sm, padding: spacing.xl, backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.xl },
  emptyEmoji: { fontSize: 40 },
  emptyText: { ...typography.body2, textAlign: 'center' },
  buttons: { gap: spacing.sm },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  link: { flexGrow: 1, flexBasis: '45%', padding: spacing.md, borderRadius: borderRadius.lg, backgroundColor: colors.surfaceElevated, alignItems: 'center' },
  linkText: { ...typography.label, color: colors.textPrimary },
  stylistBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: borderRadius.xl, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surfaceElevated },
  flex: { flex: 1, gap: 2 },
  arrow: { ...typography.h3, color: colors.primary },
});
