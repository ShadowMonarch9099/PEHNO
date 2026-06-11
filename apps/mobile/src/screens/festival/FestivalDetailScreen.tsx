/**
 * FestivalDetailScreen — Festival detail with curated looks
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { colors, spacing, borderRadius, typography, shadows } from '../../theme';
import { FestivalLookCard } from '../../components/outfit';
import { festivalApi } from '../../services/api';
import { useWardrobeStore } from '../../store';

export default function FestivalDetailScreen({ route, navigation }: any) {
  const { slug } = route.params;
  const [festival, setFestival] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { garments } = useWardrobeStore();

  useEffect(() => {
    festivalApi.getDetail(slug)
      .then((res) => setFestival(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  if (!festival) return null;

  const primaryColor = Object.values(festival.color_codes)[0] as string || colors.accent;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: primaryColor + '20', borderColor: primaryColor + '40' }]}>
          <Text style={styles.heroName}>{festival.name}</Text>
          <Text style={styles.heroDate}>
            {new Date(festival.date_this_year).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </Text>
          <View style={styles.colorSwatches}>
            {Object.values(festival.color_codes).slice(0, 5).map((c, i) => (
              <View key={i} style={[styles.swatch, { backgroundColor: c as string }]} />
            ))}
          </View>
        </View>

        {/* Dress Code */}
        <View style={styles.dressCodeCard}>
          <Text style={styles.sectionTitle}>👗 Dress Code</Text>
          <Text style={styles.dressCodeText}>{festival.dress_code}</Text>
        </View>

        {/* Description */}
        <View style={styles.descCard}>
          <Text style={styles.sectionTitle}>About {festival.name}</Text>
          <Text style={styles.descText}>{festival.description}</Text>
        </View>

        {/* Navratri tracker link */}
        {slug === 'navratri' && (
          <TouchableOpacity
            style={styles.navratriLink}
            onPress={() => navigation.navigate('NavratriTracker')}
          >
            <Text style={styles.navratriLinkText}>🌸 Open Navratri 9-Day Color Tracker →</Text>
          </TouchableOpacity>
        )}

        {/* Curated Looks */}
        {festival.curated_looks?.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Your {festival.name} Looks</Text>
            <FlatList
              horizontal
              data={festival.curated_looks}
              keyExtractor={(l: any) => l.id || String(Math.random())}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing.sm }}
              renderItem={({ item }) => (
                <FestivalLookCard
                  look={item}
                  garments={garments.filter((g) => item.garment_ids?.includes(g.id))}
                  festivalName={festival.name}
                />
              )}
            />
          </>
        )}

        {/* Occasion Tags */}
        <View style={styles.tagsSection}>
          <Text style={styles.sectionTitle}>Occasion Tags</Text>
          <View style={styles.tagsRow}>
            {festival.occasion_tags.map((tag: string) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag.replace('_', ' ')}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.md },
  backText: { fontSize: 24 },
  scroll: { padding: spacing.md, gap: spacing.lg, paddingBottom: 40 },

  hero: {
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
  },
  heroName: { fontSize: 32, fontWeight: '800', color: colors.textPrimary, textAlign: 'center' },
  heroDate: { ...typography.body1, color: colors.textSecondary },
  colorSwatches: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs },
  swatch: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)' },

  dressCodeCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.sm,
  },
  sectionTitle: { ...typography.h4 },
  dressCodeText: { ...typography.body2, color: colors.textSecondary, lineHeight: 22 },

  descCard: { gap: spacing.sm },
  descText: { ...typography.body2, color: colors.textSecondary, lineHeight: 24 },

  navratriLink: {
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  navratriLinkText: { ...typography.h4, color: colors.primary },

  tagsSection: { gap: spacing.sm },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  tag: {
    backgroundColor: colors.borderLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.pill,
  },
  tagText: { ...typography.caption, textTransform: 'capitalize', color: colors.textSecondary },
});
