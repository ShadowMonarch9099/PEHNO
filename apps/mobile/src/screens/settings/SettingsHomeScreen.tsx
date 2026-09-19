/**
 * SettingsHome — profile summary, tier badge, sign out. Sub-screens arrive later.
 */
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SecondaryButton } from '../../components/ui';
import type { SettingsScreenProps } from '../../navigation/types';
import { usersApi } from '../../services';
import type { UserStats } from '../../services/types';
import { labelFor, useAuthStore, useMetaStore } from '../../store';
import { borderRadius, colors, spacing, typography } from '../../theme';

export default function SettingsHomeScreen({ navigation }: SettingsScreenProps<'SettingsHome'>) {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const options = useMetaStore((s) => s.options);
  const [stats, setStats] = useState<UserStats | null>(null);

  useEffect(() => {
    usersApi.stats().then(setStats).catch(() => undefined);
  }, []);

  if (!user) return null;
  const initial = (user.name || user.phone.slice(-2)).charAt(0).toUpperCase();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={typography.h1}>Settings</Text>

        <View style={styles.profile}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.profileText}>
            <Text style={typography.h3}>{user.name || 'Add your name'}</Text>
            <Text style={typography.caption}>{user.phone} · {user.city}</Text>
          </View>
          <View style={styles.tier}>
            <Text style={styles.tierText}>{user.subscription_tier.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Row k="Body type" v={user.body_type} />
          <Row k="Skin tone" v={user.skin_tone} />
          <Row k="Style" v={labelFor(options.regional_styles, user.regional_style)} />
          {stats ? <Row k="Wardrobe" v={`${stats.garment_count} items · ${stats.total_wears} wears`} /> : null}
        </View>

        <TouchableOpacity style={styles.rowLink} onPress={() => navigation.navigate('Subscription')} accessibilityRole="button">
          <Text style={typography.h4}>Subscription</Text>
          <Text style={typography.caption}>{user.subscription_tier === 'free' ? 'Free · see Plus and Pro' : `${user.subscription_tier === 'pro' ? 'Pro' : 'Plus'} · manage`} →</Text>
        </TouchableOpacity>
        <Text style={typography.caption}>Profile editing and notification preferences arrive in later build weeks.</Text>
        <SecondaryButton title="Sign out" onPress={signOut} />
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
