/**
 * OtpScreen — 6-box code entry, auto-submit, resend with countdown.
 */
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../components/ui';
import type { AuthScreenProps } from '../../navigation/types';
import { ApiError, authApi } from '../../services';
import { useAuthStore } from '../../store';
import { borderRadius, colors, spacing, typography } from '../../theme';

const RESEND_SECONDS = 60;
const OTP_LENGTH = 6;

export default function OtpScreen({ route, navigation }: AuthScreenProps<'Otp'>) {
  const { phone } = route.params;
  const [devOtp, setDevOtp] = useState(route.params.devOtp);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(RESEND_SECONDS);
  const inputRef = useRef<TextInput>(null);
  const signIn = useAuthStore((s) => s.signIn);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const verify = async (value: string) => {
    if (value.length !== OTP_LENGTH || loading) return;
    setLoading(true);
    setError(null);
    try {
      const tokens = await authApi.verifyOtp(phone, value);
      await signIn(tokens); // root navigator switches stacks on status change
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Verification failed');
      setCode('');
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  const onChange = (t: string) => {
    const digits = t.replace(/\D/g, '').slice(0, OTP_LENGTH);
    setCode(digits);
    setError(null);
    if (digits.length === OTP_LENGTH) void verify(digits);
  };

  const resend = async () => {
    if (resendIn > 0) return;
    try {
      const res = await authApi.sendOtp(phone);
      setDevOtp(res.dev_otp);
      setResendIn(RESEND_SECONDS);
      setCode('');
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not resend OTP');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity onPress={navigation.goBack} style={styles.back} hitSlop={12}>
        <Text style={styles.backText}>← Change number</Text>
      </TouchableOpacity>

      <View style={styles.body}>
        <Text style={typography.h1}>Enter the code</Text>
        <Text style={styles.subtitle}>Sent to {phone}</Text>

        {/* One hidden input drives the six visual boxes — keeps paste + autofill working. */}
        <TouchableOpacity activeOpacity={1} onPress={() => inputRef.current?.focus()} style={styles.boxes}>
          {Array.from({ length: OTP_LENGTH }).map((_, i) => {
            const filled = i < code.length;
            const active = i === code.length;
            return (
              <View
                key={i}
                style={[styles.box, active && styles.boxActive, error ? styles.boxError : null]}
              >
                <Text style={styles.boxText}>{filled ? code[i] : ''}</Text>
              </View>
            );
          })}
        </TouchableOpacity>
        <TextInput
          ref={inputRef}
          value={code}
          onChangeText={onChange}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          maxLength={OTP_LENGTH}
          autoFocus
          style={styles.hiddenInput}
          accessibilityLabel="One-time code"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {devOtp ? <Text style={styles.devHint}>Dev OTP: {devOtp}</Text> : null}

        <PrimaryButton
          title="Verify"
          onPress={() => verify(code)}
          disabled={code.length !== OTP_LENGTH}
          loading={loading}
        />

        <TouchableOpacity onPress={resend} disabled={resendIn > 0} style={styles.resend}>
          <Text style={[styles.resendText, resendIn > 0 && styles.resendDisabled]}>
            {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  back: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, alignSelf: 'flex-start' },
  backText: { ...typography.label, color: colors.primary },
  body: { flex: 1, padding: spacing.xl, gap: spacing.md },
  subtitle: { ...typography.body2, marginBottom: spacing.sm },
  boxes: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  box: {
    flex: 1,
    height: 60,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxActive: { borderColor: colors.primary, borderWidth: 2 },
  boxError: { borderColor: colors.error },
  boxText: { ...typography.h2 },
  hiddenInput: { position: 'absolute', opacity: 0, height: 1, width: 1 },
  error: { ...typography.caption, color: colors.error },
  devHint: { ...typography.caption, color: colors.info },
  resend: { alignSelf: 'center', padding: spacing.sm },
  resendText: { ...typography.label, color: colors.primary },
  resendDisabled: { color: colors.textMuted },
});
