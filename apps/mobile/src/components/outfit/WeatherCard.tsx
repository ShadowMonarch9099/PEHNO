import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { WeatherInfo } from '../../services/types';
import { borderRadius, colors, spacing, typography } from '../../theme';

const ICON: Record<WeatherInfo['condition'], string> = {
  sunny: '☀️',
  cloudy: '⛅',
  humid: '🌫️',
  rain: '🌧️',
  foggy: '🌁',
  cold: '❄️',
};

export const WeatherCard: React.FC<{ weather: WeatherInfo }> = ({ weather: w }) => (
  <View style={styles.card}>
    <View style={styles.row}>
      <Text style={styles.icon}>{ICON[w.condition] ?? '🌤️'}</Text>
      <View style={styles.text}>
        <Text style={styles.temp}>
          {Math.round(w.temp_c)}°C <Text style={styles.city}>· {w.city}</Text>
        </Text>
        <Text style={typography.caption}>
          {w.description || w.condition} · {w.season} · feels like {Math.round(w.feels_like_c)}°
        </Text>
      </View>
    </View>
    <Text style={styles.tip}>{w.fabric_tip}</Text>
    {w.source === 'climatology' ? <Text style={styles.source}>Typical weather for this month (live forecast not connected)</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  card: { backgroundColor: colors.primary, borderRadius: borderRadius.xl, padding: spacing.md, gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: { fontSize: 36 },
  text: { flex: 1 },
  temp: { ...typography.h2, color: colors.textInverse },
  city: { ...typography.body2, color: colors.textInverse },
  tip: { ...typography.body2, color: colors.textInverse },
  source: { ...typography.caption, color: colors.primaryContainer },
});
