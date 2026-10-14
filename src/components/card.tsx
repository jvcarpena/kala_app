import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { radius } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

/** Flat surface (no shadow: cards separate from the background by tone). */
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return <View style={[{ backgroundColor: t.colors.surface, borderRadius: radius.card, overflow: 'hidden' }, style]}>{children}</View>;
}
