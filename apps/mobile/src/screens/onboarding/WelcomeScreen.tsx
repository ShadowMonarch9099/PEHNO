/**
 * WelcomeScreen — App intro, "Never wonder what to wear again"
 */
import React from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, Dimensions, TouchableOpacity,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, typography, shadows } from '../../theme';
import { PrimaryButton, SecondaryButton } from '../../components/ui';

const { width, height } = Dimensions.get('window');

interface Props {
  navigation: NativeStackNavigationProp<any>;
}

export default function WelcomeScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      {/* Hero Section */}
      <View style={styles.hero}>
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>P</Text>
          </View>
          <Text style={styles.appName}>PEHNO</Text>
          <Text style={styles.tagline}>पहनो</Text>
        </View>

        {/* Floating garment emojis */}
        <View style={styles.emojiRow}>
          {['👗', '🥻', '👚', '🧣', '👘'].map((emoji, i) => (
            <View
              key={i}
              style={[
                styles.emojiCard,
                { transform: [{ rotate: `${(i - 2) * 8}deg` }] },
              ]}
            >
              <Text style={styles.emoji}>{emoji}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Bottom Sheet Content */}
      <View style={styles.bottomSheet}>
        <Text style={styles.headline}>Never wonder{'\n'}what to wear again.</Text>
        <Text style={styles.subtitle}>
          AI-powered wardrobe intelligence built for India. From Navratri to office, from Diwali to casual — your perfect outfit, every day.
        </Text>

        <View style={styles.features}>
          {[
            { icon: '🤖', text: 'AI classifies your wardrobe automatically' },
            { icon: '🌤️', text: 'Weather-based outfit suggestions daily' },
            { icon: '🪔', text: 'Festival looks curated from your clothes' },
          ].map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>

        <PrimaryButton
          title="Get Started →"
          onPress={() => navigation.navigate('Phone')}
        />
        <Text style={styles.loginLink}>
          Already have an account?{' '}
          <Text
            style={styles.loginLinkBold}
            onPress={() => navigation.navigate('Phone')}
          >
            Sign in
          </Text>
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary },

  hero: {
    flex: 0.45,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xl,
  },
  logoContainer: { alignItems: 'center', marginBottom: spacing.xl },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    ...shadows.lg,
  },
  logoText: { fontSize: 40, fontWeight: '800', color: colors.primary },
  appName: { fontSize: 32, fontWeight: '800', color: colors.background, letterSpacing: 4 },
  tagline: { fontSize: 14, color: colors.accent, letterSpacing: 2, marginTop: 2 },

  emojiRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
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

  bottomSheet: {
    flex: 0.55,
    backgroundColor: colors.background,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: spacing.xl,
    paddingTop: spacing.xxl,
    gap: spacing.md,
  },
  headline: {
    ...typography.h1,
    color: colors.textPrimary,
    lineHeight: 36,
  },
  subtitle: {
    ...typography.body2,
    color: colors.textSecondary,
    lineHeight: 22,
  },

  features: { gap: spacing.sm, marginBottom: spacing.sm },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  featureIcon: { fontSize: 18, width: 28 },
  featureText: { ...typography.body2, color: colors.textPrimary, flex: 1 },

  loginLink: {
    ...typography.body2,
    textAlign: 'center',
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  loginLinkBold: { color: colors.primary, fontWeight: '700' },
});
