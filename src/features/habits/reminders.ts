
import type { CompanionMode, Language } from '@/db/settings';
import { habitReminderBody } from '@/features/companion/copy';
import { ensurePermission, loadNotifications, notificationsSupported } from '@/lib/notifications';

import { parseTime, toExpoWeekday } from './logic';

// Habit reminders: one weekly local notification per scheduled day. See lib/notifications.ts
// for why expo-notifications is loaded lazily.

export const remindersSupported = notificationsSupported;

const CHANNEL_ID = 'habits';
const CHANNEL = { id: CHANNEL_ID, name: 'Habit reminders', importance: 'default' } as const;
const prefix = (habitId: string) => `habit:${habitId}:`;

/** Show reminders as a banner even while the app is open. Call once at startup. */
export async function configureNotifications(): Promise<void> {
  if (!remindersSupported) return;
  const N = await loadNotifications();
  N.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Calls `onOpen` with the notification's `screen` ('habits' or 'focus') when the user taps one.
 * Returns a function that stops listening.
 */
export async function onNotificationOpened(onOpen: (screen: string | undefined) => void): Promise<() => void> {
  if (!remindersSupported) return () => {};
  const N = await loadNotifications();
  const sub = N.addNotificationResponseReceivedListener((response) => {
    const screen = response.notification.request.content.data?.screen;
    onOpen(typeof screen === 'string' ? screen : undefined);
  });
  return () => sub.remove();
}

export async function cancelHabitReminders(habitId: string): Promise<void> {
  if (!remindersSupported) return;
  const N = await loadNotifications();
  const scheduled = await N.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled.filter((n) => n.identifier.startsWith(prefix(habitId))).map((n) => N.cancelScheduledNotificationAsync(n.identifier)),
  );
}

export type ReminderResult = 'scheduled' | 'cleared' | 'denied' | 'unsupported';

type ReminderHabit = { id: string; name: string; schedule: number[]; reminderTime: string | null };

/**
 * Makes the device's reminders match the habit: one weekly notification per scheduled
 * weekday at the chosen time. Always clears the old ones first, so it's safe to call on
 * every save. Returns 'denied' if notifications are off, 'unsupported' in Expo Go on Android.
 */
export async function syncHabitReminders(
  habit: ReminderHabit,
  voice: { language: Language; mode: CompanionMode },
): Promise<ReminderResult> {
  if (!remindersSupported) return 'unsupported';
  const N = await loadNotifications();
  await cancelHabitReminders(habit.id);

  const time = parseTime(habit.reminderTime);
  if (!time || habit.schedule.length === 0) return 'cleared';
  if (!(await ensurePermission(N, CHANNEL))) return 'denied';

  await Promise.all(
    habit.schedule.map((day) =>
      N.scheduleNotificationAsync({
        identifier: `${prefix(habit.id)}${day}`,
        content: { title: habit.name, body: habitReminderBody(voice), data: { screen: 'habits' } },
        trigger: {
          type: N.SchedulableTriggerInputTypes.WEEKLY,
          weekday: toExpoWeekday(day),
          hour: time.hour,
          minute: time.minute,
          channelId: CHANNEL_ID,
        },
      }),
    ),
  );
  return 'scheduled';
}
