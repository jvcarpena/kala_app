import { Check } from 'phosphor-react-native';
import { Pressable, View } from 'react-native';

import { COLOR_LABEL, COLOR_OPTIONS } from '@/features/domains/logic';
import { haptic } from '@/lib/haptics';
import { domainColors } from '@/theme/domain-colors';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

type Props = { value: string; onChange: (color: string) => void };

/** The eight domain colors as 48dp circles. The check mark (not just the ring) shows the selected one. */
export function Swatches({ value, onChange }: Props) {
  const t = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Color" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      {COLOR_OPTIONS.map((key) => {
        const selected = value === key;
        const c = domainColors(t, key);
        return (
          <Pressable
            key={key}
            accessibilityRole="radio"
            accessibilityLabel={COLOR_LABEL[key]}
            accessibilityState={{ selected }}
            onPress={() => {
              haptic('select');
              onChange(key);
            }}
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: selected ? 3 : 0,
              borderColor: t.colors.ink,
            }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.main, alignItems: 'center', justifyContent: 'center' }}>
              {selected ? <Check size={20} weight="bold" color={t.colors.onInk} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
