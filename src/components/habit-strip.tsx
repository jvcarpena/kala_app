import { useRouter } from 'expo-router';
import { CaretRight } from 'phosphor-react-native';
import { Pressable, View } from 'react-native';

import type { Domain, Habit } from '@/db/schema';
import { isMet, type LogMap } from '@/features/habits/logic';
import { domainColors } from '@/theme/domain-colors';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { Card } from './card';
import { Text } from './text';

type Props = {
  /** Habits scheduled today (after Focus Mode). */
  habits: Habit[];
  domainById: Map<string, Domain>;
  logs: Map<string, LogMap>;
  today: string;
};

/** Today's habits as a row of dots: filled once done. Tapping opens the Habits tab. */
export function HabitStrip({ habits, domainById, logs, today }: Props) {
  const t = useTheme();
  const router = useRouter();
  const done = habits.filter((h) => isMet(h, logs.get(h.id)?.get(today))).length;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Habits today: ${done} of ${habits.length} done. Open habits`}
      onPress={() => router.navigate('/habits')}>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, minHeight: 64 }}>
        <View style={{ flex: 1, gap: spacing.sm }}>
          <Text variant="headline">{`Habits today · ${done} of ${habits.length}`}</Text>
          <View
            style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants">
            {habits.map((h) => {
              const c = domainColors(t, domainById.get(h.domainId)?.color ?? '').main;
              const met = isMet(h, logs.get(h.id)?.get(today));
              return (
                <View
                  key={h.id}
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 8,
                    borderWidth: 2,
                    borderColor: c,
                    backgroundColor: met ? c : 'transparent',
                  }}
                />
              );
            })}
          </View>
        </View>
        <CaretRight size={18} color={t.colors.inkMuted} />
      </Card>
    </Pressable>
  );
}
