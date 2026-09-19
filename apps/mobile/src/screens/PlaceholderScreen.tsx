/**
 * Temporary stand-in for screens that arrive in later build weeks.
 * Shows the signed-in user and lets them sign out so the auth loop is testable.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SecondaryButton } from '../components/ui';
import { useAuthStore } from '../store';
import { colors, spacing, typography } from '../theme';

export default function PlaceholderScreen({ title }: { title: string }) {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.body}>
        <Text style={typography.h1}>{title}</Text>
        <Text style={typography.body2}>Coming in a later build week.</Text>
        {user ? (
          <Text style={styles.meta}>
            Signed in as {user.name || user.phone} · {user.city} · {user.subscription_tier}
          </Text>
        ) : null}
        <SecondaryButton title="Sign out" onPress={signOut} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1, padding: spacing.xl, gap: spacing.md, justifyContent: 'center' },
  meta: { ...typography.caption, marginBottom: spacing.md },
});
