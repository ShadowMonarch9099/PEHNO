/**
 * SettingsHomeScreen — Profile, subscription, notifications
 */
import React from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Switch,
} from 'react-native';
import { colors, spacing, borderRadius, typography, shadows } from '../../theme';
import { useUserStore } from '../../store';
import * as SecureStore from 'expo-secure-store';

interface SettingsRowProps {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
}

const SettingsRow: React.FC<SettingsRowProps> = ({ icon, label, value, onPress, rightElement }) => (
  <TouchableOpacity style={styles.settingsRow} onPress={onPress} disabled={!onPress}>
    <View style={styles.settingsRowLeft}>
      <Text style={styles.settingsIcon}>{icon}</Text>
      <View>
        <Text style={styles.settingsLabel}>{label}</Text>
        {value && <Text style={styles.settingsValue}>{value}</Text>}
      </View>
    </View>
    {rightElement || (onPress && <Text style={styles.settingsChevron}>›</Text>)}
  </TouchableOpacity>
);

export default function SettingsHomeScreen({ navigation }: any) {
  const { user, logout } = useUserStore();

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
    logout();
    navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
  };

  const subscriptionColors: Record<string, string> = {
    free: colors.textMuted,
    plus: colors.accent,
    pro: colors.primary,
  };

  const tierLabel = {
    free: 'Free Plan',
    plus: 'Plus',
    pro: 'Pro',
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {(user?.name || 'P').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name || 'Your Name'}</Text>
            <Text style={styles.profilePhone}>{user?.phone}</Text>
            <View style={[
              styles.tierBadge,
              { backgroundColor: (subscriptionColors[user?.subscription_tier || 'free']) + '20' }
            ]}>
              <Text style={[
                styles.tierText,
                { color: subscriptionColors[user?.subscription_tier || 'free'] }
              ]}>
                {tierLabel[user?.subscription_tier || 'free']}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => navigation.navigate('ProfileSetup')}
          >
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.card}>
            <SettingsRow icon="👤" label="Profile" value={user?.city} onPress={() => navigation.navigate('ProfileSetup')} />
            <View style={styles.divider} />
            <SettingsRow icon="👑" label="Subscription" value={tierLabel[user?.subscription_tier || 'free']} onPress={() => navigation.navigate('Subscription')} />
          </View>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.card}>
            <SettingsRow icon="🔔" label="Notification Preferences" onPress={() => navigation.navigate('NotificationPrefs')} />
          </View>
        </View>

        {/* Privacy & Help */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy & Help</Text>
          <View style={styles.card}>
            <SettingsRow icon="🔒" label="Privacy Policy" onPress={() => {}} />
            <View style={styles.divider} />
            <SettingsRow icon="📋" label="Terms of Service" onPress={() => {}} />
            <View style={styles.divider} />
            <SettingsRow icon="💬" label="Contact Support" onPress={() => {}} />
            <View style={styles.divider} />
            <SettingsRow icon="⭐" label="Rate Pehno" onPress={() => {}} />
          </View>
        </View>

        {/* App info */}
        <Text style={styles.appVersion}>PEHNO v1.0.0 • Made with ❤️ in India</Text>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.md, gap: spacing.md, paddingBottom: 40 },

  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    ...shadows.md,
    marginTop: spacing.sm,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 26, fontWeight: '700', color: colors.white },
  profileInfo: { flex: 1, gap: 4 },
  profileName: { ...typography.h4 },
  profilePhone: { ...typography.body2, color: colors.textSecondary },
  tierBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.pill,
  },
  tierText: { fontSize: 11, fontWeight: '700' },
  editBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
  },
  editBtnText: { ...typography.body2, color: colors.primary, fontWeight: '600' },

  section: { gap: spacing.xs },
  sectionTitle: { ...typography.label, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: spacing.xs },
  card: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, overflow: 'hidden', ...shadows.sm },
  divider: { height: 1, backgroundColor: colors.borderLight, marginLeft: 52 },

  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  settingsRowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  settingsIcon: { fontSize: 20, width: 28, textAlign: 'center' },
  settingsLabel: { ...typography.body1 },
  settingsValue: { ...typography.body2, color: colors.textSecondary },
  settingsChevron: { fontSize: 22, color: colors.textMuted },

  appVersion: { ...typography.caption, textAlign: 'center', color: colors.textMuted },

  logoutButton: {
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  logoutText: { ...typography.body1, color: colors.error, fontWeight: '600' },
});
