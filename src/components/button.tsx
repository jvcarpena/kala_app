import { Pressable } from 'react-native';

import { haptic } from '@/lib/haptics';
import { radius } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { Text } from './text';

type Props = {
  label: string;
  onPress: () => void;
  /** 'primary' is the one main action on a screen; 'secondary' is subordinate. */
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  /** Fill the row (flex: 1) when buttons sit side by side. */
  grow?: boolean;
};

export function Button({ label, onPress, variant = 'primary', disabled = false, grow = false }: Props) {
  const t = useTheme();
  const bg = variant === 'primary' ? t.colors.ink : t.colors.surfaceSunk;
  const fg = variant === 'primary' ? t.colors.onInk : variant === 'danger' ? t.colors.danger : t.colors.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => {
        haptic('light');
        onPress();
      }}
      style={({ pressed }) => ({
        flex: grow ? 1 : undefined,
        minHeight: 48,
        paddingHorizontal: 18,
        borderRadius: radius.control,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: bg,
        // Disabled is visibly muted and also not tappable.
        opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
      })}>
      <Text variant="headline" style={{ color: fg }}>
        {label}
      </Text>
    </Pressable>
  );
}
