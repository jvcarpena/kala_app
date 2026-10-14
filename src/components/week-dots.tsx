import { View } from 'react-native';

import type { WeekDot } from '@/features/habits/logic';
import { useTheme } from '@/theme/use-theme';

/**
 * Mon to Sun for this week. Filled = done, ring = scheduled and not done yet,
 * dim ring = missed, faint dot = rest day. The habit row reads the same numbers aloud,
 * so this is decoration for screen readers.
 */
export function WeekDots({ dots, color }: { dots: WeekDot[]; color: string }) {
  const t = useTheme();
  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      {dots.map((d) => {
        const size = d.isToday ? 13 : 11;
        const common = { width: size, height: size, borderRadius: size / 2 } as const;
        switch (d.state) {
          case 'done':
            return <View key={d.date} style={{ ...common, backgroundColor: color }} />;
          case 'pending':
            return <View key={d.date} style={{ ...common, borderWidth: 2, borderColor: color }} />;
          case 'missed':
            return <View key={d.date} style={{ ...common, borderWidth: 2, borderColor: color, opacity: 0.4 }} />;
          default:
            return <View key={d.date} style={{ ...common, backgroundColor: t.colors.line }} />;
        }
      })}
    </View>
  );
}
