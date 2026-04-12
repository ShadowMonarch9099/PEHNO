/**
 * ClassifyingScreen — AI classification loading state with animation
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Animated } from 'react-native';
import { colors, spacing, borderRadius, typography } from '../../theme';

const AI_MESSAGES = [
  'Analyzing fabric texture...',
  'Identifying garment type...',
  'Detecting primary color...',
  'Mapping occasion tags...',
  'Generating care profile...',
  'Almost done!',
];

export default function ClassifyingScreen({ route, navigation }: any) {
  const { garmentId } = route.params || {};
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [messageIdx, setMessageIdx] = React.useState(0);

  useEffect(() => {
    // Pulse animation
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();

    // Cycle through messages
    const msgInterval = setInterval(() => {
      setMessageIdx((i) => (i + 1) % AI_MESSAGES.length);
    }, 1500);

    // Auto-navigate after delay (in real app: subscribe to Supabase realtime)
    const timeout = setTimeout(() => {
      navigation.navigate('GarmentDetail', { garmentId, pending: true });
    }, 9000);

    return () => {
      pulse.stop();
      clearInterval(msgInterval);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Pulsing Logo */}
        <Animated.View style={[styles.logoContainer, { transform: [{ scale: pulseAnim }] }]}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>P</Text>
          </View>
          <View style={styles.aiSparkles}>
            {['✦', '✧', '✦'].map((s, i) => (
              <Text key={i} style={[styles.sparkle, { opacity: (i + 1) * 0.33 }]}>{s}</Text>
            ))}
          </View>
        </Animated.View>

        <Text style={styles.title}>Our AI is reading{'\n'}your wardrobe...</Text>

        <View style={styles.messageContainer}>
          <Text style={styles.aiMessage}>{AI_MESSAGES[messageIdx]}</Text>
        </View>

        {/* Progress dots */}
        <View style={styles.dots}>
          {AI_MESSAGES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === messageIdx && styles.dotActive]}
            />
          ))}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            🤖 Using Google Vision AI to classify your garment type, fabric, color, and occasion tags.
            Your wardrobe will update automatically.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.xl,
  },
  logoContainer: { position: 'relative', alignItems: 'center' },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { fontSize: 50, fontWeight: '800', color: colors.background },
  aiSparkles: {
    position: 'absolute',
    top: -10,
    right: -16,
    flexDirection: 'row',
    gap: 2,
  },
  sparkle: { fontSize: 18, color: colors.accent },

  title: {
    ...typography.h2,
    textAlign: 'center',
    lineHeight: 32,
  },

  messageContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 240,
    alignItems: 'center',
  },
  aiMessage: {
    ...typography.body1,
    color: colors.primary,
    fontWeight: '500',
    textAlign: 'center',
  },

  dots: { flexDirection: 'row', gap: spacing.xs },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: { backgroundColor: colors.primary, width: 20 },

  infoCard: {
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary + '20',
  },
  infoText: {
    ...typography.body2,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
