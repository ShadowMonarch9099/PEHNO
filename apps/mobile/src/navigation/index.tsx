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
import GapItemScreen from '../screens/commerce/GapItemScreen';
import GapReportScreen from '../screens/commerce/GapReportScreen';
import RoiScreen from '../screens/commerce/RoiScreen';
import ScanModeScreen from '../screens/commerce/ScanModeScreen';
import FestivalDetailScreen from '../screens/festival/FestivalDetailScreen';
import FestivalHomeScreen from '../screens/festival/FestivalHomeScreen';
import NavratriTrackerScreen from '../screens/festival/NavratriTrackerScreen';
import BodyTypeScreen from '../screens/onboarding/BodyTypeScreen';
import OtpScreen from '../screens/onboarding/OtpScreen';
import PhoneScreen from '../screens/onboarding/PhoneScreen';
import ProfileSetupScreen from '../screens/onboarding/ProfileSetupScreen';
import SkinToneScreen from '../screens/onboarding/SkinToneScreen';
import StyleAffinityScreen from '../screens/onboarding/StyleAffinityScreen';
import WardrobeIntroScreen from '../screens/onboarding/WardrobeIntroScreen';
import WelcomeScreen from '../screens/onboarding/WelcomeScreen';
import DailyLookScreen from '../screens/outfit/DailyLookScreen';
import OccasionPickerScreen from '../screens/outfit/OccasionPickerScreen';
import OutfitHistoryScreen from '../screens/outfit/OutfitHistoryScreen';
import OutfitResultScreen from '../screens/outfit/OutfitResultScreen';
import OOTDFeedScreen from '../screens/social/OOTDFeedScreen';
import ShareOutfitScreen from '../screens/social/ShareOutfitScreen';
import SettingsHomeScreen from '../screens/settings/SettingsHomeScreen';
import SubscriptionScreen from '../screens/settings/SubscriptionScreen';
import BookSessionScreen from '../screens/stylist/BookSessionScreen';
import ClientWardrobeScreen from '../screens/stylist/ClientWardrobeScreen';
import IncomingBookingsScreen from '../screens/stylist/IncomingBookingsScreen';
import MyBookingsScreen from '../screens/stylist/MyBookingsScreen';
import StylistApplyScreen from '../screens/stylist/StylistApplyScreen';
import StylistListScreen from '../screens/stylist/StylistListScreen';
import StylistProfileScreen from '../screens/stylist/StylistProfileScreen';
import TravelHomeScreen from '../screens/travel/TravelHomeScreen';
import TravelPlanScreen from '../screens/travel/TravelPlanScreen';
import TravelPlannerScreen from '../screens/travel/TravelPlannerScreen';
import GarmentDetailScreen from '../screens/wardrobe/GarmentDetailScreen';
import GarmentEditScreen from '../screens/wardrobe/GarmentEditScreen';
import UploadScreen from '../screens/wardrobe/UploadScreen';
import WardrobeHomeScreen from '../screens/wardrobe/WardrobeHomeScreen';
import { useAuthStore } from '../store';
import { colors } from '../theme';
import type {
  AuthStackParamList,
  FestivalStackParamList,
  MainTabParamList,
  OnboardingStackParamList,
  OutfitStackParamList,
  SettingsStackParamList,
  WardrobeStackParamList,
} from './types';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const OnboardingStack = createNativeStackNavigator<OnboardingStackParamList>();
const WardrobeStack = createNativeStackNavigator<WardrobeStackParamList>();
const OutfitStack = createNativeStackNavigator<OutfitStackParamList>();
const FestivalStack = createNativeStackNavigator<FestivalStackParamList>();
const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();
const Tabs = createBottomTabNavigator<MainTabParamList>();

const linking: LinkingOptions<MainTabParamList> = {
  prefixes: ['pehno://', 'https://app.pehno.in'],
  config: {
    screens: {
      Wardrobe: { screens: { WardrobeHome: 'wardrobe', GarmentDetail: 'wardrobe/:garmentId', Upload: 'wardrobe/upload', GapReport: 'commerce/gap-report', Roi: 'wardrobe/roi', ScanMode: 'commerce/scan' } },
      Outfits: { screens: { DailyLook: 'outfits/daily', OutfitResult: 'outfits/:occasion', OutfitHistory: 'outfits/history', OOTDFeed: 'outfits/feed', StylistList: 'stylists', StylistProfile: 'stylists/:stylistId', MyBookings: 'stylists/bookings', TravelHome: 'travel', TravelPlan: 'travel/:planId' } },
      Festivals: { screens: { FestivalHome: 'festivals', FestivalDetail: 'festivals/:slug', NavratriTracker: 'festivals/navratri' } },
      Settings: { screens: { SettingsHome: 'settings', Subscription: 'settings/subscription', StylistApply: 'settings/stylist', IncomingBookings: 'settings/stylist/bookings' } },
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
      <WardrobeStack.Screen name="GapReport" component={GapReportScreen} />
      <WardrobeStack.Screen name="GapItem" component={GapItemScreen} />
      <WardrobeStack.Screen name="Roi" component={RoiScreen} />
      <WardrobeStack.Screen name="ScanMode" component={ScanModeScreen} />
    </WardrobeStack.Navigator>
  );
}

function OutfitNavigator() {
  return (
    <OutfitStack.Navigator screenOptions={{ headerShown: false }}>
      <OutfitStack.Screen name="DailyLook" component={DailyLookScreen} />
      <OutfitStack.Screen name="OccasionPicker" component={OccasionPickerScreen} />
      <OutfitStack.Screen name="OutfitResult" component={OutfitResultScreen} />
      <OutfitStack.Screen name="OutfitHistory" component={OutfitHistoryScreen} />
      <OutfitStack.Screen name="ShareOutfit" component={ShareOutfitScreen} />
      <OutfitStack.Screen name="OOTDFeed" component={OOTDFeedScreen} />
      <OutfitStack.Screen name="StylistList" component={StylistListScreen} />
      <OutfitStack.Screen name="StylistProfile" component={StylistProfileScreen} />
      <OutfitStack.Screen name="BookSession" component={BookSessionScreen} />
      <OutfitStack.Screen name="MyBookings" component={MyBookingsScreen} />
      <OutfitStack.Screen name="TravelHome" component={TravelHomeScreen} />
      <OutfitStack.Screen name="TravelPlanner" component={TravelPlannerScreen} />
      <OutfitStack.Screen name="TravelPlan" component={TravelPlanScreen} />
    </OutfitStack.Navigator>
  );
}

function FestivalNavigator() {
  return (
    <FestivalStack.Navigator screenOptions={{ headerShown: false }}>
      <FestivalStack.Screen name="FestivalHome" component={FestivalHomeScreen} />
      <FestivalStack.Screen name="FestivalDetail" component={FestivalDetailScreen} />
      <FestivalStack.Screen name="NavratriTracker" component={NavratriTrackerScreen} />
    </FestivalStack.Navigator>
  );
}

function SettingsNavigator() {
  return (
    <SettingsStack.Navigator screenOptions={{ headerShown: false }}>
      <SettingsStack.Screen name="SettingsHome" component={SettingsHomeScreen} />
      <SettingsStack.Screen name="Subscription" component={SubscriptionScreen} />
      <SettingsStack.Screen name="StylistApply" component={StylistApplyScreen} />
      <SettingsStack.Screen name="IncomingBookings" component={IncomingBookingsScreen} />
      <SettingsStack.Screen name="ClientWardrobe" component={ClientWardrobeScreen} />
    </SettingsStack.Navigator>
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
      <Tabs.Screen name="Wardrobe" component={WardrobeNavigator} />
      <Tabs.Screen name="Outfits" component={OutfitNavigator} />
      <Tabs.Screen name="Festivals" component={FestivalNavigator} />
      <Tabs.Screen name="Settings" component={SettingsNavigator} />
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
