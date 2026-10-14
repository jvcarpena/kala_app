import type { CompanionMode, Language } from '@/db/settings';
import { timerAlert } from '@/features/companion/copy';
import { ensurePermission, loadNotifications, notificationsSupported } from '@/lib/notifications';

import type { ActiveTimer } from './timer';

// One local notification at the moment the running phase ends, so you hear about it even with the
// app in the background or the screen off. It's replaced or cancelled whenever the timer changes.
// Unavailable in Expo Go on Android; the timer itself still works there.

const ID = 'focus-timer';
const CHANNEL = { id: 'timer', name: 'Focus timer', importance: 'high' } as const;

export async function cancelTimerAlert(): Promise<void> {
  if (!notificationsSupported) return;
  const N = await loadNotifications();
  await N.cancelScheduledNotificationAsync(ID);
}

/** Schedules the end-of-phase alert for a running timer. Does nothing if it isn't running. */
export async function scheduleTimerAlert(
  timer: ActiveTimer,
  voice: { language: Language; mode: CompanionMode },
): Promise<void> {
  if (!notificationsSupported || timer.status !== 'running' || timer.endsAt <= Date.now()) return;
  const N = await loadNotifications();
  await N.cancelScheduledNotificationAsync(ID);
  if (!(await ensurePermission(N, CHANNEL))) return;
  const { title, body } = timerAlert(voice, timer.phase);
  await N.scheduleNotificationAsync({
    identifier: ID,
    content: { title, body, data: { screen: 'focus' } },
    trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: timer.endsAt, channelId: CHANNEL.id },
  });
}
