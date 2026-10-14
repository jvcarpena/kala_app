import { TextInput, View, type TextInputProps } from 'react-native';

import { fonts, radius } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { Text } from './text';

type Props = Pick<
  TextInputProps,
  'value' | 'onChangeText' | 'placeholder' | 'autoFocus' | 'multiline' | 'returnKeyType' | 'onSubmitEditing' | 'maxLength' | 'keyboardType' | 'selectTextOnFocus'
> & {
  /** Visible label above the field (never placeholder-only). */
  label: string;
};

export function TextField({ label, multiline, ...rest }: Props) {
  const t = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Text variant="label">{label}</Text>
      <TextInput
        {...rest}
        multiline={multiline}
        accessibilityLabel={label}
        placeholderTextColor={t.colors.inkMuted}
        style={{
          fontFamily: fonts.body,
          // 16sp keeps iOS from zooming on focus and meets the body-size floor.
          fontSize: 16,
          lineHeight: 24,
          color: t.colors.ink,
          backgroundColor: t.colors.surfaceSunk,
          borderRadius: radius.control,
          paddingHorizontal: 14,
          paddingVertical: 12,
          minHeight: multiline ? 96 : 48,
          textAlignVertical: multiline ? 'top' : 'center',
        }}
      />
    </View>
  );
}
