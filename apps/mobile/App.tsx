/**
 * PEHNO App Root
 */
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import RootNavigation from './src/navigation';
import { useUserStore } from './src/store';
import { userApi } from './src/services/api';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function App() {
  const { setUser, setTokens } = useUserStore();

  useEffect(() => {
    // Restore auth session on app start
    restoreSession();
    // Register for push notifications
    registerForPushNotifications();
  }, []);

  const restoreSession = async () => {
    try {
      const accessToken = await SecureStore.getItemAsync('access_token');
      if (accessToken) {
        setTokens(accessToken);
        const res = await userApi.getMe();
        setUser(res.data);
      }
    } catch {
      // Token expired or invalid — user will need to login
    }
  };

  const registerForPushNotifications = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === 'granted') {
        const token = await Notifications.getExpoPushTokenAsync();
        // Save FCM token to backend
        await userApi.updateMe({ fcm_token: token.data });
      }
    } catch {}
  };

  return (
    <>
      <StatusBar style="dark" backgroundColor={colors.background} />
      <RootNavigation />
    </>
  );
}

// Colors needed here
const colors = { background: '#FDF8F0' };
