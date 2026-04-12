/**
 * WardrobeIntroScreen — Explain wardrobe building, progress prompt
 */
import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { colors, spacing, borderRadius, typography, shadows } from '../../theme';
import { PrimaryButton, SecondaryButton } from '../../components/ui';
import { userApi } from '../../services/api';
import { useUserStore } from '../../store';

const STEPS = [
  {
    icon: '📸',
    title: 'Photograph your clothes',
    description: 'Take a photo or pick from gallery. Shoot on white background for best AI results.',
  },
  {
    icon: '🤖',
    title: 'AI classifies automatically',
    description: 'Our AI identifies garment type, fabric, color, and suggests occasion tags in seconds.',
  },
  {
    icon: '✏️',
    title: 'Review & correct',
    description: 'Verify the classification and add purchase price to track cost-per-wear.',
  },
  {
    icon: '✨',
    title: 'Get perfect daily outfits',
    description: 'The more you add, the smarter your recommendations become.',
  },
];

export default function WardrobeIntroScreen({ navigation }: any) {
  const { updateProfile } = useUserStore();

  const handleStart = async () => {
    try {
      await userApi.updateMe({ onboarding_complete: true });
      updateProfile({ onboarding_complete: true });
    } catch {}
    navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.step}>Profile Setup • 5/5</Text>
        <Text style={styles.title}>Let's build your{'\n'}digital wardrobe</Text>
        <Text style={styles.subtitle}>
          You're ready to start! Here's how it works:
        </Text>

        {/* Goal progress bar */}
        <View style={styles.goalCard}>
          <View style={styles.goalHeader}>
            <Text style={styles.goalTitle}>Wardrobe Goal</Text>
            <Text style={styles.goalCount}>0 / 30 items</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '0%' }]} />
          </View>
          <Text style={styles.goalHint}>
            💡 Add 30+ items for the most personalized outfit recommendations
          </Text>
        </View>

        {/* Steps */}
        <View style={styles.steps}>
          {STEPS.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepIconContainer}>
                <Text style={styles.stepIcon}>{step.icon}</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDesc}>{step.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Features teaser */}
        <View style={styles.featuresCard}>
          <Text style={styles.featuresTitle}>What you unlock with 30+ items:</Text>
          {['🌤️  Daily weather-based outfits', '🪔  Festival-curated looks', '📊  Cost-per-wear analytics', '🤝  Outfit history & ratings'].map((f) => (
            <Text key={f} style={styles.featureItem}>{f}</Text>
          ))}
        </View>

        <PrimaryButton title="Start Adding Clothes 📸" onPress={handleStart} />
        <SecondaryButton
          title="Browse first, add later"
          onPress={handleStart}
          style={{ marginTop: spacing.xs }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.xl, gap: spacing.lg },
  step: { ...typography.caption, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  title: { ...typography.h1, lineHeight: 36 },
  subtitle: { ...typography.body2, color: colors.textSecondary },

  goalCard: {
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary + '30',
    gap: spacing.sm,
  },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  goalTitle: { ...typography.h4, color: colors.primary },
  goalCount: { ...typography.body2, color: colors.primary, fontWeight: '700' },
  progressBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  goalHint: { ...typography.caption, color: colors.textSecondary },

  steps: { gap: spacing.md },
  stepRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  stepIconContainer: {
    width: 44,
    height: 44,
    backgroundColor: colors.accent + '20',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepIcon: { fontSize: 22 },
  stepContent: { flex: 1, gap: 3, paddingTop: 4 },
  stepTitle: { ...typography.h4, color: colors.textPrimary },
  stepDesc: { ...typography.body2, color: colors.textSecondary, lineHeight: 20 },

  featuresCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.sm,
  },
  featuresTitle: { ...typography.h4, color: colors.textPrimary, marginBottom: spacing.xs },
  featureItem: { ...typography.body2, color: colors.textSecondary },
});
