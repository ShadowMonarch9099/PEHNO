/**
 * Image with disk cache, low-res placeholder colour and a short fade — the
 * slow-network default for every garment/outfit/card image (expo-image).
 */
import { Image, type ImageContentFit, type ImageStyle } from 'expo-image';
import React from 'react';
import type { StyleProp } from 'react-native';
import { colors } from '../../theme';

interface Props {
  uri: string | null | undefined;
  style?: StyleProp<ImageStyle>;
  contentFit?: ImageContentFit;
  /** Lower priority for off-screen grids so the hero loads first. */
  priority?: 'low' | 'normal' | 'high';
  accessibilityLabel?: string;
}

export const LazyImage: React.FC<Props> = ({ uri, style, contentFit = 'cover', priority = 'normal', accessibilityLabel }) => (
  <Image
    source={uri ? { uri } : undefined}
    style={[{ backgroundColor: colors.borderLight }, style]}
    contentFit={contentFit}
    cachePolicy="memory-disk"
    transition={150}
    priority={priority}
    recyclingKey={uri ?? undefined}
    accessibilityLabel={accessibilityLabel}
  />
);
