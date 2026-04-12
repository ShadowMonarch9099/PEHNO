/**
 * GarmentDetailScreen — Garment detail with care profile, wear tracking
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, Image, TouchableOpacity,
} from 'react-native';
import { colors, spacing, borderRadius, typography, shadows } from '../../theme';
import { FabricBadge, OccasionTag } from '../../components/garment';
import { PrimaryButton, SecondaryButton } from '../../components/ui';
import { wardrobeApi } from '../../services/api';
import { useWardrobeStore, Garment } from '../../store';

export default function GarmentDetailScreen({ route, navigation }: any) {
  const { garmentId } = route.params;
  const { garments, updateGarment } = useWardrobeStore();
  const [garment, setGarment] = useState<Garment | null>(
    garments.find((g) => g.id === garmentId) || null
  );
  const [logging, setLogging] = useState(false);

  useEffect(() => {
    if (!garment || garment.classification_status === 'pending') {
      wardrobeApi.getOne(garmentId).then((res) => {
        setGarment(res.data);
        updateGarment(garmentId, res.data);
      }).catch(() => {});
    }
  }, [garmentId]);

  const handleLogWear = async () => {
    setLogging(true);
    try {
      const res = await wardrobeApi.logWear(garmentId);
      setGarment(res.data);
      updateGarment(garmentId, res.data);
    } catch {}
    setLogging(false);
  };

  if (!garment) return null;

  const costPerWear = garment.purchase_price && garment.wear_count > 0
    ? Math.round(garment.purchase_price / garment.wear_count)
    : null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('GarmentEdit', { garmentId })}>
          <Text style={styles.editText}>Edit ✏️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Image */}
        <View style={styles.imageContainer}>
          {garment.image_url ? (
            <Image source={{ uri: garment.image_url }} style={styles.image} resizeMode="contain" />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={{ fontSize: 80 }}>👗</Text>
            </View>
          )}
          {garment.classification_status === 'pending' && (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingText}>🤖 AI Classifying...</Text>
            </View>
          )}
          <View style={[styles.conditionBadge, { backgroundColor: conditionColor(garment.condition) }]}>
            <Text style={styles.conditionText}>{garment.condition}</Text>
          </View>
        </View>

        {/* Type & Fabric */}
        <View style={styles.infoHeader}>
          <Text style={styles.garmentType}>{garment.garment_type.replace('_', ' ')}</Text>
          <FabricBadge fabric={garment.fabric_type} />
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <StatCard label="Worn" value={`${garment.wear_count}x`} emoji="👗" />
          <StatCard label="AI Confidence" value={`${Math.round(garment.ai_confidence * 100)}%`} emoji="🤖" />
          {costPerWear && <StatCard label="Cost/Wear" value={`₹${costPerWear}`} emoji="💰" />}
          {garment.purchase_price && <StatCard label="Value" value={`₹${garment.purchase_price}`} emoji="🏷️" />}
        </View>

        {/* Occasion Tags */}
        {garment.occasion_tags.length > 0 && (
          <View style={styles.tagsSection}>
            <Text style={styles.sectionTitle}>Occasions</Text>
            <View style={styles.tagsRow}>
              {garment.occasion_tags.map((tag) => <OccasionTag key={tag} tag={tag} />)}
            </View>
          </View>
        )}

        {/* Season Tags */}
        {garment.season_tags.length > 0 && (
          <View style={styles.tagsSection}>
            <Text style={styles.sectionTitle}>Best for Seasons</Text>
            <View style={styles.tagsRow}>
              {garment.season_tags.map((tag) => (
                <View key={tag} style={styles.seasonTag}>
                  <Text style={styles.seasonTagText}>{getSeasonEmoji(tag)} {tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Care Profile */}
        {garment.care_profile && Object.keys(garment.care_profile).length > 0 && (
          <View style={styles.careCard}>
            <Text style={styles.sectionTitle}>🧺 Care Instructions</Text>
            <View style={styles.careRows}>
              {garment.care_profile.wash && <CareRow icon="🫧" label="Wash" value={garment.care_profile.wash} />}
              {garment.care_profile.iron && <CareRow icon="♨️" label="Iron" value={garment.care_profile.iron} />}
              {garment.care_profile.storage && <CareRow icon="🗂️" label="Storage" value={garment.care_profile.storage} />}
              {garment.care_profile.dry_clean && <CareRow icon="✅" label="Dry Clean" value="Recommended" />}
            </View>
          </View>
        )}

        {/* Notes */}
        {garment.notes && (
          <View style={styles.notesCard}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notesText}>{garment.notes}</Text>
          </View>
        )}

        <PrimaryButton title="📌 Log Wear Today" onPress={handleLogWear} loading={logging} />
      </ScrollView>
    </SafeAreaView>
  );
}

const StatCard = ({ label, value, emoji }: any) => (
  <View style={styles.statCard}>
    <Text style={styles.statEmoji}>{emoji}</Text>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const CareRow = ({ icon, label, value }: any) => (
  <View style={styles.careRow}>
    <Text style={styles.careIcon}>{icon}</Text>
    <View style={{ flex: 1 }}>
      <Text style={styles.careLabel}>{label}</Text>
      <Text style={styles.careValue}>{value}</Text>
    </View>
  </View>
);

const conditionColor = (c: string) => ({ new: '#2D7A4F', good: '#D4A017', worn: '#8B7355' }[c] || '#ccc');
const getSeasonEmoji = (s: string) => ({ summer: '☀️', monsoon: '🌧️', winter: '❄️' }[s] || '🌿');

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  navBar: { flexDirection: 'row', justifyContent: 'space-between', padding: spacing.md },
  backText: { fontSize: 24 },
  editText: { ...typography.body1, color: colors.primary, fontWeight: '600' },

  scroll: { padding: spacing.md, gap: spacing.md, paddingBottom: 40 },

  imageContainer: {
    height: 300,
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    position: 'relative',
  },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pendingBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  pendingText: { fontSize: 12, fontWeight: '700', color: colors.textPrimary },
  conditionBadge: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  conditionText: { color: colors.white, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },

  infoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  garmentType: { ...typography.h2, textTransform: 'capitalize' },

  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    alignItems: 'center',
    gap: 2,
    ...shadows.sm,
  },
  statEmoji: { fontSize: 18 },
  statValue: { ...typography.h4, color: colors.primary },
  statLabel: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },

  tagsSection: { gap: spacing.xs },
  sectionTitle: { ...typography.h4 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  seasonTag: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  seasonTagText: { ...typography.caption, color: colors.textSecondary },

  careCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.sm,
  },
  careRows: { gap: spacing.sm },
  careRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  careIcon: { fontSize: 18, width: 26 },
  careLabel: { ...typography.label, color: colors.textSecondary },
  careValue: { ...typography.body2, color: colors.textPrimary },

  notesCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  notesText: { ...typography.body2, color: colors.textSecondary },
});
