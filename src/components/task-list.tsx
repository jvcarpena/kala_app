import { View } from 'react-native';

import type { Domain, Task } from '@/db/schema';
import { useTheme } from '@/theme/use-theme';

import { Card } from './card';
import { TaskRow } from './task-row';

type Props = {
  tasks: Task[];
  domainById: Map<string, Domain>;
  today: string;
  showDue?: boolean;
};

/** A card of task rows with hairline dividers. */
export function TaskList({ tasks, domainById, today, showDue }: Props) {
  const t = useTheme();
  return (
    <Card>
      {tasks.map((task, i) => (
        <View key={task.id} style={i === 0 ? undefined : { borderTopWidth: 1, borderTopColor: t.colors.line }}>
          <TaskRow task={task} domain={domainById.get(task.domainId)} today={today} showDue={showDue} />
        </View>
      ))}
    </Card>
  );
}
