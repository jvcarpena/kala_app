import { CaretDown } from 'phosphor-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import type { Domain } from '@/db/schema';
import { formatMinutes, formatRate, sortStats, type DomainStat, type SortKey } from '@/features/insights/balance';
import { haptic } from '@/lib/haptics';
import { domainColors } from '@/theme/domain-colors';
import { fonts, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { DomainIcon } from './domain-icon';
import { Text } from './text';

type Props = {
  domains: Domain[];
  current: DomainStat[];
  previous: DomainStat[];
};

const COLUMNS: { key: SortKey; label: string; flex: number; align: 'flex-start' | 'flex-end' }[] = [
  { key: 'order', label: 'Domain', flex: 1.4, align: 'flex-start' },
  { key: 'minutes', label: 'Time', flex: 1, align: 'flex-end' },
  { key: 'rate', label: 'Done', flex: 0.8, align: 'flex-end' },
];

/**
 * The radar's numbers as a table, so nothing depends on reading the chart. Tap a column
 * header to sort by it. Each row shows this week, with the week before underneath.
 */
export function BalanceTable({ domains, current, previous }: Props) {
  const t = useTheme();
  const [sortBy, setSortBy] = useState<SortKey>('order');
  const byId = new Map(domains.map((d) => [d.id, d]));
  const before = new Map(previous.map((s) => [s.domainId, s]));

  return (
    <View>
      <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: t.colors.line }}>
        {COLUMNS.map((c) => {
          const selected = sortBy === c.key;
          return (
            <Pressable
              key={c.key}
              accessibilityRole="button"
              accessibilityLabel={`Sort by ${c.label === 'Domain' ? 'your domain order' : c.label.toLowerCase()}`}
              accessibilityState={{ selected }}
              onPress={() => {
                haptic('select');
                setSortBy(c.key);
              }}
              style={{ flex: c.flex, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: c.align, gap: 2 }}>
              <Text variant="label" muted={!selected} style={selected ? { fontFamily: fonts.bold } : undefined}>
                {c.label}
              </Text>
              {selected ? <CaretDown size={12} weight="bold" color={t.colors.ink} /> : null}
            </Pressable>
          );
        })}
      </View>

      {sortStats(current, sortBy).map((s) => {
        const d = byId.get(s.domainId);
        if (!d) return null;
        const c = domainColors(t, d.color);
        const p = before.get(s.domainId);
        const label =
          `${d.name}: ${formatMinutes(s.minutes)}, ${s.rate === null ? 'nothing due' : `${formatRate(s.rate)} done`}. ` +
          `The week before: ${formatMinutes(p?.minutes ?? 0)}, ${p?.rate == null ? 'nothing due' : `${formatRate(p.rate)} done`}.`;
        return (
          <View
            key={s.domainId}
            accessible
            accessibilityLabel={label}
            style={{ flexDirection: 'row', alignItems: 'center', minHeight: 52, borderBottomWidth: 1, borderBottomColor: t.colors.line }}>
            <View style={{ flex: 1.4, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <DomainIcon name={d.icon} size={16} color={c.main} />
              <Text style={{ flexShrink: 1 }}>{d.name}</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={{ fontVariant: ['tabular-nums'] }}>{formatMinutes(s.minutes)}</Text>
              <Text variant="caption" muted>{`was ${formatMinutes(p?.minutes ?? 0)}`}</Text>
            </View>
            <View style={{ flex: 0.8, alignItems: 'flex-end' }}>
              <Text style={{ fontVariant: ['tabular-nums'] }}>{formatRate(s.rate)}</Text>
              <Text variant="caption" muted>{`was ${formatRate(p?.rate ?? null)}`}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
