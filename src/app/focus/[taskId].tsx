import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CaretDown } from 'phosphor-react-native';
import { useEffect } from 'react';
import { Alert, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { DomainIcon } from '@/components/domain-icon';
import { FocusRing } from '@/components/focus-ring';
import { Kala } from '@/components/kala/kala';
import type { KalaPose } from '@/components/kala/poses';
import { Text } from '@/components/text';
import { db } from '@/db/client';
import { useDomains, useSettings, useTasks } from '@/db/hooks';
import { setTaskDone } from '@/db/repos/tasks';
import { setSetting } from '@/db/settings';
import { timerLine, type TimerLineState } from '@/features/companion/copy';
import { endTimer, pauseActive, resumeActive, startFocus, startNext } from '@/features/focus-timer/actions';
import {
  BREAK_LENGTHS,
  FOCUS_LENGTHS,
  elapsedFraction,
  formatClock,
  remainingMs,
  spokenClock,
  MINUTE,
} from '@/features/focus-timer/timer';
import { haptic } from '@/lib/haptics';
import { useNow } from '@/lib/use-now';
import { domainColors } from '@/theme/domain-colors';
import { fonts, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const KEEP_AWAKE_TAG = 'kala-focus-timer';

export default function FocusScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { taskId } = useLocalSearchParams<{ taskId: string }>();

  const settings = useSettings();
  const { activeTimer: timer, pomodoro } = settings;
  const domains = useDomains();
  const tasks = useTasks();
  const now = useNow(timer?.status === 'running');
  const voice = { language: settings.language, mode: settings.companion };

  // 'none' = free focus, 'active' = "open whatever is running" (from the pill or an alert).
  const requested = taskId && taskId !== 'none' && taskId !== 'active' ? taskId : null;
  const task = tasks.find((x) => x.id === (timer ? timer.taskId : requested));
  const domainId =
    timer?.domainId ?? task?.domainId ?? (domains.find((d) => !settings.hiddenDomainIds.includes(d.id)) ?? domains[0])?.id;
  const domain = domains.find((d) => d.id === domainId);
  const colors = domainColors(t, domain?.color ?? '');
  const otherTaskRunning = !!timer && requested !== null && requested !== timer.taskId;

  // Keep the screen on while a phase is counting down.
  const running = timer?.status === 'running';
  useEffect(() => {
    if (!running) return;
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
    return () => {
      deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
    };
  }, [running]);

  const isBreak = timer?.phase === 'break';
  const left = timer ? remainingMs(timer, now) : pomodoro.focusMin * MINUTE;
  const elapsed = timer ? elapsedFraction(timer, now) : 0;
  const background = timer && !isBreak ? colors.soft : t.colors.bg;
  // A smaller ring while choosing lengths leaves room for the options and Kala.
  const ringSize = Math.min(width - spacing.xxl * 2, timer ? 300 : 220);
  // A 1 minute option exists only in development, so a full phase can be tried quickly.
  const focusLengths: readonly number[] = __DEV__ ? [1, ...FOCUS_LENGTHS] : FOCUS_LENGTHS;
  const breakLengths: readonly number[] = __DEV__ ? [1, ...BREAK_LENGTHS] : BREAK_LENGTHS;

  const lineState: TimerLineState | null = !timer
    ? null
    : timer.status === 'paused'
      ? 'paused'
      : timer.status === 'finished'
        ? isBreak
          ? 'breakDone'
          : 'focusDone'
        : isBreak
          ? 'breakRunning'
          : 'running';
  const line = lineState ? timerLine(voice, lineState) : timerLine(voice, 'running');
  const pose: KalaPose = !timer
    ? 'focus'
    : timer.status === 'finished'
      ? isBreak
        ? 'hello'
        : 'yay'
      : timer.status === 'paused'
        ? 'sleepy'
        : isBreak
          ? 'chill'
          : 'focus';

  const heading = !timer
    ? 'Focus'
    : isBreak
      ? 'Break'
      : timer.round > 1
        ? `Focus · round ${timer.round}`
        : 'Focus';
  const title = timer && isBreak ? 'Take a short break' : (task?.title ?? 'Free focus');
  const sub = !timer
    ? `${domain?.name ?? ''} · break of ${pomodoro.breakMin} min after this`
    : isBreak
      ? `Next: round ${timer.round + 1}`
      : `${domain?.name ?? ''} · ${timer.plannedMin} min`;

  const leaveAndClear = async () => {
    if (timer) await endTimer(db, timer);
    router.back();
  };

  const endEarly = () => {
    if (!timer) return;
    // Only a focus phase with time already spent needs a warning.
    if (timer.phase === 'focus' && timer.status !== 'finished' && elapsed > 0) {
      Alert.alert('End this session?', "It won't count toward your activity.", [
        { text: 'Keep going', style: 'cancel' },
        { text: 'End session', style: 'destructive', onPress: leaveAndClear },
      ]);
      return;
    }
    leaveAndClear();
  };

  const controls = () => {
    if (!timer) {
      return (
        <Button
          label="Start focus"
          disabled={!domainId}
          onPress={() => {
            if (domainId) startFocus(db, { taskId: task?.id ?? null, domainId, plannedMin: pomodoro.focusMin }).catch(() => {});
          }}
        />
      );
    }
    if (timer.status === 'finished') {
      const nextLabel = isBreak ? 'Next round' : `Start break · ${pomodoro.breakMin} min`;
      return (
        <View style={{ gap: spacing.sm }}>
          <Button label={nextLabel} onPress={() => startNext(db, timer, pomodoro).catch(() => {})} />
          {!isBreak && task && task.status === 'todo' ? (
            <Button
              variant="secondary"
              label="Mark task done"
              onPress={() => {
                haptic('success');
                setTaskDone(db, task.id, true);
              }}
            />
          ) : null}
          <Button variant="secondary" label="Done" onPress={leaveAndClear} />
        </View>
      );
    }
    return (
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {timer.status === 'running' ? (
          <Button grow label="Pause" onPress={() => pauseActive(db, timer).catch(() => {})} />
        ) : (
          <Button grow label="Resume" onPress={() => resumeActive(db, timer).catch(() => {})} />
        )}
        <Button grow variant="secondary" label="End" onPress={endEarly} />
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: background }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: insets.top + spacing.sm,
          paddingHorizontal: spacing.sm,
        }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={timer ? 'Minimise timer. It keeps running' : 'Close'}
          onPress={() => router.back()}
          style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
          <CaretDown size={24} color={t.colors.ink} />
        </Pressable>
        <Text variant="headline" accessibilityRole="header">
          {heading}
        </Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          alignItems: 'center',
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.lg,
          paddingBottom: spacing.lg,
          gap: spacing.lg,
        }}>
        <FocusRing size={ringSize} elapsed={elapsed} color={colors.main} track={t.colors.surface}>
          <View style={{ alignItems: 'center' }}>
            <Text
              accessibilityRole="timer"
              accessibilityLabel={`${spokenClock(left)} ${timer?.status === 'finished' ? 'finished' : 'left'}`}
              style={{
                fontFamily: fonts.display,
                fontSize: Math.round(ringSize * 0.22),
                lineHeight: Math.round(ringSize * 0.24),
                fontVariant: ['tabular-nums'],
                color: t.colors.ink,
              }}>
              {formatClock(left)}
            </Text>
            <Text variant="caption" muted>
              {`of ${timer ? timer.plannedMin : pomodoro.focusMin} min`}
            </Text>
          </View>
        </FocusRing>

        <View style={{ alignItems: 'center', gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {!isBreak ? <DomainIcon name={domain?.icon ?? 'Tag'} size={20} color={colors.main} /> : null}
            <Text variant="title" style={{ textAlign: 'center', flexShrink: 1 }}>
              {title}
            </Text>
          </View>
          <Text muted style={{ textAlign: 'center' }}>
            {sub}
          </Text>
          {otherTaskRunning ? (
            <Text variant="caption" style={{ textAlign: 'center', color: t.colors.danger }}>
              A timer is already running. Finish or end it before starting another.
            </Text>
          ) : null}
        </View>

        {!timer ? (
          <View style={{ alignSelf: 'stretch', gap: spacing.md }}>
            <View style={{ gap: spacing.sm }}>
              <Text variant="label">Focus length</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {focusLengths.map((m) => (
                  <Chip
                    key={m}
                    label={`${m} min`}
                    selected={pomodoro.focusMin === m}
                    onPress={() => setSetting(db, 'pomodoro', { ...pomodoro, focusMin: m })}
                  />
                ))}
              </View>
            </View>
            <View style={{ gap: spacing.sm }}>
              <Text variant="label">Break length</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {breakLengths.map((m) => (
                  <Chip
                    key={m}
                    label={`${m} min`}
                    selected={pomodoro.breakMin === m}
                    onPress={() => setSetting(db, 'pomodoro', { ...pomodoro, breakMin: m })}
                  />
                ))}
              </View>
            </View>
          </View>
        ) : null}

        <View style={{ flex: 1 }} />

        {settings.companion !== 'off' ? (
          <View style={{ alignSelf: 'stretch', flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md }}>
            <Kala pose={pose} size={84} domain={isBreak ? undefined : (domain?.color as 'work' | 'study' | 'health' | 'life' | undefined)} />
            {settings.companion === 'chatty' && line ? (
              <View
                style={{
                  flex: 1,
                  backgroundColor: t.colors.surface,
                  borderRadius: radius.card,
                  borderBottomLeftRadius: 4,
                  padding: spacing.md,
                }}>
                <Text>{line}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

      </ScrollView>

      {/* Controls stay pinned so Start, Pause and End are always on screen. */}
      <View style={{ paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: Math.max(insets.bottom, spacing.lg) }}>
        {controls()}
      </View>
    </View>
  );
}
