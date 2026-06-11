/**
 * OTPScreen — 6-digit OTP input with 60s resend timer
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { PrimaryButton, LoadingOverlay } from '../../components/ui';
import { authApi, userApi } from '../../services/api';
import { useUserStore } from '../../store';

interface Props {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<any>;
}

const OTP_LENGTH = 6;

export default function OTPScreen({ navigation, route }: Props) {
  const { phone } = route.params as { phone: string };
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const { setUser, setTokens } = useUserStore();

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          setCanResend(true);
          clearInterval(interval);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleVerify = async () => {
    if (otp.length !== OTP_LENGTH) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await authApi.verifyOtp(phone, otp);
      await SecureStore.setItemAsync('access_token', data.access_token);
      await SecureStore.setItemAsync('refresh_token', data.refresh_token);
      setTokens(data.access_token);

      // Fetch user profile
      const userRes = await userApi.getMe();
      setUser(userRes.data);

      if (data.is_new_user || !userRes.data.onboarding_complete) {
        navigation.navigate('ProfileSetup');
      } else {
        navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid OTP. Please try again.');
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setCanResend(false);
    setTimer(60);
    setError('');
    try {
      await authApi.sendOtp(phone);
    } catch {
      setError('Failed to resend OTP');
    }
    // Restart timer
    const interval = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) { setCanResend(true); clearInterval(interval); return 0; }
        return t - 1;
      });
    }, 1000);
  };

  // OTP Box UI
  const otpBoxes = Array.from({ length: OTP_LENGTH });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView style={styles.inner}>
        <LoadingOverlay visible={loading} message="Verifying OTP..." />

        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>

        <View style={styles.content}>
          <Text style={styles.stepLabel}>Step 2 of 2</Text>
          <Text style={styles.title}>Enter OTP</Text>
          <Text style={styles.subtitle}>
            Sent to{' '}
            <Text style={styles.phoneHighlight}>{phone}</Text>
          </Text>

          {/* OTP Boxes */}
          <TouchableOpacity style={styles.otpBoxesRow} onPress={() => inputRef.current?.focus()}>
            {otpBoxes.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.otpBox,
                  i === otp.length && styles.otpBoxActive,
                  i < otp.length && styles.otpBoxFilled,
                  error && styles.otpBoxError,
                ]}
              >
                <Text style={styles.otpDigit}>{otp[i] || ''}</Text>
              </View>
            ))}
          </TouchableOpacity>

          {/* Hidden real input */}
          <TextInput
            ref={inputRef}
            style={styles.hiddenInput}
            value={otp}
            onChangeText={(t) => {
              setOtp(t.replace(/\D/g, '').slice(0, OTP_LENGTH));
              setError('');
              if (t.length === OTP_LENGTH) handleVerify();
            }}
            keyboardType="number-pad"
            maxLength={OTP_LENGTH}
            autoFocus
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Resend */}
          <View style={styles.resendRow}>
            <Text style={styles.resendText}>Didn't receive it? </Text>
            {canResend ? (
              <TouchableOpacity onPress={handleResend}>
                <Text style={styles.resendLink}>Resend OTP</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.timerText}>Resend in {timer}s</Text>
            )}
          </View>
        </View>

        <View style={styles.footer}>
          <PrimaryButton
            title="Verify →"
            onPress={handleVerify}
            disabled={otp.length !== OTP_LENGTH}
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
  backButton: { padding: spacing.md, alignSelf: 'flex-start' },
  backText: { fontSize: 24, color: colors.textPrimary },

  content: { flex: 1, padding: spacing.xl, gap: spacing.lg },
  stepLabel: { ...typography.caption, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  title: { ...typography.h1 },
  subtitle: { ...typography.body2, color: colors.textSecondary },
  phoneHighlight: { color: colors.primary, fontWeight: '700' },

  otpBoxesRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  otpBox: {
    width: 48,
    height: 60,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxActive: { borderColor: colors.primary },
  otpBoxFilled: { borderColor: colors.primaryLight, backgroundColor: colors.surfaceElevated },
  otpBoxError: { borderColor: colors.error },
  otpDigit: { fontSize: 24, fontWeight: '700', color: colors.textPrimary },
  hiddenInput: { position: 'absolute', opacity: 0, height: 0 },

  errorText: { ...typography.caption, color: colors.error, textAlign: 'center' },
  resendRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  resendText: { ...typography.body2, color: colors.textSecondary },
  resendLink: { ...typography.body2, color: colors.primary, fontWeight: '700' },
  timerText: { ...typography.body2, color: colors.textMuted },
  footer: { padding: spacing.xl, paddingTop: 0 },
});
