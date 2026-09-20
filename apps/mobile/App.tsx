import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useI18nStore } from './src/i18n';
import RootNavigation from './src/navigation';
import { listenForPushOpens, registerForPush } from './src/services/push';
import { useAuthStore } from './src/store';
import { colors } from './src/theme';

export default function App() {
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const status = useAuthStore((s) => s.status);
  const userLang = useAuthStore((s) => s.user?.language);
  const loadLanguage = useI18nStore((s) => s.load);
  const setLanguage = useI18nStore((s) => s.setLanguage);

  useEffect(() => {
    void loadLanguage().then(bootstrap);
    return listenForPushOpens();
  }, [bootstrap, loadLanguage]);

  // The profile's language wins once we know it (keeps devices in sync).
  useEffect(() => {
    if (userLang && userLang !== useI18nStore.getState().language) void setLanguage(userLang);
  }, [userLang, setLanguage]);

  // Register the push token once signed in (token is stored on the user).
  useEffect(() => {
    if (status === 'signedIn') void registerForPush();
  }, [status]);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" backgroundColor={colors.background} />
      <RootNavigation />
    </SafeAreaProvider>
  );
}
