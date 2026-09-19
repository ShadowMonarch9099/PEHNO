import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type AuthStackParamList = {
  Welcome: undefined;
  Phone: undefined;
  Otp: { phone: string; expiresInSeconds: number; devOtp: string | null };
};

export type OnboardingStackParamList = {
  ProfileSetup: undefined;
};

export type MainTabParamList = {
  Wardrobe: undefined;
  Outfits: undefined;
  Festivals: undefined;
  Settings: undefined;
};

export type AuthScreenProps<T extends keyof AuthStackParamList> = NativeStackScreenProps<
  AuthStackParamList,
  T
>;
