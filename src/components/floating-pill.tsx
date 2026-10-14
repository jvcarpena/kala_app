import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { fonts, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { Text } from './text';

export const PILL_HEIGHT = 56;
/** Vertical space one pill takes, including the gap below it. */
export const PILL_SLOT = PILL_HEIGHT + spacing.sm;

type Props = {
  /** 0 sits on the tab bar; 1 sits above that, and so on, so pills can stack. */
  slot: number;
  /** Leave room on the right for the + button. */
  clearOfAddButton: boolean;
  icon: ReactNode;
  /** Large number on the left (e.g. a countdown). */
  value: string;
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
};

/** A pill that floats above the tab bar: a running timer or workout you can tap to reopen. */
export function FloatingPill({ slot, clearOfAddButton, icon, value, label, accessibilityLabel, onPress }: Props) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={{
        position: 'absolute',
        left: spacing.lg,
        right: clearOfAddButton ? spacing.lg + 56 + spacing.md : spacing.lg,
        bottom: spacing.lg + slot * PILL_SLOT,
        height: PILL_HEIGHT,
        borderRadius: radius.pill,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingHorizontal: spacing.lg,
        backgroundColor: t.colors.ink,
        ...(t.scheme === 'dark' ? { borderWidth: 1, borderColor: t.colors.line } : { elevation: 4 }),
      }}>
      {icon}
      <Text
        style={{ fontFamily: fonts.display, fontSize: 18, color: t.colors.onInk, fontVariant: ['tabular-nums'] }}
        importantForAccessibility="no">
        {value}
      </Text>
      <View style={{ flex: 1 }}>
        <Text variant="label" numberOfLines={1} style={{ color: t.colors.onInk }}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
