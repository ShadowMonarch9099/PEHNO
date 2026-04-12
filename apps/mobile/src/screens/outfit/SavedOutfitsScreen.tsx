/**
 * SavedOutfitsScreen — Bookmarked outfit collection
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity } from 'react-native';
import { colors, spacing, typography } from '../../theme';
import { OutfitCard } from '../../components/outfit';
import { useOutfitStore, useWardrobeStore } from '../../store';
import { outfitApi } from '../../services/api';

export default function SavedOutfitsScreen({ navigation }: any) {
  const { savedOutfits, loadSavedOutfits } = useOutfitStore();
  const { garments } = useWardrobeStore();

  useEffect(() => {
    outfitApi.getSaved().then((res) => loadSavedOutfits(res.data)).catch(() => {});
  }, []);

  const getGarments = (outfit: any) => garments.filter((g) => outfit.garment_ids?.includes(g.id));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Saved Outfits 🔖</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={savedOutfits}
        keyExtractor={(o) => o.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <OutfitCard
            outfit={item}
            garments={getGarments(item)}
            onPress={() => navigation.navigate('OutfitResult', { outfits: [item], occasion: item.occasion })}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🔖</Text>
            <Text style={styles.emptyText}>No saved outfits yet</Text>
            <Text style={styles.emptySubtext}>Save outfits you love to find them here</Text>
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
  list: { padding: spacing.md, paddingBottom: 40 },
  empty: { alignItems: 'center', paddingTop: 80, gap: spacing.sm },
  emptyEmoji: { fontSize: 56 },
  emptyText: { ...typography.h3 },
  emptySubtext: { ...typography.body2, color: colors.textSecondary },
});
