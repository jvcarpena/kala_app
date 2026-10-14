import { Plus } from 'phosphor-react-native';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useActiveWorkout, useSettings } from '@/db/hooks';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { PILL_SLOT } from './floating-pill';
import { Text } from './text';
import { TimerPill } from './timer-pill';
import { WorkoutPill } from './workout-pill';

type Props = {
  title: string;
  subtitle?: string;
  /** Sits to the right of the title (e.g. the Focus Mode chip). */
  headerRight?: ReactNode;
  /** Shows the floating + button. */
  onAdd?: () => void;
  addLabel?: string;
  children: ReactNode;
};

/** Standard tab screen: safe-area aware, 16dp gutters, big title, optional + button. */
export function Screen({ title, subtitle, headerRight, onAdd, addLabel = 'Add', children }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const hasTimer = useSettings().activeTimer !== null;
  const hasWorkout = useActiveWorkout() !== null;
  // Pills stack upwards: the focus timer first, the workout above it.
  const pillCount = (hasTimer ? 1 : 0) + (hasWorkout ? 1 : 0);
  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing.sm,
          paddingHorizontal: spacing.lg,
          // Room so the last row is never hidden behind the + button or the pills.
          paddingBottom:
            pillCount > 0 ? 48 + pillCount * PILL_SLOT + spacing.lg : onAdd ? 104 : spacing.huge,
          gap: spacing.lg,
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md }}>
          <View style={{ flexShrink: 1 }}>
            <Text variant="display" accessibilityRole="header">
              {title}
            </Text>
            {subtitle ? (
              <Text variant="caption" muted>
                {subtitle}
              </Text>
            ) : null}
          </View>
          {headerRight}
        </View>
        {children}
      </ScrollView>
      <TimerPill slot={0} clearOfAddButton={!!onAdd} />
      <WorkoutPill slot={hasTimer ? 1 : 0} clearOfAddButton={!!onAdd} />
      {onAdd ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={addLabel}
          onPress={onAdd}
          style={({ pressed }) => ({
            position: 'absolute',
            right: spacing.lg,
            bottom: spacing.lg,
            width: 56,
            height: 56,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: t.colors.ink,
            opacity: pressed ? 0.85 : 1,
            // Shadow only in light mode; dark surfaces separate by tone.
            ...(t.scheme === 'light'
              ? { shadowColor: '#16202B', shadowOpacity: 0.16, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 6 }
              : { borderWidth: 1, borderColor: t.colors.line }),
          })}>
          <Plus size={26} weight="bold" color={t.colors.onInk} />
        </Pressable>
      ) : null}
    </View>
  );
}
