/**
 * UploadScreen — Camera + gallery picker with compression
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Image, ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, borderRadius, typography, shadows } from '../../theme';
import { PrimaryButton, LoadingOverlay } from '../../components/ui';
import { wardrobeApi } from '../../services/api';
import { useWardrobeStore } from '../../store';

export default function UploadScreen({ navigation }: any) {
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { addGarment } = useWardrobeStore();

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 10,
    });
    if (!result.canceled) {
      setImages((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
    }
  };

  const pickFromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.85,
      allowsEditing: true,
      aspect: [3, 4],
    });
    if (!result.canceled) {
      setImages((prev) => [...prev, result.assets[0].uri]);
    }
  };

  const handleUpload = async () => {
    if (images.length === 0) return;
    setUploading(true);

    for (let i = 0; i < images.length; i++) {
      try {
        const formData = new FormData();
        formData.append('file', {
          uri: images[i],
          type: 'image/jpeg',
          name: `garment_${Date.now()}.jpg`,
        } as any);

        const res = await wardrobeApi.upload(formData);
        addGarment({
          id: res.data.garment_id,
          image_url: images[i],
          garment_type: 'unknown',
          fabric_type: 'unknown',
          color_primary: 'unknown',
          occasion_tags: [],
          season_tags: [],
          wear_count: 0,
          ai_confidence: 0,
          classification_status: 'pending',
          user_verified: false,
          care_profile: {},
          condition: 'good',
          created_at: new Date().toISOString(),
          user_id: '',
        });

        setProgress(Math.round(((i + 1) / images.length) * 100));

        // Navigate to classifying screen for first upload
        if (i === 0) {
          navigation.navigate('Classifying', { garmentId: res.data.garment_id });
        }
      } catch (e) {
        console.error('Upload failed for image', i, e);
      }
    }

    setUploading(false);
    setImages([]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <LoadingOverlay visible={uploading} message={`Uploading... ${progress}%`} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Add to Wardrobe</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Pick Actions */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionCard} onPress={pickFromCamera}>
            <Text style={styles.actionEmoji}>📸</Text>
            <Text style={styles.actionLabel}>Take Photo</Text>
            <Text style={styles.actionHint}>Best result with{'\n'}white background</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={pickFromGallery}>
            <Text style={styles.actionEmoji}>🖼️</Text>
            <Text style={styles.actionLabel}>Gallery</Text>
            <Text style={styles.actionHint}>Select up to{'\n'}10 at once</Text>
          </TouchableOpacity>
        </View>

        {/* Tips */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>📷 Photo Tips for Best AI Results</Text>
          {[
            'Lay flat on a clean white or light background',
            'Ensure good lighting — natural light is best',
            'Capture the full garment without cropping',
            'For sarees, photograph the full drape or folded fabric',
          ].map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <Text style={styles.tipBullet}>✓</Text>
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>

        {/* Preview grid */}
        {images.length > 0 && (
          <View style={styles.previewSection}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>{images.length} photo{images.length !== 1 ? 's' : ''} selected</Text>
              <TouchableOpacity onPress={() => setImages([])}>
                <Text style={styles.clearText}>Clear all</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.previewGrid}>
              {images.map((uri, i) => (
                <View key={i} style={styles.previewItem}>
                  <Image source={{ uri }} style={styles.previewImage} />
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    <Text style={styles.removeBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
            <PrimaryButton
              title={`Upload ${images.length} garment${images.length !== 1 ? 's' : ''} →`}
              onPress={handleUpload}
              loading={uploading}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  backText: { fontSize: 24 },
  title: { ...typography.h3 },
  scroll: { padding: spacing.md, gap: spacing.lg },

  actionRow: { flexDirection: 'row', gap: spacing.md },
  actionCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 2,
    borderColor: colors.borderLight,
    borderStyle: 'dashed',
    ...shadows.sm,
  },
  actionEmoji: { fontSize: 44 },
  actionLabel: { ...typography.h4, textAlign: 'center' },
  actionHint: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },

  tipsCard: {
    backgroundColor: colors.primary + '08',
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary + '20',
  },
  tipsTitle: { ...typography.h4, color: colors.primary },
  tipRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  tipBullet: { color: colors.primary, fontWeight: '700', marginTop: 1 },
  tipText: { ...typography.body2, color: colors.textSecondary, flex: 1 },

  previewSection: { gap: spacing.md },
  previewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  previewTitle: { ...typography.h4 },
  clearText: { ...typography.body2, color: colors.error },
  previewGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  previewItem: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  previewImage: { width: '100%', height: '100%' },
  removeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: { color: colors.white, fontSize: 11, fontWeight: '700' },
});
