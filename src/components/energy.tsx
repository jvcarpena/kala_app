import { BatteryHigh, BatteryLow, BatteryMedium, type Icon } from 'phosphor-react-native';
import { Pressable, View } from 'react-native';

import { ENERGY_LABEL, type Energy, type EnergyFilter } from '@/features/tasks/logic';
import { haptic } from '@/lib/haptics';
import { radius } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { Text } from './text';

export const ENERGY_ICON: Record<Energy, Icon> = { low: BatteryLow, medium: BatteryMedium, high: BatteryHigh };

type Props<V extends string> = {
  value: V;
  onChange: (v: V) => void;
  options: V[];
  /** Spoken name for the whole control. */
  label: string;
};

/**
 * Segmented control for energy. With 'any' in the options it is the Today/Tasks filter;
 * without it, it's the picker in the task editor. Battery icon + text, never color alone.
 */
export function EnergySegment<V extends EnergyFilter>({ value, onChange, options, label }: Props<V>) {
  const t = useTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={{
        flexDirection: 'row',
        backgroundColor: t.colors.surfaceSunk,
        borderRadius: radius.control,
        padding: 3,
        gap: 2,
      }}>
      {options.map((o) => {
        const selected = o === value;
        const level = o === 'any' ? null : (o as Energy);
        const Glyph = level ? ENERGY_ICON[level] : null;
        const text = level ? ENERGY_LABEL[level] : 'Any';
        return (
          <Pressable
            key={o}
            accessibilityRole="radio"
            accessibilityLabel={level ? `${ENERGY_LABEL[level]} energy` : 'Any energy'}
            accessibilityState={{ selected }}
            onPress={() => {
              haptic('select');
              onChange(o);
            }}
            style={{
              flex: 1,
              minHeight: 44,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              borderRadius: radius.control - 3,
              backgroundColor: selected ? t.colors.surface : 'transparent',
            }}>
            {Glyph ? <Glyph size={18} color={selected ? t.colors.ink : t.colors.inkMuted} /> : null}
            <Text variant="label" muted={!selected} style={selected ? { fontFamily: 'AtkinsonHyperlegibleNext_700Bold' } : undefined}>
              {text}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
