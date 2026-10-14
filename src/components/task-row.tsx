import { useRouter } from 'expo-router';
import { Play } from 'phosphor-react-native';
import { Pressable, View } from 'react-native';

import { db } from '@/db/client';
import { setTaskDone } from '@/db/repos/tasks';
import type { Domain, Task } from '@/db/schema';
import { ENERGY_LABEL } from '@/features/tasks/logic';
import { dueLabel } from '@/lib/dates';
import { domainColors } from '@/theme/domain-colors';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { Checkbox } from './checkbox';
import { DomainIcon } from './domain-icon';
import { ENERGY_ICON } from './energy';
import { Text } from './text';

type Props = {
  task: Task;
  domain: Domain | undefined;
  today: string;
  /** Hide the due date (e.g. in the "due today" list where it's implied). */
  showDue?: boolean;
};

/** Check circle, title, and a meta line. Tapping the row opens the editor. */
export function TaskRow({ task, domain, today, showDue = true }: Props) {
  const t = useTheme();
  const router = useRouter();
  const colors = domainColors(t, domain?.color ?? '');
  const done = task.status === 'done';
  const Energy = ENERGY_ICON[task.energy];

  const meta: string[] = [domain?.name ?? 'No domain'];
  if (showDue && task.dueDate) meta.push(dueLabel(task.dueDate, today));
  if (task.estimateMin) meta.push(`${task.estimateMin} min`);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: spacing.xs }}>
      <Checkbox
        checked={done}
        color={colors.main}
        label={done ? `${task.title}, done. Mark as not done` : `Mark ${task.title} as done`}
        onToggle={() => setTaskDone(db, task.id, !done)}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Edit ${task.title}`}
        onPress={() => router.push({ pathname: '/task/[id]', params: { id: task.id } })}
        style={{ flex: 1, minHeight: 56, justifyContent: 'center', paddingVertical: spacing.sm, paddingRight: spacing.sm }}>
        <Text
          style={done ? { textDecorationLine: 'line-through' } : undefined}
          muted={done}>
          {task.title}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
          <DomainIcon name={domain?.icon ?? 'Tag'} size={14} color={colors.main} />
          <Text variant="caption" muted>
            {meta.join(' · ')}
          </Text>
          <Energy size={14} color={t.colors.inkMuted} />
          <Text variant="caption" muted>
            {ENERGY_LABEL[task.energy]}
          </Text>
        </View>
      </Pressable>
      {done ? null : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Start focus on ${task.title}`}
          onPress={() => router.push({ pathname: '/focus/[taskId]', params: { taskId: task.id } })}
          style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.soft,
            }}>
            <Play size={16} weight="fill" color={colors.main} />
          </View>
        </Pressable>
      )}
    </View>
  );
}
