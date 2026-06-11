/**
 * SubscriptionScreen — Free vs Plus vs Pro (UI scaffold, no payment in Phase 1)
 */
import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { colors, spacing, borderRadius, typography, shadows } from '../../theme';
import { PrimaryButton, UpgradePrompt } from '../../components/ui';
import { useUserStore } from '../../store';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '₹0',
    period: 'forever',
    color: colors.textMuted,
    features: [
      '✓ Wardrobe up to 20 garments',
      '✓ Daily outfit suggestion',
      '✓ Basic festival calendar',
      '✓ AI garment classification',
      '✗ Cost-per-wear analytics',
      '✗ Unlimited wardrobe',
      '✗ Advanced body-type recommendations',
      '✗ Priority support',
    ],
  },
  {
    id: 'plus',
    name: 'Plus',
    price: '₹149',
    period: 'per month',
    color: colors.accent,
    popular: true,
    features: [
      '✓ Unlimited wardrobe',
      '✓ Cost-per-wear analytics',
      '✓ Advanced style recommendations',
      '✓ Full festival looks & alerts',
      '✓ Occasion-specific outfit generation',
      '✓ Outfit history & ratings',
      '✗ Personal stylist insights',
      '✗ Exclusive designer content',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '₹399',
    period: 'per month',
    color: colors.primary,
    features: [
      '✓ Everything in Plus',
      '✓ Personal AI stylist insights',
      '✓ Seasonal wardrobe planning',
      '✓ Body-type fit intelligence',
      '✓ Exclusive designer collaborations',
      '✓ Priority support 24/7',
      '✓ Early access to new features',
      '✓ Family wardrobe (up to 4 members)',
    ],
  },
];

export default function SubscriptionScreen({ navigation }: any) {
  const { user } = useUserStore();
  const currentTier = user?.subscription_tier || 'free';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Upgrade Pehno</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.heroText}>Unlock your full wardrobe potential</Text>
        <Text style={styles.heroSubtext}>
          Join 50,000+ Indian women who dress with confidence every day
        </Text>

        {PLANS.map((plan) => (
          <View
            key={plan.id}
            style={[
              styles.planCard,
              plan.popular && styles.planCardPopular,
              currentTier === plan.id && styles.planCardCurrent,
              { borderTopColor: plan.color },
            ]}
          >
            {plan.popular && (
              <View style={[styles.popularBadge, { backgroundColor: plan.color }]}>
                <Text style={styles.popularText}>Most Popular</Text>
              </View>
            )}

            <View style={styles.planHeader}>
              <Text style={[styles.planName, { color: plan.color }]}>{plan.name}</Text>
              <View style={styles.planPricing}>
                <Text style={styles.planPrice}>{plan.price}</Text>
                <Text style={styles.planPeriod}>/{plan.period}</Text>
              </View>
            </View>

            {plan.features.map((f, i) => (
              <Text key={i} style={[styles.feature, f.startsWith('✗') && styles.featureDisabled]}>
                {f}
              </Text>
            ))}

            {currentTier === plan.id ? (
              <View style={[styles.currentBadge, { borderColor: plan.color }]}>
                <Text style={[styles.currentText, { color: plan.color }]}>Current Plan</Text>
              </View>
            ) : plan.id !== 'free' ? (
              <TouchableOpacity
                style={[styles.upgradeBtn, { backgroundColor: plan.color }]}
                onPress={() => {/* Phase 2: payment integration */}}
              >
                <Text style={styles.upgradeBtnText}>
                  Upgrade to {plan.name}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ))}

        <Text style={styles.disclaimer}>
          🔒 Payment integration coming in Phase 2. All plans currently free during beta.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
  backText: { fontSize: 24 },
  title: { ...typography.h3 },
  scroll: { padding: spacing.md, gap: spacing.md, paddingBottom: 40 },

  heroText: { ...typography.h2, textAlign: 'center' },
  heroSubtext: { ...typography.body2, color: colors.textSecondary, textAlign: 'center' },

  planCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 4,
    position: 'relative',
    ...shadows.md,
  },
  planCardPopular: { ...shadows.lg },
  planCardCurrent: { opacity: 0.8 },
  popularBadge: {
    position: 'absolute',
    top: -12,
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: borderRadius.pill,
  },
  popularText: { color: colors.white, fontSize: 11, fontWeight: '700' },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: spacing.xs },
  planName: { ...typography.h2 },
  planPricing: { alignItems: 'flex-end' },
  planPrice: { ...typography.h3, color: colors.textPrimary },
  planPeriod: { ...typography.caption, color: colors.textMuted },

  feature: { ...typography.body2, color: colors.textPrimary },
  featureDisabled: { color: colors.textMuted, opacity: 0.5 },

  currentBadge: {
    borderWidth: 1.5,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    alignItems: 'center',
  },
  currentText: { fontWeight: '700' },
  upgradeBtn: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  upgradeBtnText: { color: colors.white, fontWeight: '700', fontSize: 15 },

  disclaimer: { ...typography.caption, color: colors.textMuted, textAlign: 'center', fontStyle: 'italic' },
});
