import { View } from 'react-native';

import { spacing } from '@/theme/tokens';

import { Kala } from './kala/kala';
import { Text } from './text';

/** Placeholder body for tabs that aren't built yet. */
export function ComingSoon({ line }: { line: string }) {
  return (
    <View style={{ alignItems: 'center', paddingTop: spacing.xxl, gap: spacing.sm }}>
      <Kala pose="chill" size={180} />
      <Text variant="title" style={{ textAlign: 'center' }}>
        Coming soon
      </Text>
      <Text muted style={{ textAlign: 'center', maxWidth: 280 }}>
        {line}
      </Text>
    </View>
  );
}
