import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { ActivityHeatmap } from '@/components/activity-heatmap';
import { Kala } from '@/components/kala/kala';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { useActivityEvents, useDomains, useSettings } from '@/db/hooks';
import { useToday } from '@/lib/use-today';
import { spacing } from '@/theme/tokens';

export default function InsightsScreen() {
  const router = useRouter();
  const today = useToday();
  const domains = useDomains();
  const events = useActivityEvents();
  const settings = useSettings();

  return (
    <Screen
      title="Insights"
      subtitle="How consistent you've been"
      onAdd={() => router.push('/capture')}
      addLabel="Capture">
      <ActivityHeatmap
        events={events}
        domains={domains}
        today={today}
        companion={settings.companion}
        language={settings.language}
      />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        {settings.companion === 'off' ? null : <Kala pose="chill" size={72} />}
        <View style={{ flex: 1 }}>
          <Text variant="headline">Life balance is coming</Text>
          <Text muted>A weekly radar of Work, Study, Health and Life will show up here.</Text>
        </View>
      </View>
    </Screen>
  );
}
