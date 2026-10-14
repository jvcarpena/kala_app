import { useRouter } from 'expo-router';
import { CheckCircle, Pause, Play } from 'phosphor-react-native';
import { Pressable, View } from 'react-native';

import { useSettings, useTasks } from '@/db/hooks';
import { formatClock, remainingMs, spokenClock } from '@/features/focus-timer/timer';
import { useNow } from '@/lib/use-now';
import { fonts, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { Text } from './text';

/**
 * Stays above the tab bar while a timer exists, so you can leave the timer screen and come back.
 * Tap to reopen it. Leaves room for the + button when a screen has one.
 */
export function TimerPill({ clearOfAddButton }: { clearOfAddButton: boolean }) {
  const t = useTheme();
  const router = useRouter();
  const { activeTimer: timer } = useSettings();
  const tasks = useTasks();
  const now = useNow(timer?.status === 'running');
  if (!timer) return null;

  const title = tasks.find((x) => x.id === timer.taskId)?.title ?? 'Free focus';
  const left = remainingMs(timer, now);
  const label = timer.phase === 'break' ? 'Break' : title;
  const Glyph = timer.status === 'finished' ? CheckCircle : timer.status === 'paused' ? Pause : Play;
  const state = timer.status === 'finished' ? 'finished' : timer.status === 'paused' ? 'paused' : 'running';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${timer.phase === 'break' ? 'Break' : `Focus on ${title}`}, ${state}, ${spokenClock(left)} left. Open timer`}
      onPress={() => router.push({ pathname: '/focus/[taskId]', params: { taskId: 'active' } })}
      style={{
        position: 'absolute',
        left: spacing.lg,
        right: clearOfAddButton ? spacing.lg + 56 + spacing.md : spacing.lg,
        bottom: spacing.lg,
        height: 56,
        borderRadius: radius.pill,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingHorizontal: spacing.lg,
        backgroundColor: t.colors.ink,
        ...(t.scheme === 'dark' ? { borderWidth: 1, borderColor: t.colors.line } : { elevation: 4 }),
      }}>
      <Glyph size={20} weight="fill" color={t.colors.onInk} />
      <Text
        style={{ fontFamily: fonts.display, fontSize: 18, color: t.colors.onInk, fontVariant: ['tabular-nums'] }}
        importantForAccessibility="no">
        {formatClock(left)}
      </Text>
      <View style={{ flex: 1 }}>
        <Text variant="label" numberOfLines={1} style={{ color: t.colors.onInk }}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
