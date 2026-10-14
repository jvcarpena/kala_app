import { Pressable, View } from 'react-native';

import { haptic } from '@/lib/haptics';
import { fonts, radius } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { Text } from './text';

type Props<V extends string> = {
  value: V;
  onChange: (v: V) => void;
  options: { value: V; label: string }[];
  /** Spoken name for the whole control. */
  label: string;
};

/** Plain text segmented control (the energy one has battery icons, so it stays separate). */
export function Segmented<V extends string>({ value, onChange, options, label }: Props<V>) {
  const t = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={label}
      style={{ flexDirection: 'row', backgroundColor: t.colors.surfaceSunk, borderRadius: radius.control, padding: 3, gap: 2 }}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityLabel={o.label}
            accessibilityState={{ selected }}
            onPress={() => {
              if (selected) return;
              haptic('select');
              onChange(o.value);
            }}
            style={{
              flex: 1,
              minHeight: 44,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radius.control - 3,
              backgroundColor: selected ? t.colors.surface : 'transparent',
            }}>
            <Text variant="label" muted={!selected} style={selected ? { fontFamily: fonts.bold } : undefined}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
