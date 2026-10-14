import { Text as RNText, type TextProps } from 'react-native';

import { type TextStyleName, type } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

type Props = TextProps & {
  variant?: TextStyleName;
  muted?: boolean;
};

/** Themed text. Titles wrap rather than truncate (Dynamic Type friendly). */
export function Text({ variant = 'body', muted, style, ...rest }: Props) {
  const t = useTheme();
  const spec = type[variant];
  return (
    <RNText
      {...rest}
      style={[
        {
          fontFamily: spec.fontFamily,
          fontSize: spec.fontSize,
          lineHeight: spec.lineHeight,
          color: muted ? t.colors.inkMuted : t.colors.ink,
          fontVariant: spec.tabular ? ['tabular-nums'] : undefined,
        },
        style,
      ]}
    />
  );
}
