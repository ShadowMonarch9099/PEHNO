/**
 * ProfileSetupScreen — Name, city dropdown, gender selector
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TextInput, ScrollView, TouchableOpacity,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { PrimaryButton, LoadingOverlay } from '../../components/ui';
import { userApi } from '../../services/api';
import { useUserStore } from '../../store';

const CITIES = [
  'Mumbai','Delhi','Bengaluru','Hyderabad','Chennai','Kolkata','Pune',
  'Ahmedabad','Jaipur','Lucknow','Chandigarh','Kochi','Bhopal','Indore',
  'Nagpur','Patna','Bhubaneswar','Surat','Coimbatore','Visakhapatnam',
];

const GENDERS = [
  { value: 'female', label: 'Female', emoji: '👩' },
  { value: 'male', label: 'Male', emoji: '👨' },
  { value: 'other', label: 'Other / Non-binary', emoji: '🧑' },
];

export default function ProfileSetupScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [gender, setGender] = useState('female');
  const [showCities, setShowCities] = useState(false);
  const [loading, setLoading] = useState(false);
  const { updateProfile } = useUserStore();

  const isValid = name.trim().length >= 2 && city;

  const handleNext = async () => {
    setLoading(true);
    try {
      await userApi.updateMe({ name: name.trim(), city, gender });
      updateProfile({ name: name.trim(), city, gender: gender as any });
      navigation.navigate('BodyType');
    } catch (e) {
      // continue to next screen even if API fails
      navigation.navigate('BodyType');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LoadingOverlay visible={loading} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.step}>Profile Setup • 1/5</Text>
          <Text style={styles.title}>Tell us about you</Text>
          <Text style={styles.subtitle}>Help us personalize your wardrobe experience</Text>
        </View>

        {/* Name */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Your Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Priya Sharma"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
        </View>

        {/* City */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Your City</Text>
          <TouchableOpacity style={styles.selectBox} onPress={() => setShowCities(!showCities)}>
            <Text style={city ? styles.selectValue : styles.selectPlaceholder}>
              {city || 'Select your city'}
            </Text>
            <Text style={styles.chevron}>{showCities ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {showCities && (
            <View style={styles.dropdown}>
              <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                {CITIES.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.dropdownItem, city === c && styles.dropdownItemActive]}
                    onPress={() => { setCity(c); setShowCities(false); }}
                  >
                    <Text style={[styles.dropdownItemText, city === c && styles.dropdownItemTextActive]}>
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Gender */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Gender</Text>
          <View style={styles.genderRow}>
            {GENDERS.map((g) => (
              <TouchableOpacity
                key={g.value}
                style={[styles.genderCard, gender === g.value && styles.genderCardActive]}
                onPress={() => setGender(g.value)}
              >
                <Text style={styles.genderEmoji}>{g.emoji}</Text>
                <Text style={[styles.genderLabel, gender === g.value && styles.genderLabelActive]}>
                  {g.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <PrimaryButton title="Continue →" onPress={handleNext} disabled={!isValid} loading={loading} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.xl, gap: spacing.lg },
  header: { gap: spacing.sm },
  step: { ...typography.caption, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  title: { ...typography.h2 },
  subtitle: { ...typography.body2, color: colors.textSecondary },

  fieldGroup: { gap: spacing.sm },
  label: { ...typography.label, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.textPrimary,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  selectBox: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectValue: { fontSize: 16, color: colors.textPrimary },
  selectPlaceholder: { fontSize: 16, color: colors.textMuted },
  chevron: { color: colors.textMuted, fontSize: 12 },
  dropdown: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    overflow: 'hidden',
  },
  dropdownItem: { paddingHorizontal: spacing.md, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  dropdownItemActive: { backgroundColor: colors.primary + '15' },
  dropdownItemText: { fontSize: 16, color: colors.textPrimary },
  dropdownItemTextActive: { color: colors.primary, fontWeight: '600' },

  genderRow: { flexDirection: 'row', gap: spacing.sm },
  genderCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  genderCardActive: { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
  genderEmoji: { fontSize: 28 },
  genderLabel: { ...typography.label, textAlign: 'center', color: colors.textSecondary },
  genderLabelActive: { color: colors.primary, fontWeight: '700' },
});
