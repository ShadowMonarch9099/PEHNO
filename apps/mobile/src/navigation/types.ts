import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Gap } from '../services/types';

export type AuthStackParamList = {
  Welcome: undefined;
  Phone: undefined;
  Otp: { phone: string; expiresInSeconds: number; devOtp: string | null };
};

export type OnboardingStackParamList = {
  ProfileSetup: undefined;
  BodyType: undefined;
  SkinTone: undefined;
  StyleAffinity: undefined;
  WardrobeIntro: undefined;
};

export type WardrobeStackParamList = {
  WardrobeHome: undefined;
  Upload: undefined;
  GarmentDetail: { garmentId: string };
  GarmentEdit: { garmentId: string };
  GapReport: undefined;
  GapItem: { gap: Gap };
  Roi: undefined;
};

export type OutfitStackParamList = {
  DailyLook: undefined;
  OccasionPicker: undefined;
  OutfitResult: { occasion: string; festival?: string };
  OutfitHistory: { saved?: boolean };
};

export type FestivalStackParamList = {
  FestivalHome: undefined;
  FestivalDetail: { slug: string };
  NavratriTracker: undefined;
};

export type SettingsStackParamList = {
  SettingsHome: undefined;
  Subscription: { highlight?: 'plus' | 'pro'; reason?: string } | undefined;
};

export type MainTabParamList = {
  Wardrobe: NavigatorScreenParams<WardrobeStackParamList> | undefined;
  Outfits: NavigatorScreenParams<OutfitStackParamList> | undefined;
  Festivals: NavigatorScreenParams<FestivalStackParamList> | undefined;
  Settings: NavigatorScreenParams<SettingsStackParamList> | undefined;
};

export type AuthScreenProps<T extends keyof AuthStackParamList> = NativeStackScreenProps<AuthStackParamList, T>;
export type OnboardingScreenProps<T extends keyof OnboardingStackParamList> = NativeStackScreenProps<
  OnboardingStackParamList,
  T
>;
export type OutfitScreenProps<T extends keyof OutfitStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<OutfitStackParamList, T>,
  BottomTabScreenProps<MainTabParamList>
>;
export type SettingsScreenProps<T extends keyof SettingsStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<SettingsStackParamList, T>,
  BottomTabScreenProps<MainTabParamList>
>;
export type FestivalScreenProps<T extends keyof FestivalStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<FestivalStackParamList, T>,
  BottomTabScreenProps<MainTabParamList>
>;
export type WardrobeScreenProps<T extends keyof WardrobeStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<WardrobeStackParamList, T>,
  BottomTabScreenProps<MainTabParamList>
>;
