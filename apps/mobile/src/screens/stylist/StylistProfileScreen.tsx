/**
 * StylistProfile — bio, specialties, portfolio links, session types, reviews, book CTA.
 */
import React, { useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Chip, PrimaryButton, ScreenHeader } from '../../components/ui';
import type { OutfitScreenProps } from '../../navigation/types';
import { stylistsApi } from '../../services';
import type { Stylist } from '../../services/types';
import { borderRadius, colors, spacing, typography } from '../../theme';

const pretty = (s: string) => s.replace(/_/g, ' ');

export default function StylistProfileScreen({ route, navigation }: OutfitScreenProps<'StylistProfile'>) {
  const { stylistId } = route.params;
  const [s, setS] = useState<Stylist | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    stylistsApi
      .get(stylistId)
      .then(setS)
      .catch((e) => setError(e instanceof Error ? e.message : 'Stylist not found'));
  }, [stylistId]);

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={s?.name ?? 'Stylist'} subtitle={s ? `${s.city} · ${s.sessions_completed} sessions completed` : undefined} onBack={navigation.goBack} />
      <ScrollView contentContainerStyle={styles.body}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {s ? (
          <>
            <View style={styles.ratingRow}>
              <Text style={styles.rating}>{s.rating != null ? `★ ${s.rating.toFixed(1)}` : 'New stylist'}</Text>
              <Text style={typography.caption}>{s.review_count ? `${s.review_count} review${s.review_count === 1 ? '' : 's'}` : 'No reviews yet'}</Text>
            </View>
            <View style={styles.chips}>
              {s.specialties.map((sp) => (
                <Chip key={sp} label={pretty(sp)} />
              ))}
            </View>
            {s.bio ? <Text style={typography.body1}>{s.bio}</Text> : null}

            {s.portfolio_urls.length ? (
              <View style={styles.section}>
                <Text style={typography.h4}>Portfolio</Text>
                {s.portfolio_urls.map((u) => (
                  <TouchableOpacity key={u} onPress={() => Linking.openURL(u)} accessibilityRole="link">
                    <Text style={styles.link}>{u.replace(/^https?:\/\//, '')}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            <View style={styles.section}>
              <Text style={typography.h4}>Sessions · 60 min video call</Text>
              {s.session_types.map((t) => (
                <Text key={t.slug} style={typography.body2}>
                  • {t.label}
                </Text>
              ))}
              <Text style={typography.caption}>During a confirmed session the stylist sees your wardrobe (first name and city only — never your phone).</Text>
            </View>

            <View style={styles.priceCard}>
              <View style={styles.flex}>
                <Text style={typography.caption}>Per session</Text>
                <Text style={styles.price}>₹{s.quote?.amount_inr ?? s.price_per_session_inr}</Text>
                {s.quote?.pro_discount_applied ? <Text style={styles.discount}>Pro discount −₹{s.quote.discount_inr} applied</Text> : null}
              </View>
              <PrimaryButton title="Book a session" onPress={() => navigation.navigate('BookSession', { stylistId: s.id })} />
            </View>

            {s.reviews.length ? (
              <View style={styles.section}>
                <Text style={typography.h4}>Reviews</Text>
                {s.reviews.map((r) => (
                  <View key={r.id} style={styles.review}>
                    <Text style={styles.reviewHead}>
                      {'★'.repeat(r.rating)}
                      {'☆'.repeat(5 - r.rating)} · {r.reviewer_first_name}
                    </Text>
                    {r.comment ? <Text style={typography.body2}>{r.comment}</Text> : null}
                  </View>
                ))}
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  body: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxl },
  error: { ...typography.caption, color: colors.error },
  ratingRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  rating: { ...typography.h3, color: colors.primary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  section: { gap: spacing.xs, marginTop: spacing.sm },
  link: { ...typography.body2, color: colors.accent, textDecorationLine: 'underline' },
  priceCard: { backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.xl, padding: spacing.md, gap: spacing.md },
  flex: { flex: 1 },
  price: { ...typography.h2, color: colors.primary },
  discount: { ...typography.caption, color: colors.success },
  review: { backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.lg, padding: spacing.md, gap: 4 },
  reviewHead: { ...typography.label, color: colors.primary },
});
