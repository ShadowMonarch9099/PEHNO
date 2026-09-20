/**
 * NotificationPrefs — toggles for daily outfit, festival alerts, care reminders, gap reports.
 * Saved on the profile so the scheduled jobs honour them.
 */
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/ui';
import { useT } from '../../i18n';
import type { SettingsScreenProps } from '../../navigation/types';
import { ApiError, usersApi } from '../../services';
import type { NotificationPrefs } from '../../services/types';
import { useAuthStore } from '../../store';
import { borderRadius, colors, spacing, typography } from '../../theme';

const ROWS: { key: keyof NotificationPrefs; title: string; body: string }[] = [
  { key: 'daily_outfit', title: 'Daily outfit', body: 'Today’s look every morning at 7:30' },
  { key: 'festival_alerts', title: 'Festival alerts', body: '14, 7 and 1 day before festivals in your region' },
  { key: 'care_reminders', title: 'Care reminders', body: 'When a piece is due a wash or dry-clean' },
  { key: 'gap_reports', title: 'Weekly wardrobe report', body: 'Monday morning: the one piece that unlocks the most looks' },
];

export default function NotificationPrefsScreen({ navigation }: SettingsScreenProps<'NotificationPrefs'>) {
  const t = useT();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [prefs, setPrefs] = useState<NotificationPrefs>(
    user?.notification_prefs ?? { daily_outfit: true, festival_alerts: true, care_reminders: true, gap_reports: true },
  );
  const [error, setError] = useState<string | null>(null);

  const toggle = async (key: keyof NotificationPrefs, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    setError(null);
    try {
      setUser(await usersApi.update({ notification_prefs: { [key]: value } }));
    } catch (e) {
      setPrefs(prefs); // revert
      setError(e instanceof ApiError ? e.message : 'Could not save');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={t('settings.notifications')} subtitle="All notifications deep-link straight to the screen they’re about." onBack={navigation.goBack} />
      <ScrollView contentContainerStyle={styles.body}>
        {ROWS.map((r) => (
          <View key={r.key} style={styles.row}>
            <View style={styles.flex}>
              <Text style={typography.h4}>{r.title}</Text>
              <Text style={typography.caption}>{r.body}</Text>
            </View>
            <Switch value={prefs[r.key]} onValueChange={(v) => void toggle(r.key, v)} trackColor={{ true: colors.primary, false: colors.border }} thumbColor={colors.white} />
          </View>
        ))}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Text style={typography.caption}>Per-garment care reminders can also be switched off from the garment itself.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  body: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxl },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.lg, padding: spacing.md },
  flex: { flex: 1, gap: 2 },
  error: { ...typography.caption, color: colors.error },
});
