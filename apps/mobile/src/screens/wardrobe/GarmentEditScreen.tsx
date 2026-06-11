/**
 * GarmentEditScreen — Manual editing of garment classification
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TextInput, TouchableOpacity,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { PrimaryButton, LoadingOverlay } from '../../components/ui';
import { wardrobeApi } from '../../services/api';
import { useWardrobeStore } from '../../store';

const GARMENT_TYPES = ['saree','salwar_suit','kurta','kurti','lehenga','anarkali','indo_western','churidar','palazzo','dupatta'];
const FABRIC_TYPES = ['cotton','silk','linen','georgette','chiffon','crepe','velvet','raw_silk','banarasi','kanjeevaram','khadi','net','satin','polyester','rayon'];
const OCCASION_OPTIONS = ['casual','office','wedding_guest','pooja','festival','formal','night_out','campus','temple'];
const CONDITIONS = ['new','good','worn'];

export default function GarmentEditScreen({ route, navigation }: any) {
  const { garmentId } = route.params;
  const { garments, updateGarment } = useWardrobeStore();
  const garment = garments.find((g) => g.id === garmentId);

  const [garmentType, setGarmentType] = useState(garment?.garment_type || '');
  const [fabricType, setFabricType] = useState(garment?.fabric_type || '');
  const [condition, setCondition] = useState(garment?.condition || 'good');
  const [selectedOccasions, setSelectedOccasions] = useState<string[]>(garment?.occasion_tags || []);
  const [purchasePrice, setPurchasePrice] = useState(garment?.purchase_price?.toString() || '');
  const [notes, setNotes] = useState(garment?.notes || '');
  const [loading, setLoading] = useState(false);

  const toggleOccasion = (tag: string) => {
    setSelectedOccasions((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await wardrobeApi.update(garmentId, {
        garment_type: garmentType,
        fabric_type: fabricType,
        condition,
        occasion_tags: selectedOccasions,
        purchase_price: purchasePrice ? parseFloat(purchasePrice) : null,
        notes: notes || null,
        user_verified: true,
      });
      updateGarment(garmentId, res.data);
      navigation.goBack();
    } catch {}
    setLoading(false);
  };

  const PickerRow = ({ label, options, value, onSelect }: any) => (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.chipRow}>
          {options.map((opt: string) => (
            <TouchableOpacity
              key={opt}
              style={[styles.chip, value === opt && styles.chipActive]}
              onPress={() => onSelect(opt)}
            >
              <Text style={[styles.chipText, value === opt && styles.chipTextActive]}>
                {opt.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LoadingOverlay visible={loading} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Edit Garment</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.verifyBadge}>
          <Text style={styles.verifyText}>✏️ Every edit you make improves Pehno's AI for everyone</Text>
        </View>

        <PickerRow label="Garment Type" options={GARMENT_TYPES} value={garmentType} onSelect={setGarmentType} />
        <PickerRow label="Fabric" options={FABRIC_TYPES} value={fabricType} onSelect={setFabricType} />
        <PickerRow label="Condition" options={CONDITIONS} value={condition} onSelect={setCondition} />

        {/* Occasion Multi-select */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Occasion Tags</Text>
          <View style={styles.chipGrid}>
            {OCCASION_OPTIONS.map((tag) => (
              <TouchableOpacity
                key={tag}
                style={[styles.chip, selectedOccasions.includes(tag) && styles.chipActive]}
                onPress={() => toggleOccasion(tag)}
              >
                <Text style={[styles.chipText, selectedOccasions.includes(tag) && styles.chipTextActive]}>
                  {tag.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Purchase Price */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Purchase Price (₹)</Text>
          <TextInput
            style={styles.input}
            value={purchasePrice}
            onChangeText={setPurchasePrice}
            keyboardType="numeric"
            placeholder="e.g. 1500"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        {/* Notes */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            placeholder="Any special notes about this garment..."
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <PrimaryButton title="Save Changes ✓" onPress={handleSave} loading={loading} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  backText: { ...typography.body2, color: colors.primary },
  title: { ...typography.h3 },
  scroll: { padding: spacing.md, gap: spacing.lg, paddingBottom: 40 },

  verifyBadge: {
    backgroundColor: colors.accent + '20',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.accent + '40',
  },
  verifyText: { ...typography.body2, color: colors.textSecondary, textAlign: 'center' },

  fieldGroup: { gap: spacing.sm },
  label: { ...typography.label, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },

  chipRow: { flexDirection: 'row', gap: spacing.xs },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.body2, color: colors.textSecondary, textTransform: 'capitalize' },
  chipTextActive: { color: colors.white, fontWeight: '700' },

  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    fontSize: 16,
    color: colors.textPrimary,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  textarea: { height: 80, textAlignVertical: 'top' },
});
