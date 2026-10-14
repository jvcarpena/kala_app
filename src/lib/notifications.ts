import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

// Local notifications only: scheduled on the device, no server, no push token.
//
// expo-notifications throws the moment it is imported inside Expo Go on Android (SDK 53+),
// so it is only ever loaded lazily, and only where it works: the installed app, a
// development build, or iOS. In Expo Go on Android, notifications are simply unavailable.

export const notificationsSupported = !(
  Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient
);

export const loadNotifications = () => import('expo-notifications');

export type NotificationsModule = Awaited<ReturnType<typeof loadNotifications>>;

/**
 * True when notifications may be shown. Creates the Android channel first (Android 13+ won't
 * show the permission prompt without one), asks once, and never nags if the user said no.
 */
export async function ensurePermission(
  N: NotificationsModule,
  channel: { id: string; name: string; importance: 'default' | 'high' },
): Promise<boolean> {
  if (Platform.OS === 'android') {
    await N.setNotificationChannelAsync(channel.id, {
      name: channel.name,
      importance: channel.importance === 'high' ? N.AndroidImportance.HIGH : N.AndroidImportance.DEFAULT,
    });
  }
  const current = await N.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await N.requestPermissionsAsync()).granted;
}
