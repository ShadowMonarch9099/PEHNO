/**
 * PhoneScreen — Phone number input with +91 prefix
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, typography, shadows } from '../../theme';
import { PrimaryButton, LoadingOverlay } from '../../components/ui';
import { authApi } from '../../services/api';

interface Props {
  navigation: NativeStackNavigationProp<any>;
}

export default function PhoneScreen({ navigation }: Props) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fullPhone = `+91${phone}`;
  const isValid = phone.length === 10 && /^[6-9]/.test(phone);

  const handleSendOtp = async () => {
    if (!isValid) {
      setError('Please enter a valid 10-digit Indian mobile number');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await authApi.sendOtp(fullPhone);
      navigation.navigate('OTP', { phone: fullPhone });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView style={styles.inner}>
        <LoadingOverlay visible={loading} message="Sending OTP..." />

        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>

        <View style={styles.content}>
          <Text style={styles.stepLabel}>Step 1 of 2</Text>
          <Text style={styles.title}>What's your{'\n'}phone number?</Text>
          <Text style={styles.subtitle}>We'll send you a 6-digit OTP to verify</Text>

          <View style={styles.inputRow}>
            <View style={styles.prefixBox}>
              <Text style={styles.flag}>🇮🇳</Text>
              <Text style={styles.prefix}>+91</Text>
            </View>
            <TextInput
              style={[styles.input, error ? styles.inputError : null]}
              placeholder="98765 43210"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={(t) => {
                setPhone(t.replace(/\D/g, '').slice(0, 10));
                setError('');
              }}
              maxLength={10}
              autoFocus
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Text style={styles.privacyNote}>
            🔒 Your phone number is only used for login. We never share it.
          </Text>
        </View>

        <View style={styles.footer}>
          <PrimaryButton
            title="Send OTP →"
            onPress={handleSendOtp}
            disabled={!isValid}
            loading={loading}
          />
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  inner: { flex: 1 },
  backButton: {
    padding: spacing.md,
    alignSelf: 'flex-start',
  },
  backText: { fontSize: 24, color: colors.textPrimary },

  content: { flex: 1, padding: spacing.xl, gap: spacing.md },
  stepLabel: { ...typography.caption, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  title: { ...typography.h1, lineHeight: 36 },
  subtitle: { ...typography.body2, color: colors.textSecondary },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  prefixBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 14,
    gap: spacing.xs,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...shadows.sm,
  },
  flag: { fontSize: 18 },
  prefix: { ...typography.body1, fontWeight: '600', color: colors.textPrimary },

  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    borderWidth: 1.5,
    borderColor: colors.border,
    letterSpacing: 2,
    ...shadows.sm,
  },
  inputError: { borderColor: colors.error },

  errorText: { ...typography.caption, color: colors.error },
  privacyNote: { ...typography.caption, color: colors.textMuted, lineHeight: 18 },

  footer: { padding: spacing.xl, paddingTop: 0 },
});
