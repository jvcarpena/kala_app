import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { haptic } from '@/lib/haptics';
import { radius } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { Text } from './text';

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: ReactNode;
  /** Accent for the selected state (a domain color). Defaults to ink. */
  accent?: string;
  /** Tinted background for the selected state. */
  tint?: string;
};

/** Pill toggle. 40dp tall with 4dp slop each side, so touch targets reach 48dp. */
export function Chip({ label, selected = false, onPress, icon, accent, tint }: Props) {
  const t = useTheme();
  const edge = selected ? (accent ?? t.colors.ink) : t.colors.line;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      hitSlop={4}
      onPress={() => {
        haptic('select');
        onPress?.();
      }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          minHeight: 40,
          paddingHorizontal: 14,
          borderRadius: radius.pill,
          borderWidth: selected ? 2 : 1,
          borderColor: edge,
          backgroundColor: selected ? (tint ?? t.colors.surface) : t.colors.surface,
        }}>
        {icon}
        <Text variant="label" style={{ fontFamily: selected ? 'AtkinsonHyperlegibleNext_700Bold' : undefined }}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
