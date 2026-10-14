import { useRouter } from 'expo-router';
import { Flame } from 'phosphor-react-native';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { db } from '@/db/client';
import { addToHabitLog, setHabitLog } from '@/db/repos/habits';
import type { Domain, Habit } from '@/db/schema';
import {
  computeStreaks,
  describeSchedule,
  isMet,
  parseSchedule,
  progressLabel,
  trimNumber,
  weekDots,
  type LogMap,
} from '@/features/habits/logic';
import { haptic } from '@/lib/haptics';
import { domainColors } from '@/theme/domain-colors';
import { fonts, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { AmountModal } from './amount-modal';
import { Checkbox } from './checkbox';
import { DomainIcon } from './domain-icon';
import { Text } from './text';
import { WeekDots } from './week-dots';

type Props = {
  habit: Habit;
  domain: Domain | undefined;
  logs: LogMap | undefined;
  today: string;
};

const NO_LOGS: LogMap = new Map();

/**
 * One habit: tap the left control to log today, tap the rest to edit.
 * Yes/no habits get a checkbox. Count habits get a counter: tap adds one, long-press
 * types an exact amount.
 */
export function HabitRow({ habit, domain, logs = NO_LOGS, today }: Props) {
  const t = useTheme();
  const router = useRouter();
  const [amountOpen, setAmountOpen] = useState(false);
  const colors = domainColors(t, domain?.color ?? '');

  const schedule = useMemo(() => parseSchedule(habit.schedule), [habit.schedule]);
  const streaks = useMemo(() => computeStreaks(habit, schedule, logs, today), [habit, schedule, logs, today]);
  const dots = useMemo(() => weekDots(habit, schedule, logs, today), [habit, schedule, logs, today]);

  const value = logs.get(today) ?? 0;
  const met = isMet(habit, value);
  const isCount = habit.type !== 'check';
  const weekDone = dots.filter((d) => d.state === 'done').length;
  const weekScheduled = dots.filter((d) => d.state !== 'off').length;

  const bump = async (delta: number) => {
    const before = value;
    const next = await addToHabitLog(db, habit.id, today, delta);
    haptic(!isMet(habit, before) && isMet(habit, next) ? 'success' : 'light');
  };

  const editLabel =
    `Edit ${habit.name}. ${describeSchedule(schedule)}. ` +
    `${streaks.current} ${streaks.current === 1 ? 'day' : 'days'} streak. ` +
    `${weekDone} of ${weekScheduled} days done this week.`;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: spacing.xs, paddingRight: spacing.md }}>
      {isCount ? (
        <Pressable
          accessibilityRole="adjustable"
          accessibilityLabel={`${habit.name}: ${progressLabel(habit, value)} today`}
          accessibilityHint="Double tap to add one. Long press to type an amount."
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) => bump(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
          onPress={() => bump(1)}
          onLongPress={() => {
            haptic('select');
            setAmountOpen(true);
          }}
          style={{ width: 56, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
          <View
            style={{
              minWidth: 48,
              height: 40,
              paddingHorizontal: 6,
              borderRadius: radius.control,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: met ? colors.main : colors.soft,
            }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 15, color: met ? t.colors.onInk : t.colors.ink, fontVariant: ['tabular-nums'] }}>
              {`${trimNumber(value)}/${trimNumber(habit.target)}`}
            </Text>
          </View>
        </Pressable>
      ) : (
        <Checkbox
          checked={met}
          color={colors.main}
          label={met ? `${habit.name}, done today. Mark as not done` : `Mark ${habit.name} as done today`}
          onToggle={() => {
            setHabitLog(db, habit.id, today, met ? 0 : 1);
          }}
        />
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={editLabel}
        onPress={() => router.push({ pathname: '/habit/[id]', params: { id: habit.id } })}
        style={{ flex: 1, minHeight: 64, justifyContent: 'center', paddingVertical: spacing.sm, gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <DomainIcon name={domain?.icon ?? 'Tag'} size={16} color={colors.main} />
          <Text style={{ flexShrink: 1 }}>{habit.name}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <WeekDots dots={dots} color={colors.main} />
          {isCount ? (
            <Text variant="caption" muted numberOfLines={1} style={{ flexShrink: 1 }}>
              {progressLabel(habit, value)}
            </Text>
          ) : null}
        </View>
      </Pressable>

      <View
        style={{ flexDirection: 'row', alignItems: 'center', gap: 3, minWidth: 40, justifyContent: 'flex-end' }}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants">
        <Flame size={18} weight={streaks.current > 0 ? 'fill' : 'regular'} color={streaks.current > 0 ? t.colors.streak : t.colors.inkMuted} />
        <Text variant="label" style={{ color: streaks.current > 0 ? t.colors.streak : t.colors.inkMuted }}>
          {streaks.current}
        </Text>
      </View>

      {isCount ? (
        <AmountModal
          visible={amountOpen}
          title={habit.name}
          initial={value}
          unit={habit.unit}
          onClose={() => setAmountOpen(false)}
          onSubmit={(n) => {
            setAmountOpen(false);
            setHabitLog(db, habit.id, today, n);
          }}
        />
      ) : null}
    </View>
  );
}
