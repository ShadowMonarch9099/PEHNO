/**
 * Upload — camera or gallery (multi-select up to 10), preview grid, one batch upload.
 */
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton, ProgressBar, ScreenHeader, SecondaryButton } from '../../components/ui';
import type { WardrobeScreenProps } from '../../navigation/types';
import { ApiError, type LocalPhoto } from '../../services';
import { useWardrobeStore } from '../../store';
import { borderRadius, colors, spacing, typography } from '../../theme';

const MAX = 10;
const TIPS = ['One item per photo', 'Flat or on a hanger', 'Daylight, plain background'];

export default function UploadScreen({ navigation }: WardrobeScreenProps<'Upload'>) {
  const upload = useWardrobeStore((s) => s.upload);
  const [photos, setPhotos] = useState<LocalPhoto[]>([]);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const add = (assets: ImagePicker.ImagePickerAsset[]) => {
    setError(null);
    setPhotos((p) =>
      [...p, ...assets.map((a) => ({ uri: a.uri, fileName: a.fileName, mimeType: a.mimeType }))].slice(0, MAX),
    );
  };

  const pickFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return setError('Photo library permission is needed to pick photos.');
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: MAX - photos.length,
      quality: 0.85,
    });
    if (!res.canceled) add(res.assets);
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return setError('Camera permission is needed to take photos.');
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 });
    if (!res.canceled) add(res.assets);
  };

  const submit = async () => {
    if (!photos.length) return;
    setProgress(0);
    setError(null);
    try {
      const res = await upload(photos, setProgress);
      if (res.rejected.length) {
        Alert.alert(
          `${res.created.length} added, ${res.rejected.length} skipped`,
          res.rejected.map((r) => `• ${r.reason}`).join('\n'),
        );
      }
      navigation.navigate('WardrobeHome');
    } catch (e) {
      if (e instanceof ApiError && e.paywall) {
        setProgress(null);
        Alert.alert('Wardrobe limit reached', e.paywall.message, [
          { text: 'Not now', style: 'cancel' },
          { text: 'See plans', onPress: () => navigation.navigate('Settings', { screen: 'Subscription', params: { highlight: 'plus', reason: e.paywall!.feature } }) },
        ]);
        return;
      }
      setError(e instanceof ApiError ? e.message : 'Upload failed. Check your connection and try again.');
      setProgress(null);
    }
  };

  const uploading = progress !== null;

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Add clothes" subtitle={`Up to ${MAX} photos per batch.`} onBack={navigation.goBack} />
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.action} onPress={takePhoto} disabled={uploading || photos.length >= MAX}>
            <Feather name="camera" size={28} color={colors.primary} />
            <Text style={styles.actionText}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.action} onPress={pickFromGallery} disabled={uploading || photos.length >= MAX}>
            <Feather name="image" size={28} color={colors.primary} />
            <Text style={styles.actionText}>Gallery</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tips}>
          {TIPS.map((t) => (
            <Text key={t} style={styles.tip}>💡 {t}</Text>
          ))}
        </View>

        {photos.length ? (
          <View style={styles.grid}>
            {photos.map((p, i) => (
              <View key={p.uri} style={styles.thumbWrap}>
                <Image source={{ uri: p.uri }} style={styles.thumb} />
                {!uploading ? (
                  <TouchableOpacity style={styles.remove} onPress={() => setPhotos((ps) => ps.filter((_, j) => j !== i))} hitSlop={8}>
                    <Feather name="x" size={14} color={colors.white} />
                  </TouchableOpacity>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        {uploading ? <ProgressBar value={progress} label="Uploading" hint={`${Math.round(progress * 100)}%`} /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          title={photos.length ? `Upload ${photos.length} ${photos.length === 1 ? 'photo' : 'photos'}` : 'Choose photos'}
          onPress={photos.length ? submit : pickFromGallery}
          loading={uploading}
        />
        {photos.length && !uploading ? <SecondaryButton title="Clear" onPress={() => setPhotos([])} /> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  body: { padding: spacing.xl, gap: spacing.lg },
  actions: { flexDirection: 'row', gap: spacing.md },
  action: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    backgroundColor: colors.surfaceElevated,
  },
  actionText: { ...typography.label, color: colors.primary },
  tips: { gap: spacing.xs },
  tip: { ...typography.caption },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  thumbWrap: { width: '30%', aspectRatio: 0.8 },
  thumb: { width: '100%', height: '100%', borderRadius: borderRadius.md, backgroundColor: colors.borderLight },
  remove: { position: 'absolute', top: 4, right: 4, backgroundColor: colors.overlay, borderRadius: 10, padding: 3 },
  error: { ...typography.caption, color: colors.error },
  footer: { padding: spacing.xl, gap: spacing.sm },
});
