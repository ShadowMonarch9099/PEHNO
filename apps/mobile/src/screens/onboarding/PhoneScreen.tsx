/**
 * PhoneScreen — enter Indian mobile number, request OTP.
 */
import React, { useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../components/ui';
import type { AuthScreenProps } from '../../navigation/types';
import { ApiError, authApi } from '../../services';
import { borderRadius, colors, spacing, typography } from '../../theme';
import { digitsOnly, formatIndianMobile, isValidIndianMobile } from '../../utils/phone';

export default function PhoneScreen({ navigation }: AuthScreenProps<'Phone'>) {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const valid = isValidIndianMobile(phone);

  const submit = async () => {
    if (!valid || loading) return;
    Keyboard.dismiss();
    setLoading(true);
    setError(null);
    try {
      const res = await authApi.sendOtp(digitsOnly(phone));
      navigation.navigate('Otp', {
        phone: res.phone,
        expiresInSeconds: res.expires_in_seconds,
        devOtp: res.dev_otp,
      });
    } catch (e) {
      setError(e instanceof ApiError ? (e.errors?.phone ?? e.message) : 'Could not send OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity onPress={navigation.goBack} style={styles.back} hitSlop={12}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.body}>
          <Text style={typography.h1}>Your mobile number</Text>
          <Text style={styles.subtitle}>We'll send a 6-digit code to verify it's you.</Text>

          <View style={[styles.inputRow, error ? styles.inputError : null]}>
            <Text style={styles.prefix}>🇮🇳 +91</Text>
            <TextInput
              style={styles.input}
              value={formatIndianMobile(phone)}
              onChangeText={(t) => {
                setPhone(digitsOnly(t).slice(0, 10));
                setError(null);
              }}
              keyboardType="number-pad"
              textContentType="telephoneNumber"
              autoComplete="tel"
              placeholder="98765 43210"
              placeholderTextColor={colors.textMuted}
              maxLength={11}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={submit}
              accessibilityLabel="Mobile number"
            />
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <PrimaryButton title="Send OTP" onPress={submit} disabled={!valid} loading={loading} />
          <Text style={styles.legal}>
            By continuing you agree to our Terms and Privacy Policy.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  back: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, alignSelf: 'flex-start' },
  backText: { ...typography.label, color: colors.primary },
  body: { flex: 1, padding: spacing.xl, gap: spacing.md },
  subtitle: { ...typography.body2, marginBottom: spacing.sm },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.md,
    height: 56,
  },
  inputError: { borderColor: colors.error },
  prefix: { ...typography.h4, marginRight: spacing.sm },
  input: { flex: 1, ...typography.h4, letterSpacing: 1, paddingVertical: 0 },
  error: { ...typography.caption, color: colors.error, marginTop: -spacing.sm },
  legal: { ...typography.caption, textAlign: 'center' },
});
