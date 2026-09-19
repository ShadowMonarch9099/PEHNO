/**
 * Root navigation. Which tree is mounted depends on auth state:
 *   booting → spinner;  signedOut → Auth;  signedIn & !onboarding_complete → Onboarding;  else → Main tabs.
 */
import { Feather } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, type LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import PlaceholderScreen from '../screens/PlaceholderScreen';
import BodyTypeScreen from '../screens/onboarding/BodyTypeScreen';
import OtpScreen from '../screens/onboarding/OtpScreen';
import PhoneScreen from '../screens/onboarding/PhoneScreen';
import ProfileSetupScreen from '../screens/onboarding/ProfileSetupScreen';
import SkinToneScreen from '../screens/onboarding/SkinToneScreen';
import StyleAffinityScreen from '../screens/onboarding/StyleAffinityScreen';
import WardrobeIntroScreen from '../screens/onboarding/WardrobeIntroScreen';
import WelcomeScreen from '../screens/onboarding/WelcomeScreen';
import SettingsHomeScreen from '../screens/settings/SettingsHomeScreen';
import GarmentDetailScreen from '../screens/wardrobe/GarmentDetailScreen';
import GarmentEditScreen from '../screens/wardrobe/GarmentEditScreen';
import UploadScreen from '../screens/wardrobe/UploadScreen';
import WardrobeHomeScreen from '../screens/wardrobe/WardrobeHomeScreen';
import { useAuthStore } from '../store';
import { colors } from '../theme';
import type {
  AuthStackParamList,
  MainTabParamList,
  OnboardingStackParamList,
  WardrobeStackParamList,
} from './types';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const OnboardingStack = createNativeStackNavigator<OnboardingStackParamList>();
const WardrobeStack = createNativeStackNavigator<WardrobeStackParamList>();
const Tabs = createBottomTabNavigator<MainTabParamList>();

const linking: LinkingOptions<MainTabParamList> = {
  prefixes: ['pehno://', 'https://app.pehno.in'],
  config: {
    screens: {
      Wardrobe: { screens: { WardrobeHome: 'wardrobe', GarmentDetail: 'wardrobe/:garmentId', Upload: 'wardrobe/upload' } },
      Outfits: 'outfits',
      Festivals: 'festivals',
      Settings: 'settings',
    },
  },
};

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
      <AuthStack.Screen name="Phone" component={PhoneScreen} />
      <AuthStack.Screen name="Otp" component={OtpScreen} />
    </AuthStack.Navigator>
  );
}

function OnboardingNavigator() {
  return (
    <OnboardingStack.Navigator screenOptions={{ headerShown: false }}>
      <OnboardingStack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
      <OnboardingStack.Screen name="BodyType" component={BodyTypeScreen} />
      <OnboardingStack.Screen name="SkinTone" component={SkinToneScreen} />
      <OnboardingStack.Screen name="StyleAffinity" component={StyleAffinityScreen} />
      <OnboardingStack.Screen name="WardrobeIntro" component={WardrobeIntroScreen} />
    </OnboardingStack.Navigator>
  );
}

function WardrobeNavigator() {
  return (
    <WardrobeStack.Navigator screenOptions={{ headerShown: false }}>
      <WardrobeStack.Screen name="WardrobeHome" component={WardrobeHomeScreen} />
      <WardrobeStack.Screen name="Upload" component={UploadScreen} />
      <WardrobeStack.Screen name="GarmentDetail" component={GarmentDetailScreen} />
      <WardrobeStack.Screen name="GarmentEdit" component={GarmentEditScreen} />
    </WardrobeStack.Navigator>
  );
}

const TAB_ICONS: Record<keyof MainTabParamList, React.ComponentProps<typeof Feather>['name']> = {
  Wardrobe: 'archive',
  Outfits: 'star',
  Festivals: 'calendar',
  Settings: 'settings',
};

const OutfitsPlaceholder = () => <PlaceholderScreen title="Outfits" />;
const FestivalsPlaceholder = () => <PlaceholderScreen title="Festivals" />;

function MainNavigator() {
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.borderLight },
        tabBarIcon: ({ color, size }) => <Feather name={TAB_ICONS[route.name]} color={color} size={size} />,
      })}
    >
      <Tabs.Screen name="Wardrobe" component={WardrobeNavigator} />
      <Tabs.Screen name="Outfits" component={OutfitsPlaceholder} />
      <Tabs.Screen name="Festivals" component={FestivalsPlaceholder} />
      <Tabs.Screen name="Settings" component={SettingsHomeScreen} />
    </Tabs.Navigator>
  );
}

export default function RootNavigation() {
  const status = useAuthStore((s) => s.status);
  const onboarded = useAuthStore((s) => s.user?.onboarding_complete ?? false);

  if (status === 'booting') {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking}>
      {status === 'signedOut' ? <AuthNavigator /> : onboarded ? <MainNavigator /> : <OnboardingNavigator />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
});
