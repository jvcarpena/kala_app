import { useRouter } from 'expo-router';
import { Gear } from 'phosphor-react-native';
import { Pressable } from 'react-native';

import { useTheme } from '@/theme/use-theme';

/** Header icon that opens Settings. */
export function SettingsButton() {
  const t = useTheme();
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Settings"
      hitSlop={4}
      onPress={() => router.push('/settings')}
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: t.colors.surface,
        borderWidth: 1,
        borderColor: t.colors.line,
      }}>
      <Gear size={22} color={t.colors.ink} />
    </Pressable>
  );
}
