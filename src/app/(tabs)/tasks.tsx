import { useRouter } from 'expo-router';
import { CaretDown, CaretRight } from 'phosphor-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Chip } from '@/components/chip';
import { DomainIcon } from '@/components/domain-icon';
import { EnergySegment } from '@/components/energy';
import { FocusChip } from '@/components/focus-chip';
import { Kala } from '@/components/kala/kala';
import { Screen } from '@/components/screen';
import { TaskList } from '@/components/task-list';
import { Text } from '@/components/text';
import { useDomains, useSettings, useTasks } from '@/db/hooks';
import { emptyTasks } from '@/features/companion/copy';
import { filterTasks, groupOpenByDomain, type EnergyFilter } from '@/features/tasks/logic';
import { useToday } from '@/lib/use-today';
import { domainColors } from '@/theme/domain-colors';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const RECENTLY_DONE = 8;

export default function TasksScreen() {
  const t = useTheme();
  const router = useRouter();
  const today = useToday();
  const domains = useDomains();
  const tasks = useTasks();
  const settings = useSettings();
  const [energy, setEnergy] = useState<EnergyFilter>('any');
  const [domainId, setDomainId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const domainById = useMemo(() => new Map(domains.map((d) => [d.id, d])), [domains]);
  const voice = { language: settings.language, mode: settings.companion };

  const { groups, recentlyDone } = useMemo(() => {
    const visible = filterTasks(tasks, { hiddenDomainIds: settings.hiddenDomainIds, domainId });
    const open = filterTasks(visible, { energy });
    return {
      groups: groupOpenByDomain(open, domains).filter((g) => g.tasks.length > 0),
      recentlyDone: visible
        .filter((x) => x.status === 'done')
        .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
        .slice(0, RECENTLY_DONE),
    };
  }, [tasks, domains, settings.hiddenDomainIds, domainId, energy]);

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const visibleDomains = domains.filter((d) => !settings.hiddenDomainIds.includes(d.id));
  const empty = groups.length === 0;
  const emptyCopy = emptyTasks(voice, domainId ? domainById.get(domainId)?.name : undefined);
  const openTotal = groups.reduce((n, g) => n + g.tasks.length, 0);

  return (
    <Screen
      title="Tasks"
      subtitle={`${openTotal} to do`}
      headerRight={<FocusChip />}
      onAdd={() => router.push({ pathname: '/capture', params: domainId ? { domainId } : {} })}
      addLabel="Capture">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
        <Chip label="All" selected={domainId === null} onPress={() => setDomainId(null)} />
        {visibleDomains.map((d) => {
          const c = domainColors(t, d.color);
          return (
            <Chip
              key={d.id}
              label={d.name}
              selected={domainId === d.id}
              accent={c.main}
              tint={c.soft}
              icon={<DomainIcon name={d.icon} color={c.main} />}
              onPress={() => setDomainId(domainId === d.id ? null : d.id)}
            />
          );
        })}
      </ScrollView>

      <EnergySegment
        label="Filter by energy"
        value={energy}
        onChange={setEnergy}
        options={['any', 'low', 'medium', 'high'] as EnergyFilter[]}
      />

      {empty ? (
        <View style={{ alignItems: 'center', paddingTop: spacing.lg, gap: spacing.sm }}>
          {settings.companion === 'off' ? null : <Kala pose="chill" size={170} />}
          <Text variant="title" style={{ textAlign: 'center' }}>
            {emptyCopy.title}
          </Text>
          <Text muted style={{ textAlign: 'center', maxWidth: 300 }}>
            {emptyCopy.body}
          </Text>
        </View>
      ) : (
        groups.map(({ domain, tasks: list }) => {
          const c = domainColors(t, domain.color);
          const isCollapsed = collapsed.has(domain.id);
          const Caret = isCollapsed ? CaretRight : CaretDown;
          return (
            <View key={domain.id} style={{ gap: spacing.sm }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${domain.name}, ${list.length} ${list.length === 1 ? 'task' : 'tasks'}`}
                accessibilityState={{ expanded: !isCollapsed }}
                onPress={() => toggle(domain.id)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 48 }}>
                <DomainIcon name={domain.icon} size={20} color={c.main} />
                <Text variant="headline" style={{ flex: 1 }}>
                  {domain.name}
                </Text>
                <Text variant="label" muted>
                  {list.length}
                </Text>
                <Caret size={18} color={t.colors.inkMuted} />
              </Pressable>
              {isCollapsed ? null : <TaskList tasks={list} domainById={domainById} today={today} />}
            </View>
          );
        })
      )}

      {recentlyDone.length > 0 ? (
        <View style={{ gap: spacing.sm }}>
          <Text variant="headline" accessibilityRole="header">
            Done recently
          </Text>
          <TaskList tasks={recentlyDone} domainById={domainById} today={today} showDue={false} />
        </View>
      ) : null}
    </Screen>
  );
}
