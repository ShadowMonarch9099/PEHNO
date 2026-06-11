/**
 * OutfitHistoryScreen — Past outfits with date and rating
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity } from 'react-native';
import { colors, spacing, typography } from '../../theme';
import { OutfitCard } from '../../components/outfit';
import { useOutfitStore, useWardrobeStore } from '../../store';
import { outfitApi } from '../../services/api';

export default function OutfitHistoryScreen({ navigation }: any) {
  const { history, loadHistory } = useOutfitStore();
  const { garments } = useWardrobeStore();

  useEffect(() => {
    outfitApi.getHistory().then((res) => loadHistory(res.data)).catch(() => {});
  }, []);

  const getGarments = (outfit: any) => garments.filter((g) => outfit.garment_ids?.includes(g.id));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Outfit History</Text>
        <TouchableOpacity onPress={() => navigation.navigate('SavedOutfits')}>
          <Text style={styles.savedText}>Saved 🔖</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={history}
        keyExtractor={(o) => o.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View>
            <Text style={styles.dateLabel}>
              {new Date(item.created_at).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
            </Text>
            <OutfitCard
              outfit={item}
              garments={getGarments(item)}
              compact
              onPress={() => navigation.navigate('OutfitResult', { outfits: [item], occasion: item.occasion })}
            />
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyText}>No outfit history yet</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
  backText: { fontSize: 24 },
  title: { ...typography.h3 },
  savedText: { ...typography.body2, color: colors.primary },
  list: { padding: spacing.md, gap: spacing.xs, paddingBottom: 40 },
  dateLabel: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.xs },
  empty: { alignItems: 'center', paddingTop: 80, gap: spacing.md },
  emptyEmoji: { fontSize: 48 },
  emptyText: { ...typography.body1, color: colors.textSecondary },
});
