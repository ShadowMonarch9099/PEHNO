/**
 * DailyLookScreen — Weather card + daily outfit recommendation
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { colors, spacing, borderRadius, typography, shadows } from '../../theme';
import { OutfitCard } from '../../components/outfit';
import { LoadingOverlay, PrimaryButton, SecondaryButton } from '../../components/ui';
import { useOutfitStore, useUserStore } from '../../store';
import { outfitApi } from '../../services/api';

export default function DailyLookScreen({ navigation }: any) {
  const { dailyOutfit, setDailyOutfit, setLoading, isLoading } = useOutfitStore();
  const { user } = useUserStore();
  const [weather, setWeather] = useState<any>(null);
  const [reason, setReason] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchDailyOutfit = async () => {
    setLoading(true);
    try {
      const res = await outfitApi.getDaily();
      setDailyOutfit(res.data.outfit);
      setWeather(res.data.weather);
      setReason(res.data.reason);
    } catch (e) {
      console.error('Failed to load daily outfit', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDailyOutfit(); }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDailyOutfit();
    setRefreshing(false);
  };

  const handleWearThis = async () => {
    if (!dailyOutfit) return;
    try {
      await outfitApi.save(dailyOutfit.id);
      // Log wear for each garment
    } catch {}
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <SafeAreaView style={styles.container}>
      <LoadingOverlay visible={isLoading} message="Curating your outfit..." />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
      >
        {/* Greeting */}
        <View style={styles.greeting}>
          <Text style={styles.greetingText}>{getGreeting()}, {user?.name?.split(' ')[0] || 'there'} 👋</Text>
          <Text style={styles.dateText}>{today}</Text>
        </View>

        {/* Weather Card */}
        {weather && (
          <View style={styles.weatherCard}>
            <View style={styles.weatherCardLeft}>
              <Text style={styles.weatherTemp}>{Math.round(weather.temperature_celsius)}°C</Text>
              <Text style={styles.weatherCity}>{weather.city}</Text>
              <Text style={styles.weatherDesc}>{weather.description}</Text>
            </View>
            <View style={styles.weatherCardRight}>
              <Text style={styles.weatherBigIcon}>
                {getWeatherEmoji(weather.condition)}
              </Text>
              <Text style={styles.weatherFeelsLike}>
                Feels like {Math.round(weather.feels_like)}°
              </Text>
              <Text style={styles.weatherHumidity}>
                💧 {weather.humidity}% humidity
              </Text>
            </View>
            <View style={styles.fabricRecommendation}>
              <Text style={styles.fabricRecTitle}>✅ Good for today:</Text>
              <Text style={styles.fabricRecText}>
                {weather.recommended_fabrics?.slice(0, 3).join(' · ')}
              </Text>
            </View>
          </View>
        )}

        {/* Daily Outfit */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Outfit ✨</Text>
          {reason ? <Text style={styles.reason}>{reason}</Text> : null}
        </View>

        {dailyOutfit ? (
          <>
            <OutfitCard
              outfit={dailyOutfit}
              garments={dailyOutfit.garments || []}
              onPress={() => navigation.navigate('OutfitResult', { outfitId: dailyOutfit.id })}
              onSave={handleWearThis}
            />

            <View style={styles.ctaRow}>
              <PrimaryButton
                title="✓ Wearing This"
                onPress={handleWearThis}
                fullWidth={false}
                style={styles.ctaButton}
              />
              <SecondaryButton
                title="Show Me Another"
                onPress={fetchDailyOutfit}
                fullWidth={false}
                style={styles.ctaButton}
              />
            </View>
          </>
        ) : !isLoading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>👗</Text>
            <Text style={styles.emptyTitle}>No outfit yet</Text>
            <Text style={styles.emptySubtitle}>Add at least 5 garments to get daily recommendations</Text>
            <PrimaryButton
              title="Add Garments"
              onPress={() => navigation.navigate('Wardrobe', { screen: 'Upload' })}
              style={{ marginTop: spacing.md }}
            />
          </View>
        ) : null}

        {/* Occasion Quick Pick */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Generate for occasion</Text>
        </View>
        <TouchableOpacity
          style={styles.occasionPickerCard}
          onPress={() => navigation.navigate('OccasionPicker')}
        >
          <Text style={styles.occasionPickerText}>Choose an occasion →</Text>
          <View style={styles.occasionIcons}>
            {['💼', '💒', '🙏', '🎊', '🎓'].map((icon, i) => (
              <Text key={i} style={styles.occasionIcon}>{icon}</Text>
            ))}
          </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function getWeatherEmoji(condition: string): string {
  const c = condition.toLowerCase();
  if (c.includes('rain')) return '🌧️';
  if (c.includes('cloud')) return '⛅';
  if (c.includes('thunder')) return '⛈️';
  if (c.includes('clear')) return '☀️';
  if (c.includes('mist')) return '🌫️';
  return '🌤️';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.md, gap: spacing.md, paddingBottom: 40 },

  greeting: { paddingTop: spacing.sm },
  greetingText: { ...typography.h2 },
  dateText: { ...typography.body2, color: colors.textSecondary, marginTop: 2 },

  weatherCard: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    ...shadows.md,
  },
  weatherCardLeft: { flex: 1 },
  weatherTemp: { fontSize: 44, fontWeight: '700', color: colors.white },
  weatherCity: { ...typography.h4, color: colors.white + 'DD' },
  weatherDesc: { ...typography.body2, color: colors.white + 'BB', textTransform: 'capitalize' },
  weatherCardRight: { alignItems: 'flex-end' },
  weatherBigIcon: { fontSize: 48 },
  weatherFeelsLike: { ...typography.caption, color: colors.white + 'BB' },
  weatherHumidity: { ...typography.caption, color: colors.white + 'BB' },
  fabricRecommendation: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginTop: spacing.xs,
  },
  fabricRecTitle: { ...typography.caption, color: colors.white, fontWeight: '600' },
  fabricRecText: { ...typography.body2, color: colors.white + 'DD', textTransform: 'capitalize' },

  sectionHeader: { gap: 4 },
  sectionTitle: { ...typography.h3 },
  reason: { ...typography.body2, color: colors.textSecondary },

  ctaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  ctaButton: { flex: 1 },

  emptyState: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { ...typography.h3 },
  emptySubtitle: { ...typography.body2, color: colors.textSecondary, textAlign: 'center' },

  occasionPickerCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    gap: spacing.sm,
  },
  occasionPickerText: { ...typography.h4, color: colors.primary },
  occasionIcons: { flexDirection: 'row', gap: spacing.md },
  occasionIcon: { fontSize: 28 },
});
