import { Pressable, View } from 'react-native';

import { ICON_NAMES } from '@/features/domains/logic';
import { haptic } from '@/lib/haptics';
import { domainColors } from '@/theme/domain-colors';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { DomainIcon } from './domain-icon';

type Props = {
  value: string;
  onChange: (icon: string) => void;
  /** The domain's color key, so the icons preview in it. */
  color: string;
};

/** Icon picker: 48dp tiles, the selected one outlined and tinted. */
export function IconGrid({ value, onChange, color }: Props) {
  const t = useTheme();
  const c = domainColors(t, color);
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Icon" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      {ICON_NAMES.map((name) => {
        const selected = value === name;
        return (
          <Pressable
            key={name}
            accessibilityRole="radio"
            accessibilityLabel={name.replace(/([a-z])([A-Z])/g, '$1 $2')}
            accessibilityState={{ selected }}
            onPress={() => {
              haptic('select');
              onChange(name);
            }}
            style={{
              width: 48,
              height: 48,
              borderRadius: radius.control,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: selected ? c.soft : t.colors.surface,
              borderWidth: selected ? 2 : 1,
              borderColor: selected ? c.main : t.colors.line,
            }}>
            <DomainIcon name={name} size={24} color={selected ? c.main : t.colors.inkMuted} />
          </Pressable>
        );
      })}
    </View>
  );
}
