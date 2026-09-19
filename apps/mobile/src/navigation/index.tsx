/**
 * Root navigation. Which stack is mounted depends on auth state:
 *   booting → splash;  signedOut → Auth;  signedIn & !onboarding_complete → Onboarding;  else → Main.
 */
import { Feather } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, type LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import PlaceholderScreen from '../screens/PlaceholderScreen';
import OtpScreen from '../screens/onboarding/OtpScreen';
import PhoneScreen from '../screens/onboarding/PhoneScreen';
import WelcomeScreen from '../screens/onboarding/WelcomeScreen';
import { useAuthStore } from '../store';
import { colors } from '../theme';
import type { AuthStackParamList, MainTabParamList, OnboardingStackParamList } from './types';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const OnboardingStack = createNativeStackNavigator<OnboardingStackParamList>();
const Tabs = createBottomTabNavigator<MainTabParamList>();

const linking: LinkingOptions<MainTabParamList> = {
  prefixes: ['pehno://', 'https://app.pehno.in'],
  config: { screens: { Wardrobe: 'wardrobe', Outfits: 'outfits', Festivals: 'festivals', Settings: 'settings' } },
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
      <OnboardingStack.Screen name="ProfileSetup">
        {() => <PlaceholderScreen title="Profile setup" />}
      </OnboardingStack.Screen>
    </OnboardingStack.Navigator>
  );
}

const TAB_ICONS: Record<keyof MainTabParamList, React.ComponentProps<typeof Feather>['name']> = {
  Wardrobe: 'archive',
  Outfits: 'star',
  Festivals: 'calendar',
  Settings: 'settings',
};

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
      <Tabs.Screen name="Wardrobe">{() => <PlaceholderScreen title="Wardrobe" />}</Tabs.Screen>
      <Tabs.Screen name="Outfits">{() => <PlaceholderScreen title="Outfits" />}</Tabs.Screen>
      <Tabs.Screen name="Festivals">{() => <PlaceholderScreen title="Festivals" />}</Tabs.Screen>
      <Tabs.Screen name="Settings">{() => <PlaceholderScreen title="Settings" />}</Tabs.Screen>
    </Tabs.Navigator>
  );
}

export default function RootNavigation() {
  const status = useAuthStore((s) => s.status);
  const onboarded = useAuthStore((s) => s.user?.onboarding_complete ?? false);

  if (status === 'booting') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
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
