import { Pressable, View } from 'react-native';

import type { DomainColors } from '@/theme/tokens';
import { fonts, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';
import { trimNumber } from '@/features/fitness/logic';

import { Checkbox } from './checkbox';
import { Text } from './text';

type Props = {
  /** 1-based position within its exercise. */
  number: number;
  reps: number;
  weight: number | null;
  done: boolean;
  colors: DomainColors;
  exerciseName: string;
  onToggle: () => void;
  onEditWeight: () => void;
  onEditReps: () => void;
  onRemove: () => void;
};

/** One set: weight and reps are tap-to-edit buttons, and the checkbox completes it (and starts the rest). */
export function SetRow({ number, reps, weight, done, colors, exerciseName, onToggle, onEditWeight, onEditReps, onRemove }: Props) {
  const t = useTheme();
  const valueButton = (text: string, label: string, onPress: () => void) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        flex: 1,
        minHeight: 48,
        borderRadius: radius.control,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: done ? 'transparent' : t.colors.surfaceSunk,
      }}>
      <Text style={{ fontFamily: fonts.display, fontSize: 17, fontVariant: ['tabular-nums'] }}>{text}</Text>
    </Pressable>
  );

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingLeft: spacing.md,
        paddingRight: spacing.xs,
        paddingVertical: 3,
        backgroundColor: done ? colors.soft : 'transparent',
      }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Set ${number} of ${exerciseName}. Long press to remove`}
        accessibilityActions={[{ name: 'delete', label: 'Remove set' }]}
        onAccessibilityAction={onRemove}
        onLongPress={onRemove}
        style={{ width: 44, minHeight: 48, justifyContent: 'center' }}>
        <Text variant="caption" muted>
          {`Set ${number}`}
        </Text>
      </Pressable>
      {valueButton(weight === null ? '— kg' : `${trimNumber(weight)} kg`, `Weight, ${weight === null ? 'not set' : `${trimNumber(weight)} kilograms`}. Edit`, onEditWeight)}
      {valueButton(`${reps} reps`, `${reps} reps. Edit`, onEditReps)}
      <Checkbox
        checked={done}
        color={colors.main}
        label={done ? `Set ${number} of ${exerciseName}, done. Mark as not done` : `Complete set ${number} of ${exerciseName}`}
        onToggle={onToggle}
      />
    </View>
  );
}
