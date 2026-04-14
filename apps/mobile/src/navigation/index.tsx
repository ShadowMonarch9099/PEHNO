/**
 * PEHNO App Navigation — Complete navigation structure
 */
import React from 'react';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet } from 'react-native';
import * as Linking from 'expo-linking';
import { Feather } from '@expo/vector-icons';

import { colors, typography } from '../theme';

// Onboarding Screens
import WelcomeScreen from '../screens/onboarding/WelcomeScreen';
import PhoneScreen from '../screens/onboarding/PhoneScreen';
import OTPScreen from '../screens/onboarding/OTPScreen';
import ProfileSetupScreen from '../screens/onboarding/ProfileSetupScreen';
import BodyTypeScreen from '../screens/onboarding/BodyTypeScreen';
import SkinToneScreen from '../screens/onboarding/SkinToneScreen';
import StyleAffinityScreen from '../screens/onboarding/StyleAffinityScreen';
import WardrobeIntroScreen from '../screens/onboarding/WardrobeIntroScreen';

// Wardrobe Screens
import WardrobeHomeScreen from '../screens/wardrobe/WardrobeHomeScreen';
import UploadScreen from '../screens/wardrobe/UploadScreen';
import ClassifyingScreen from '../screens/wardrobe/ClassifyingScreen';
import GarmentDetailScreen from '../screens/wardrobe/GarmentDetailScreen';
import GarmentEditScreen from '../screens/wardrobe/GarmentEditScreen';

// Outfit Screens
import DailyLookScreen from '../screens/outfit/DailyLookScreen';
import OccasionPickerScreen from '../screens/outfit/OccasionPickerScreen';
import OutfitResultScreen from '../screens/outfit/OutfitResultScreen';
import OutfitHistoryScreen from '../screens/outfit/OutfitHistoryScreen';
import SavedOutfitsScreen from '../screens/outfit/SavedOutfitsScreen';

// Festival Screens
import FestivalHomeScreen from '../screens/festival/FestivalHomeScreen';
import FestivalDetailScreen from '../screens/festival/FestivalDetailScreen';
import NavratriTrackerScreen from '../screens/festival/NavratriTrackerScreen';

// Settings Screens
import SettingsHomeScreen from '../screens/settings/SettingsHomeScreen';
import NotificationPrefsScreen from '../screens/settings/NotificationPrefsScreen';
import SubscriptionScreen from '../screens/settings/SubscriptionScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ── Deep Linking Config ────────────────────────────────────────────────────────
const linking: LinkingOptions<any> = {
  prefixes: ['pehno://', 'https://app.pehno.in'],
  config: {
    screens: {
      Main: {
        screens: {
          Outfit: {
            screens: {
              DailyLook: 'outfit/daily',
              OutfitResult: 'outfit/:outfitId',
            },
          },
          Festival: {
            screens: {
              FestivalHome: 'festivals',
              FestivalDetail: 'festival/:slug',
              NavratriTracker: 'festival/navratri',
            },
          },
          Wardrobe: {
            screens: {
              WardrobeHome: 'wardrobe',
              GarmentDetail: 'wardrobe/:garmentId',
            },
          },
        },
      },
    },
  },
};

// ── Tab Icon ───────────────────────────────────────────────────────────────────
const TabIcon = ({ icon, label, focused }: { icon: any; label: string; focused: boolean }) => (
  <View style={[tabStyles.tabItem, focused && tabStyles.tabItemActive]}>
    <Feather name={icon} size={22} color={focused ? colors.primary : colors.textMuted} />
    <Text style={[tabStyles.tabLabel, focused && tabStyles.tabLabelActive]}>{label}</Text>
  </View>
);

// ── Wardrobe Stack ─────────────────────────────────────────────────────────────
function WardrobeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="WardrobeHome" component={WardrobeHomeScreen} />
      <Stack.Screen name="Upload" component={UploadScreen} />
      <Stack.Screen name="Classifying" component={ClassifyingScreen} />
      <Stack.Screen name="GarmentDetail" component={GarmentDetailScreen} />
      <Stack.Screen name="GarmentEdit" component={GarmentEditScreen} />
    </Stack.Navigator>
  );
}

// ── Outfit Stack ───────────────────────────────────────────────────────────────
function OutfitStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DailyLook" component={DailyLookScreen} />
      <Stack.Screen name="OccasionPicker" component={OccasionPickerScreen} />
      <Stack.Screen name="OutfitResult" component={OutfitResultScreen} />
      <Stack.Screen name="OutfitHistory" component={OutfitHistoryScreen} />
      <Stack.Screen name="SavedOutfits" component={SavedOutfitsScreen} />
    </Stack.Navigator>
  );
}

// ── Festival Stack ─────────────────────────────────────────────────────────────
function FestivalStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="FestivalHome" component={FestivalHomeScreen} />
      <Stack.Screen name="FestivalDetail" component={FestivalDetailScreen} />
      <Stack.Screen name="NavratriTracker" component={NavratriTrackerScreen} />
    </Stack.Navigator>
  );
}

// ── Settings Stack ─────────────────────────────────────────────────────────────
function SettingsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SettingsHome" component={SettingsHomeScreen} />
      <Stack.Screen name="NotificationPrefs" component={NotificationPrefsScreen} />
      <Stack.Screen name="Subscription" component={SubscriptionScreen} />
    </Stack.Navigator>
  );
}

// ── Main Tab Navigator ─────────────────────────────────────────────────────────
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false, tabBarStyle: tabStyles.tabBar }}
    >
      <Tab.Screen
        name="Wardrobe"
        component={WardrobeStack}
        options={{
          tabBarLabel: () => null,
          tabBarIcon: ({ focused }) => <TabIcon icon="archive" label="Wardrobe" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Outfit"
        component={OutfitStack}
        options={{
          tabBarLabel: () => null,
          tabBarIcon: ({ focused }) => <TabIcon icon="star" label="Outfits" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Festival"
        component={FestivalStack}
        options={{
          tabBarLabel: () => null,
          tabBarIcon: ({ focused }) => <TabIcon icon="calendar" label="Festivals" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsStack}
        options={{
          tabBarLabel: () => null,
          tabBarIcon: ({ focused }) => <TabIcon icon="settings" label="Settings" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

// ── Root Navigator ─────────────────────────────────────────────────────────────
export default function RootNavigation() {
  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {/* Auth Flow */}
        <Stack.Screen name="Auth" component={AuthStack} />

        {/* Onboarding Flow */}
        <Stack.Screen name="Onboarding" component={OnboardingStack} />

        {/* Main App */}
        <Stack.Screen name="Main" component={MainTabs} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Phone" component={PhoneScreen} />
      <Stack.Screen name="OTP" component={OTPScreen} />
    </Stack.Navigator>
  );
}

function OnboardingStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
      <Stack.Screen name="BodyType" component={BodyTypeScreen} />
      <Stack.Screen name="SkinTone" component={SkinToneScreen} />
      <Stack.Screen name="StyleAffinity" component={StyleAffinityScreen} />
      <Stack.Screen name="WardrobeIntro" component={WardrobeIntroScreen} />
    </Stack.Navigator>
  );
}

// ── Tab Styles ─────────────────────────────────────────────────────────────────
const tabStyles = StyleSheet.create({
  tabBar: {
    backgroundColor: 'rgba(255, 248, 241, 0.9)',
    borderTopColor: colors.outlineVariant + '33',
    borderTopWidth: 1,
    height: 72,
    paddingBottom: 8,
    shadowColor: '#554334', // Equivalent to rgba(85,67,52,0.08) base
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
    elevation: 20,
  },
  tabItem: {
    alignItems: 'center',
    paddingTop: 8,
    gap: 2,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  tabItemActive: { backgroundColor: colors.primary + '12' },
  tabLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '500' },
  tabLabelActive: { color: colors.primary, fontWeight: '700' },
});
