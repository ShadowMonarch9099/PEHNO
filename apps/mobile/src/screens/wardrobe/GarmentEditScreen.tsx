/**
 * GarmentEdit — correct the AI (type, fabric, colours, occasions, seasons) and
 * add purchase metadata. Any classification change marks the item user-verified.
 */
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChipGroup, PrimaryButton, ScreenHeader } from '../../components/ui';
import type { WardrobeScreenProps } from '../../navigation/types';
import { ApiError } from '../../services';
import type { Garment, GarmentCondition, GarmentUpdate, RegionalStyle, Season } from '../../services/types';
import { garmentTypesFor, useAuthStore, useMetaStore, useWardrobeStore } from '../../store';
import { borderRadius, colors, spacing, typography } from '../../theme';

const orUndef = (v: string) => (v === 'unknown' ? undefined : v);

/** Drop fields equal to the current garment so untouched AI labels aren't stamped user-verified. */
function diff(form: GarmentUpdate, g: Garment): GarmentUpdate {
  const out: GarmentUpdate = {};
  if (form.garment_type && form.garment_type !== g.garment_type) out.garment_type = form.garment_type;
  if (form.fabric_type && form.fabric_type !== g.fabric_type) out.fabric_type = form.fabric_type;
  if (form.color_primary && form.color_primary !== g.color_primary) out.color_primary = form.color_primary;
  if (form.regional_style !== undefined && form.regional_style !== g.regional_style) out.regional_style = form.regional_style;
  if (JSON.stringify(form.occasion_tags) !== JSON.stringify(g.occasion_tags)) out.occasion_tags = form.occasion_tags;
  if (JSON.stringify(form.season_tags) !== JSON.stringify(g.season_tags)) out.season_tags = form.season_tags;
  if (form.condition !== g.condition) out.condition = form.condition;
  if ((form.notes ?? '') !== (g.notes ?? '')) out.notes = form.notes;
  if ((form.brand ?? '') !== (g.brand ?? '')) out.brand = form.brand || undefined;
  if (form.purchase_price !== g.purchase_price) out.purchase_price = form.purchase_price;
  return out;
}

export default function GarmentEditScreen({ route, navigation }: WardrobeScreenProps<'GarmentEdit'>) {
  const gender = useAuthStore((st) => st.user?.gender);
  const g = useWardrobeStore((s) => s.garments.find((x) => x.id === route.params.garmentId));
  const update = useWardrobeStore((s) => s.update);
  const options = useMetaStore((s) => s.options);
  const [form, setForm] = useState<GarmentUpdate>(() => ({
    garment_type: orUndef(g?.garment_type ?? 'unknown'),
    fabric_type: orUndef(g?.fabric_type ?? 'unknown'),
    color_primary: orUndef(g?.color_primary ?? 'unknown'),
    occasion_tags: g?.occasion_tags ?? [],
    season_tags: g?.season_tags ?? [],
    regional_style: g?.regional_style ?? null,
    condition: g?.condition ?? 'good',
    purchase_price: g?.purchase_price ?? null,
    notes: g?.notes ?? '',
    brand: g?.brand ?? '',
  }));
  const [price, setPrice] = useState(g?.purchase_price != null ? String(g.purchase_price) : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!g) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Not found" onBack={navigation.goBack} />
      </SafeAreaView>
    );
  }

  const toggle = (key: 'occasion_tags' | 'season_tags', slug: string) =>
    setForm((f) => {
      const cur = (f[key] ?? []) as string[];
      const next = cur.includes(slug) ? cur.filter((x) => x !== slug) : [...cur, slug].sort();
      return { ...f, [key]: next };
    });

  const save = async () => {
    const parsed = price.trim() === '' ? null : Number(price.replace(/[^\d.]/g, ''));
    if (parsed !== null && Number.isNaN(parsed)) return setError('Enter a valid price');
    setSaving(true);
    setError(null);
    try {
      const patch = diff({ ...form, purchase_price: parsed }, g);
      if (Object.keys(patch).length) await update(g.id, patch);
      navigation.goBack();
    } catch (e) {
      setError(e instanceof ApiError ? (Object.values(e.errors ?? {})[0] ?? e.message) : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScreenHeader title="Edit details" subtitle="Your corrections train the AI." onBack={navigation.goBack} />
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Field label="Type">
            <ChipGroup options={garmentTypesFor(options.garment_types, gender)} value={form.garment_type ?? null} onChange={(v) => setForm((f) => ({ ...f, garment_type: v }))} />
          </Field>
          <Field label="Fabric">
            <ChipGroup options={options.fabrics} value={form.fabric_type ?? null} onChange={(v) => setForm((f) => ({ ...f, fabric_type: v }))} />
          </Field>
          <Field label="Main colour">
            <ChipGroup options={options.colors} value={form.color_primary ?? null} onChange={(v) => setForm((f) => ({ ...f, color_primary: v }))} />
          </Field>
          <Field label="Occasions (pick all that apply)">
            <ChipGroup options={options.occasions} value={form.occasion_tags ?? []} onChange={(v) => toggle('occasion_tags', v)} />
          </Field>
          <Field label="Seasons">
            <ChipGroup options={options.seasons} value={(form.season_tags ?? []) as Season[]} onChange={(v) => toggle('season_tags', v)} />
          </Field>
          <Field label="Regional style">
            <ChipGroup
              options={options.regional_styles}
              value={form.regional_style ?? null}
              onChange={(v) => setForm((f) => ({ ...f, regional_style: v as RegionalStyle }))}
            />
          </Field>
          <Field label="Condition">
            <ChipGroup
              options={options.conditions}
              value={form.condition ?? null}
              onChange={(v) => setForm((f) => ({ ...f, condition: v as GarmentCondition }))}
            />
          </Field>
          <Field label="Purchase price (₹) — for cost-per-wear">
            <TextInput
              style={styles.input}
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
              placeholder="1500"
              placeholderTextColor={colors.textMuted}
            />
          </Field>
          <Field label="Brand (optional)">
            <TextInput
              style={styles.input}
              value={form.brand ?? ''}
              onChangeText={(brand) => setForm((f) => ({ ...f, brand }))}
              placeholder="Fabindia, Biba, W…"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
            />
          </Field>
          <Field label="Notes">
            <TextInput
              style={[styles.input, styles.multiline]}
              value={form.notes ?? ''}
              onChangeText={(notes) => setForm((f) => ({ ...f, notes }))}
              placeholder="Gifted by Nani, Diwali 2024"
              placeholderTextColor={colors.textMuted}
              multiline
            />
          </Field>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>
        <View style={styles.footer}>
          <PrimaryButton title="Save" onPress={save} loading={saving} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    {children}
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  body: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxl },
  field: { gap: spacing.sm },
  label: { ...typography.label },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.md,
    height: 48,
    ...typography.body1,
  },
  multiline: { height: 88, paddingTop: spacing.sm, textAlignVertical: 'top' },
  error: { ...typography.caption, color: colors.error },
  footer: { padding: spacing.xl, borderTopWidth: 1, borderTopColor: colors.borderLight },
});
