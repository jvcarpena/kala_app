import { useRouter } from 'expo-router';
import { CaretLeft, CaretRight } from 'phosphor-react-native';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { ActivityHeatmap } from '@/components/activity-heatmap';
import { BalanceRadar, type RadarMode } from '@/components/balance-radar';
import { BalanceTable } from '@/components/balance-table';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { Segmented } from '@/components/segmented';
import { Text } from '@/components/text';
import { useActivityEvents, useBalanceSources, useDomains, useSettings } from '@/db/hooks';
import { balanceSummary, weekLabel, weekRange, weekStats } from '@/features/insights/balance';
import { haptic } from '@/lib/haptics';
import { useToday } from '@/lib/use-today';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const MODES: { value: RadarMode; label: string }[] = [
  { value: 'time', label: 'Time' },
  { value: 'rate', label: 'Done %' },
];

/** A radar needs a shape; with fewer domains the table says it all. */
const MIN_AXES = 3;

export default function InsightsScreen() {
  const t = useTheme();
  const router = useRouter();
  const today = useToday();
  const domains = useDomains();
  const events = useActivityEvents();
  const settings = useSettings();
  const sources = useBalanceSources();
  const [offset, setOffset] = useState(0);
  const [mode, setMode] = useState<RadarMode>('time');

  const week = useMemo(() => weekRange(today, offset), [today, offset]);
  const { current, previous, summary } = useMemo(() => {
    const ids = domains.map((d) => d.id);
    const cur = weekStats(ids, sources, week, today);
    const prev = weekStats(ids, sources, weekRange(today, offset - 1), today);
    const names = new Map(domains.map((d) => [d.id, d.name]));
    return { current: cur, previous: prev, summary: balanceSummary(cur, prev, names, offset === 0) };
  }, [domains, sources, week, today, offset]);

  const label = weekLabel(week);
  const step = (delta: number) => {
    haptic('select');
    setOffset((o) => Math.min(0, o + delta));
  };

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

      <Card style={{ padding: spacing.lg, gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
          <Text variant="headline" accessibilityRole="header">
            Life balance
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous week"
              onPress={() => step(-1)}
              style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
              <CaretLeft size={20} color={t.colors.ink} />
            </Pressable>
            <Text variant="label" accessibilityLiveRegion="polite" style={{ minWidth: 104, textAlign: 'center' }}>
              {label}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next week"
              accessibilityState={{ disabled: offset === 0 }}
              disabled={offset === 0}
              onPress={() => step(1)}
              style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: offset === 0 ? 0.3 : 1 }}>
              <CaretRight size={20} color={t.colors.ink} />
            </Pressable>
          </View>
        </View>

        <Text muted accessibilityLiveRegion="polite">
          {summary}
        </Text>

        <Segmented label="What the chart shows" value={mode} onChange={setMode} options={MODES} />

        {domains.length >= MIN_AXES ? (
          <>
            <BalanceRadar
              domains={domains}
              current={current}
              previous={previous}
              mode={mode}
              accessibilityLabel={`Life balance chart for ${label.toLowerCase()}. ${summary} The table below lists every domain.`}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.lg }} importantForAccessibility="no-hide-descendants">
              <Legend solid label={label} />
              <Legend solid={false} label={offset === 0 ? 'Last week' : 'Week before'} />
            </View>
          </>
        ) : null}

        <BalanceTable domains={domains} current={current} previous={previous} />
      </Card>
    </Screen>
  );
}

function Legend({ solid, label }: { solid: boolean; label: string }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View
        style={{
          width: 18,
          height: 0,
          borderTopWidth: 2,
          borderStyle: solid ? 'solid' : 'dashed',
          borderColor: solid ? t.colors.ink : t.colors.inkMuted,
        }}
      />
      <Text variant="caption" muted>
        {label}
      </Text>
    </View>
  );
}
