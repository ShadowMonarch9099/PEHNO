import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigation from './src/navigation';
import { listenForPushOpens, registerForPush } from './src/services/push';
import { useAuthStore } from './src/store';
import { colors } from './src/theme';

export default function App() {
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    void bootstrap();
    return listenForPushOpens();
  }, [bootstrap]);

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
