/**
 * Push notifications: register the device token with the API and report opens.
 *
 * Without a Firebase project (google-services.json / APNs key) token retrieval
 * throws on device — we swallow that so the rest of the app is unaffected.
 */
import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';
import { api } from './api';
import { usersApi } from './users';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function registerForPush(): Promise<string | null> {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    const status = existing === 'granted' ? existing : (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return null;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Daily looks & festival alerts',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    const token = (await Notifications.getDevicePushTokenAsync()).data as string; // FCM / APNs token
    await usersApi.update({ fcm_token: token });
    return token;
  } catch {
    return null; // no Firebase config yet, simulator, or permission issue
  }
}

type PushData = { url?: string; notification_id?: string };

async function handleResponse(response: Notifications.NotificationResponse) {
  const data = (response.notification.request.content.data ?? {}) as PushData;
  if (data.notification_id) {
    api.post(`/notifications/${data.notification_id}/opened`).catch(() => undefined);
  }
  if (data.url) {
    Linking.openURL(data.url).catch(() => undefined);
  }
}

/** Call once at app start. Returns an unsubscribe function. */
export function listenForPushOpens(): () => void {
  // App launched by tapping a notification
  Notifications.getLastNotificationResponseAsync()
    .then((r) => r && handleResponse(r))
    .catch(() => undefined);
  const sub = Notifications.addNotificationResponseReceivedListener((r) => void handleResponse(r));
  return () => sub.remove();
}
