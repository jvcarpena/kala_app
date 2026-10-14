import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/use-theme';

import { Text } from './text';

/** Shown if the local database can't be opened or migrated. */
export function StartupError({ error }: { error: Error }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: t.colors.bg,
        paddingTop: insets.top + 48,
        paddingHorizontal: 24,
        gap: 12,
      }}>
      <Text variant="title">{"Kala couldn't open your data"}</Text>
      <Text muted>
        {"Restart the app. If this keeps happening, your data is still on this device. Don't uninstall Kala."}
      </Text>
      <Text variant="caption" muted selectable>
        {error.message}
      </Text>
    </View>
  );
}
