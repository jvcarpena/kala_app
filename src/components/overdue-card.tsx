import { View } from 'react-native';

import { db } from '@/db/client';
import { setTaskDone, setTaskDueDate } from '@/db/repos/tasks';
import type { Task } from '@/db/schema';
import type { CompanionMode, Language } from '@/db/settings';
import { overdueBody, overdueHeading } from '@/features/companion/copy';
import { haptic } from '@/lib/haptics';
import { spacing } from '@/theme/tokens';

import { Button } from './button';
import { Card } from './card';
import { Kala } from './kala/kala';
import { Text } from './text';

type Props = {
  /** Open tasks due before today, oldest first. Shows one at a time. */
  overdue: Task[];
  today: string;
  language: Language;
  companion: CompanionMode;
};

/** The "Kala ko tapos na?" card. One overdue task at a time, with two clear fixes and no guilt. */
export function OverdueCard({ overdue, today, language, companion }: Props) {
  const task = overdue[0];
  if (!task || !task.dueDate) return null;
  const voice = { language, mode: companion };

  return (
    <Card style={{ padding: spacing.lg, gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        {companion === 'off' ? null : <Kala pose="oops" size={72} />}
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="title" accessibilityRole="header">
            {overdueHeading(voice)}
          </Text>
          <Text muted>{overdueBody(task.title, task.dueDate, today, overdue.length - 1)}</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Button grow label="Move to today" onPress={() => setTaskDueDate(db, task.id, today)} />
        <Button
          grow
          variant="secondary"
          label="Mark done"
          onPress={() => {
            haptic('success');
            setTaskDone(db, task.id, true);
          }}
        />
      </View>
    </Card>
  );
}
