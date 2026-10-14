import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import { EyeSlash } from 'phosphor-react-native';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Card } from '@/components/card';
import { EnergySegment } from '@/components/energy';
import { FocusChip } from '@/components/focus-chip';
import { HabitStrip } from '@/components/habit-strip';
import { InboxButton } from '@/components/inbox-button';
import { Kala } from '@/components/kala/kala';
import { OverdueCard } from '@/components/overdue-card';
import { Screen } from '@/components/screen';
import { TaskList } from '@/components/task-list';
import { Text } from '@/components/text';
import { useActivityEvents, useDomains, useHabitLogs, useHabits, useSettings, useTasks } from '@/db/hooks';
import { greeting, todayLine } from '@/features/companion/copy';
import { isScheduled, parseSchedule } from '@/features/habits/logic';
import { bucketForToday, filterTasks, type EnergyFilter } from '@/features/tasks/logic';
import { keyToDate } from '@/lib/dates';
import { useToday } from '@/lib/use-today';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export default function TodayScreen() {
  const t = useTheme();
  const router = useRouter();
  const today = useToday();
  const domains = useDomains();
  const tasks = useTasks();
  const settings = useSettings();
  const habits = useHabits();
  const habitLogs = useHabitLogs();
  const activity = useActivityEvents();
  const [energy, setEnergy] = useState<EnergyFilter>('any');

  const domainById = useMemo(() => new Map(domains.map((d) => [d.id, d])), [domains]);
  const voice = { language: settings.language, mode: settings.companion };

  const { overdue, dueToday, doneToday } = useMemo(() => {
    // Focus Mode hides whole domains everywhere; the energy filter only narrows what's still to do.
    const visible = filterTasks(tasks, { hiddenDomainIds: settings.hiddenDomainIds });
    const b = bucketForToday(visible, today);
    return {
      overdue: filterTasks(b.overdue, { energy }),
      dueToday: filterTasks(b.dueToday, { energy }),
      doneToday: b.doneToday,
    };
  }, [tasks, settings.hiddenDomainIds, today, energy]);

  const habitsToday = useMemo(
    () =>
      habits.filter(
        (h) => !settings.hiddenDomainIds.includes(h.domainId) && isScheduled(parseSchedule(h.schedule), today),
      ),
    [habits, settings.hiddenDomainIds, today],
  );
  const hiddenNames = domains.filter((d) => settings.hiddenDomainIds.includes(d.id)).map((d) => d.name);
  const openCount = overdue.length + dueToday.length;
  const showKala = settings.companion !== 'off';

  return (
    <Screen
      title="Today"
      subtitle={`${format(keyToDate(today), 'EEEE d MMMM')} · ${activity.filter((e) => e.date === today).length} done`}
      headerRight={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <FocusChip />
          <InboxButton />
        </View>
      }
      onAdd={() => router.push({ pathname: '/capture', params: { dueDate: today } })}
      addLabel="Capture">
      {showKala ? (
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md }}>
          <Kala pose={openCount === 0 && doneToday.length > 0 ? 'yay' : 'hello'} size={72} />
          {settings.companion === 'chatty' ? (
            <View
              style={{
                flex: 1,
                backgroundColor: t.colors.surface,
                borderRadius: radius.card,
                borderBottomLeftRadius: 4,
                padding: spacing.md,
              }}>
              <Text variant="headline">{greeting(voice, new Date().getHours())}</Text>
              <Text muted>{todayLine(openCount, doneToday.length, voice)}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <OverdueCard overdue={overdue} today={today} language={settings.language} companion={settings.companion} />

      <EnergySegment
        label="Filter by energy"
        value={energy}
        onChange={setEnergy}
        options={['any', 'low', 'medium', 'high'] as EnergyFilter[]}
      />

      <View style={{ gap: spacing.sm }}>
        <Text variant="headline" accessibilityRole="header">
          To do today
        </Text>
        {dueToday.length > 0 ? (
          <TaskList tasks={dueToday} domainById={domainById} today={today} showDue={false} />
        ) : (
          <Card style={{ padding: spacing.lg }}>
            <Text muted>
              {energy === 'any'
                ? 'Nothing due today. Add a task with the + button.'
                : 'No tasks match this energy level today. Try Any.'}
            </Text>
          </Card>
        )}
      </View>

      {habitsToday.length > 0 ? (
        <HabitStrip habits={habitsToday} domainById={domainById} logs={habitLogs} today={today} />
      ) : null}

      {doneToday.length > 0 ? (
        <View style={{ gap: spacing.sm }}>
          <Text variant="headline" accessibilityRole="header">
            {`Done today · ${doneToday.length}`}
          </Text>
          <TaskList tasks={doneToday} domainById={domainById} today={today} showDue={false} />
        </View>
      ) : null}

      {hiddenNames.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${hiddenNames.join(' and ')} hidden by Focus Mode. Change Focus Mode`}
          onPress={() => router.push('/focus-mode')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 48 }}>
          <EyeSlash size={18} color={t.colors.inkMuted} />
          <Text variant="caption" muted style={{ flex: 1 }}>
            {`${hiddenNames.join(', ')} hidden by ${settings.focusPreset}. Tap to change.`}
          </Text>
        </Pressable>
      ) : null}
    </Screen>
  );
}
