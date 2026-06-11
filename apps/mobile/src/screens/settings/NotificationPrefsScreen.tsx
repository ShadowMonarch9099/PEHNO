/**
 * NotificationPrefsScreen — Toggle notification preferences
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { PrimaryButton } from '../../components/ui';

export default function NotificationPrefsScreen({ navigation }: any) {
  const [prefs, setPrefs] = useState({
    daily_outfit_push: true,
    festival_alerts: true,
    care_reminders: false,
  });

  const toggle = (key: keyof typeof prefs) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const NOTIFICATIONS = [
    {
      key: 'daily_outfit_push',
      title: '☀️ Daily Outfit Suggestion',
      description: 'Get your perfect outfit for the day at 7:30 AM',
    },
    {
      key: 'festival_alerts',
      title: '🪔 Festival Alerts',
      description: 'Reminders 14, 7, and 1 day before upcoming festivals',
    },
    {
      key: 'care_reminders',
      title: '🧺 Care Reminders',
      description: 'Dry cleaning and maintenance reminders for your garments',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.subtitle}>Control how Pehno keeps you in the loop</Text>

        <View style={styles.card}>
          {NOTIFICATIONS.map((n, i) => (
            <View key={n.key}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.notifTitle}>{n.title}</Text>
                  <Text style={styles.notifDesc}>{n.description}</Text>
                </View>
                <Switch
                  value={prefs[n.key as keyof typeof prefs]}
                  onValueChange={() => toggle(n.key as keyof typeof prefs)}
                  trackColor={{ true: colors.primary, false: colors.border }}
                  thumbColor={colors.white}
                />
              </View>
              {i < NOTIFICATIONS.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        <PrimaryButton title="Save Preferences" onPress={() => navigation.goBack()} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
  backText: { fontSize: 24 },
  title: { ...typography.h3 },
  scroll: { padding: spacing.md, gap: spacing.lg },
  subtitle: { ...typography.body2, color: colors.textSecondary },
  card: { backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: spacing.md, gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xs },
  notifTitle: { ...typography.h4 },
  notifDesc: { ...typography.body2, color: colors.textSecondary, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.borderLight },
});
