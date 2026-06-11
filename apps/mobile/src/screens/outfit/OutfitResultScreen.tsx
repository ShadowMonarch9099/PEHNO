/**
 * OutfitResultScreen — Display generated outfit with actions
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { OutfitCard } from '../../components/outfit';
import { PrimaryButton, SecondaryButton, OutfitRating } from '../../components/ui';
import { outfitApi } from '../../services/api';
import { useOutfitStore, useWardrobeStore } from '../../store';

export default function OutfitResultScreen({ route, navigation }: any) {
  const { outfits = [], occasion = 'casual', outfitId } = route.params || {};
  const { garments } = useWardrobeStore();
  const { saveOutfit, rateOutfit } = useOutfitStore();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [saved, setSaved] = useState(false);

  const currentOutfit = outfits[currentIdx];

  const getGarmentsForOutfit = (outfit: any) =>
    garments.filter((g) => outfit?.garment_ids?.includes(g.id));

  const handleSave = async () => {
    if (!currentOutfit) return;
    try {
      await outfitApi.save(currentOutfit.id);
      setSaved(true);
    } catch {}
  };

  const handleRate = async (rating: number) => {
    if (!currentOutfit) return;
    try {
      await outfitApi.rate(currentOutfit.id, rating);
      rateOutfit(currentOutfit.id, rating);
    } catch {}
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{occasion.replace('_', ' ')} Look</Text>
        <TouchableOpacity onPress={() => navigation.navigate('OutfitHistory')}>
          <Text style={styles.historyText}>History</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {outfits.length > 1 && (
          <View style={styles.tabsRow}>
            {outfits.map((_: any, i: number) => (
              <TouchableOpacity
                key={i}
                style={[styles.tab, currentIdx === i && styles.tabActive]}
                onPress={() => setCurrentIdx(i)}
              >
                <Text style={[styles.tabText, currentIdx === i && styles.tabTextActive]}>
                  Option {i + 1}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {currentOutfit ? (
          <>
            <OutfitCard
              outfit={currentOutfit}
              garments={getGarmentsForOutfit(currentOutfit)}
              onSave={handleSave}
            />

            <View style={styles.ratingSection}>
              <Text style={styles.ratingLabel}>Rate this look</Text>
              <OutfitRating onRate={handleRate} />
            </View>

            <View style={styles.actions}>
              <PrimaryButton
                title={saved ? '🔖 Saved!' : '🔖 Save Outfit'}
                onPress={handleSave}
                disabled={saved}
              />
              <SecondaryButton
                title="👗 View Wardrobe"
                onPress={() => navigation.navigate('Wardrobe')}
              />
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🤔</Text>
            <Text style={styles.emptyTitle}>Not enough garments</Text>
            <Text style={styles.emptySubtitle}>
              Add more {occasion.replace('_', ' ')} clothes to your wardrobe
            </Text>
            <PrimaryButton
              title="Add Clothes"
              onPress={() => navigation.navigate('Wardrobe', { screen: 'Upload' })}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
  backText: { fontSize: 24 },
  title: { ...typography.h3, textTransform: 'capitalize' },
  historyText: { ...typography.body2, color: colors.primary },
  scroll: { padding: spacing.md, gap: spacing.md, paddingBottom: 40 },

  tabsRow: { flexDirection: 'row', gap: spacing.sm },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { ...typography.body2, color: colors.textSecondary },
  tabTextActive: { color: colors.white, fontWeight: '700' },

  ratingSection: { alignItems: 'center', gap: spacing.xs },
  ratingLabel: { ...typography.body2, color: colors.textSecondary },

  actions: { gap: spacing.sm },

  emptyState: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { ...typography.h3 },
  emptySubtitle: { ...typography.body2, color: colors.textSecondary, textAlign: 'center' },
});
