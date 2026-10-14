import { useRouter } from 'expo-router';
import { Eye, EyeSlash } from 'phosphor-react-native';
import { Pressable, View } from 'react-native';

import { useSettings } from '@/db/hooks';
import { radius } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { Text } from './text';

/** Header chip for Focus Mode. Opens the preset picker. Inverts (ink fill) while on. */
export function FocusChip() {
  const t = useTheme();
  const router = useRouter();
  const { focusPreset } = useSettings();
  const on = focusPreset !== null;
  const fg = on ? t.colors.onInk : t.colors.ink;
  const Glyph = on ? EyeSlash : Eye;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={on ? `Focus Mode: ${focusPreset}. Change` : 'Focus Mode is off. Turn on'}
      hitSlop={4}
      onPress={() => router.push('/focus-mode')}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          minHeight: 40,
          paddingHorizontal: 12,
          borderRadius: radius.pill,
          backgroundColor: on ? t.colors.ink : t.colors.surface,
          borderWidth: 1,
          borderColor: on ? t.colors.ink : t.colors.line,
        }}>
        <Glyph size={16} color={fg} />
        <Text variant="label" style={{ color: fg }}>
          {on ? focusPreset : 'Focus: off'}
        </Text>
      </View>
    </Pressable>
  );
}
