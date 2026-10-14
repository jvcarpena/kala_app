import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';

import { Card } from '@/components/card';
import { FocusChip } from '@/components/focus-chip';
import { HabitRow } from '@/components/habit-row';
import { Kala } from '@/components/kala/kala';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { useDomains, useHabitLogs, useHabits, useSettings } from '@/db/hooks';
import type { Habit } from '@/db/schema';
import { habitsLine } from '@/features/companion/copy';
import { isMet, isScheduled, parseSchedule } from '@/features/habits/logic';
import { useToday } from '@/lib/use-today';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export default function HabitsScreen() {
  const t = useTheme();
  const router = useRouter();
  const today = useToday();
  const domains = useDomains();
  const habits = useHabits();
  const logs = useHabitLogs();
  const settings = useSettings();

  const domainById = useMemo(() => new Map(domains.map((d) => [d.id, d])), [domains]);
  const voice = { language: settings.language, mode: settings.companion };

  const { scheduledToday, otherDays } = useMemo(() => {
    const visible = habits.filter((h) => !settings.hiddenDomainIds.includes(h.domainId));
    return {
      scheduledToday: visible.filter((h) => isScheduled(parseSchedule(h.schedule), today)),
      otherDays: visible.filter((h) => !isScheduled(parseSchedule(h.schedule), today)),
    };
  }, [habits, settings.hiddenDomainIds, today]);

  const done = scheduledToday.filter((h) => isMet(h, logs.get(h.id)?.get(today))).length;
  const line = habitsLine(voice, done, scheduledToday.length);
  const nothingYet = habits.length === 0;

  const renderList = (list: Habit[]) => (
    <Card>
      {list.map((h, i) => (
        <View key={h.id} style={i === 0 ? undefined : { borderTopWidth: 1, borderTopColor: t.colors.line }}>
          <HabitRow habit={h} domain={domainById.get(h.domainId)} logs={logs.get(h.id)} today={today} />
        </View>
      ))}
    </Card>
  );

  return (
    <Screen
      title="Habits"
      subtitle={scheduledToday.length > 0 ? `${done} of ${scheduledToday.length} done today` : 'Small things, every day'}
      headerRight={<FocusChip />}
      onAdd={() => router.push({ pathname: '/habit/[id]', params: { id: 'new' } })}
      addLabel="Add habit">
      {nothingYet ? (
        <View style={{ alignItems: 'center', paddingTop: spacing.lg, gap: spacing.sm }}>
          {settings.companion === 'off' ? null : <Kala pose="chill" size={170} />}
          <Text variant="title" style={{ textAlign: 'center' }}>
            No habits yet
          </Text>
          <Text muted style={{ textAlign: 'center', maxWidth: 300 }}>
            Add one with the + button. Try something small, like a glass of water or ten pages.
          </Text>
        </View>
      ) : (
        <>
          {line && settings.companion !== 'off' ? (
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md }}>
              <Kala pose={done === scheduledToday.length ? 'yay' : 'hello'} size={64} />
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
            </View>
          ) : null}

          {scheduledToday.length > 0 ? (
            <View style={{ gap: spacing.sm }}>
              <Text variant="headline" accessibilityRole="header">
                Today
              </Text>
              {renderList(scheduledToday)}
            </View>
          ) : (
            <Card style={{ padding: spacing.lg }}>
              <Text muted>No habits scheduled today. Enjoy the rest day.</Text>
            </Card>
          )}

          {otherDays.length > 0 ? (
            <View style={{ gap: spacing.sm }}>
              <Text variant="headline" accessibilityRole="header">
                Not scheduled today
              </Text>
              {renderList(otherDays)}
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}
