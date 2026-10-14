import { Check } from 'phosphor-react-native';
import { Pressable, View } from 'react-native';

import { haptic } from '@/lib/haptics';
import { hit } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

type Props = {
  checked: boolean;
  onToggle: () => void;
  /** Accessible name, e.g. the task title. */
  label: string;
  /** Fill color when checked: the item's own domain color. */
  color: string;
};

/** 24dp visual, 48dp touch target. Completion is the item's domain color filling in. */
export function Checkbox({ checked, onToggle, label, color }: Props) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked }}
      hitSlop={4}
      onPress={() => {
        if (!checked) haptic('light');
        onToggle();
      }}
      style={{ width: hit, height: hit, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 8,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: checked ? color : 'transparent',
          // The unchecked outline is a control boundary, so it needs 3:1 (not the divider color).
          borderWidth: checked ? 0 : 2,
          borderColor: t.colors.inkMuted,
        }}>
        {checked ? <Check size={16} weight="bold" color={t.colors.onInk} /> : null}
      </View>
    </Pressable>
  );
}
