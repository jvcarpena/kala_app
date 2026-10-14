import { useRouter } from 'expo-router';
import { CheckCircle, Pause, Play } from 'phosphor-react-native';

import { useSettings, useTasks } from '@/db/hooks';
import { formatClock, remainingMs, spokenClock } from '@/features/focus-timer/timer';
import { useNow } from '@/lib/use-now';
import { useTheme } from '@/theme/use-theme';

import { FloatingPill } from './floating-pill';

/**
 * Stays above the tab bar while a focus timer exists, so you can leave the timer screen and
 * come back. Tap to reopen it.
 */
export function TimerPill({ slot, clearOfAddButton }: { slot: number; clearOfAddButton: boolean }) {
  const t = useTheme();
  const router = useRouter();
  const { activeTimer: timer } = useSettings();
  const tasks = useTasks();
  const now = useNow(timer?.status === 'running');
  if (!timer) return null;

  const title = tasks.find((x) => x.id === timer.taskId)?.title ?? 'Free focus';
  const left = remainingMs(timer, now);
  const Glyph = timer.status === 'finished' ? CheckCircle : timer.status === 'paused' ? Pause : Play;

  return (
    <FloatingPill
      slot={slot}
      clearOfAddButton={clearOfAddButton}
      icon={<Glyph size={20} weight="fill" color={t.colors.onInk} />}
      value={formatClock(left)}
      label={timer.phase === 'break' ? 'Break' : title}
      accessibilityLabel={`${timer.phase === 'break' ? 'Break' : `Focus on ${title}`}, ${timer.status}, ${spokenClock(left)} left. Open timer`}
      onPress={() => router.push({ pathname: '/focus/[taskId]', params: { taskId: 'active' } })}
    />
  );
}
