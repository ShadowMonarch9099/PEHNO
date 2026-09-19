import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

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
};

export type OutfitStackParamList = {
  DailyLook: undefined;
  OccasionPicker: undefined;
  OutfitResult: { occasion: string; festival?: string };
  OutfitHistory: { saved?: boolean };
};

export type MainTabParamList = {
  Wardrobe: undefined;
  Outfits: undefined;
  Festivals: undefined;
  Settings: undefined;
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
export type WardrobeScreenProps<T extends keyof WardrobeStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<WardrobeStackParamList, T>,
  BottomTabScreenProps<MainTabParamList>
>;
