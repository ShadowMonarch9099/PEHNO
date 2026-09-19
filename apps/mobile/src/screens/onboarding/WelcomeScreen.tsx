/**
 * WelcomeScreen — first screen for signed-out users.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../components/ui';
import type { AuthScreenProps } from '../../navigation/types';
import { borderRadius, colors, shadows, spacing, typography } from '../../theme';

const FEATURES = [
  { icon: '🤖', text: 'AI classifies your wardrobe automatically' },
  { icon: '🌤️', text: 'Weather-aware outfit suggestions every morning' },
  { icon: '🪔', text: 'Festival looks curated from your own clothes' },
];

export default function WelcomeScreen({ navigation }: AuthScreenProps<'Welcome'>) {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.hero}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>P</Text>
        </View>
        <Text style={styles.appName}>PEHNO</Text>
        <Text style={styles.tagline}>पहनो</Text>

        <View style={styles.emojiRow}>
          {['👗', '🥻', '👚', '🧣', '👘'].map((emoji, i) => (
            <View key={emoji} style={[styles.emojiCard, { transform: [{ rotate: `${(i - 2) * 8}deg` }] }]}>
              <Text style={styles.emoji}>{emoji}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.sheet}>
        <Text style={styles.headline}>Never wonder{'\n'}what to wear again.</Text>
        <Text style={styles.subtitle}>
          AI wardrobe intelligence built for India — from Navratri to office, Diwali to casual.
        </Text>

        <View style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f.text} style={styles.featureRow}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>

        <PrimaryButton title="Get started" onPress={() => navigation.navigate('Phone')} />
        <Text style={styles.footnote}>Sign in with your mobile number. No passwords.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary },
  hero: { flex: 0.45, alignItems: 'center', justifyContent: 'center', paddingTop: spacing.lg },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    ...shadows.lg,
  },
  logoText: { fontSize: 40, fontWeight: '800', color: colors.primary },
  appName: { fontSize: 32, fontWeight: '800', color: colors.background, letterSpacing: 4 },
  tagline: { fontSize: 14, color: colors.primaryContainer, letterSpacing: 2, marginTop: 2, marginBottom: spacing.xl },
  emojiRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg },
  emojiCard: {
    width: 56,
    height: 72,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  emoji: { fontSize: 32 },
  sheet: {
    flex: 0.55,
    backgroundColor: colors.background,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: spacing.xl,
    paddingTop: spacing.xxl,
    gap: spacing.md,
  },
  headline: { ...typography.h1, lineHeight: 36 },
  subtitle: { ...typography.body2, lineHeight: 22 },
  features: { gap: spacing.sm, marginBottom: spacing.sm },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  featureIcon: { fontSize: 18, width: 28 },
  featureText: { ...typography.body2, color: colors.textPrimary, flex: 1 },
  footnote: { ...typography.caption, textAlign: 'center' },
});
