import { Flame } from 'phosphor-react-native';
import { useMemo, useRef, useState } from 'react';
import { type GestureResponderEvent, Pressable, ScrollView, View } from 'react-native';
import Svg, { G, Rect, Text as SvgText } from 'react-native-svg';

import type { Domain } from '@/db/schema';
import type { CompanionMode, Language } from '@/db/settings';
import { streakLine } from '@/features/companion/copy';
import { buildGrid, countByDay, summarize, type ActivityEvent, type Cell } from '@/features/activity/heatmap';
import { dueLabel, keyToDate } from '@/lib/dates';
import { domainColors } from '@/theme/domain-colors';
import { fonts, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { Card } from './card';
import { Chip } from './chip';
import { DomainIcon } from './domain-icon';
import { Kala } from './kala/kala';
import { Text } from './text';

const WEEKS = 30;
const CELL = 13;
const GAP = 3;
const STEP = CELL + GAP;
const MONTH_H = 18;
const LABEL_W = 30;
/** Room around the grid so the today/selected rings aren't clipped by the svg edge. */
const PAD = 3;
/** Fill opacity per level; level 0 is the empty-square color instead. */
const LEVEL_OPACITY = [0, 0.3, 0.52, 0.76, 1] as const;

type Props = {
  events: ActivityEvent[];
  domains: Domain[];
  /** Today's date key. */
  today: string;
  companion: CompanionMode;
  language: Language;
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * GitHub-style grid of everything the user got done: one square per day, darker =
 * busier, weeks run left to right with this week at the right edge. Tap a day to
 * read it. Filter by life domain to see the grid in that domain's color.
 */
export function ActivityHeatmap({ events, domains, today, companion, language }: Props) {
  const t = useTheme();
  const [domainId, setDomainId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>(today);
  const scroller = useRef<ScrollView>(null);

  const todayDate = useMemo(() => keyToDate(today), [today]);
  const counts = useMemo(() => countByDay(events, domainId), [events, domainId]);
  const grid = useMemo(() => buildGrid(counts, todayDate, WEEKS), [counts, todayDate]);
  const summary = useMemo(() => summarize(counts, todayDate), [counts, todayDate]);

  const filterDomain = domains.find((d) => d.id === domainId);
  const base = filterDomain ? domainColors(t, filterDomain.color).main : t.colors.ink;
  const fillFor = (level: Cell['level']) =>
    level === 0 ? { fill: t.colors.surfaceSunk, fillOpacity: 1 } : { fill: base, fillOpacity: LEVEL_OPACITY[level] };

  const onGridPress = (e: GestureResponderEvent) => {
    const { locationX: x, locationY: y } = e.nativeEvent;
    const col = Math.floor((x - PAD) / STEP);
    const row = Math.floor((y - MONTH_H) / STEP);
    const cell = grid.weeks[col]?.[row];
    if (cell && !cell.isFuture) setSelected(cell.date);
  };

  const selectedCount = counts[selected] ?? 0;
  const readout = `${dueLabel(selected, today)} · ${selectedCount === 0 ? 'nothing logged' : `${selectedCount} done`}`;
  const line = streakLine({ language, mode: companion }, summary.currentStreak);
  const noActivityYet = events.length === 0;
  const scope = filterDomain ? ` in ${filterDomain.name}` : '';

  return (
    <Card style={{ padding: spacing.lg, gap: spacing.md }}>
      <View style={{ gap: 2 }}>
        <Text variant="headline" accessibilityRole="header">
          Activity
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
          <Text variant="display">{summary.today}</Text>
          <Text muted>{`done today${scope}`}</Text>
        </View>
        <Text variant="caption" muted>
          {`${summary.last7} in the last 7 days · ${summary.last30} in the last 30`}
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
        <Chip label="All" selected={domainId === null} onPress={() => setDomainId(null)} />
        {domains.map((d) => {
          const c = domainColors(t, d.color);
          return (
            <Chip
              key={d.id}
              label={d.name}
              selected={domainId === d.id}
              accent={c.main}
              tint={c.soft}
              icon={<DomainIcon name={d.icon} color={c.main} />}
              onPress={() => setDomainId(domainId === d.id ? null : d.id)}
            />
          );
        })}
      </ScrollView>

      <View style={{ flexDirection: 'row' }}>
        {/* Weekday labels stay put while the grid scrolls. */}
        <View style={{ width: LABEL_W, paddingTop: MONTH_H }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {['Mon', '', 'Wed', '', 'Fri', '', ''].map((d, i) => (
            <Text key={i} variant="caption" muted style={{ height: STEP, lineHeight: STEP, fontSize: 12 }}>
              {d}
            </Text>
          ))}
        </View>
        <ScrollView
          ref={scroller}
          horizontal
          showsHorizontalScrollIndicator={false}
          // Start at the right edge so this week is in view.
          onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: false })}>
          <Pressable
            onPress={onGridPress}
            accessibilityRole="image"
            accessibilityLabel={`Activity grid for the last ${WEEKS} weeks. ${plural(summary.last7, 'thing', 'things')} done in the last 7 days and ${summary.last30} in the last 30. Current streak ${plural(summary.currentStreak, 'day', 'days')}, longest ${plural(summary.longestStreak, 'day', 'days')}.`}>
            <Svg width={WEEKS * STEP - GAP + PAD * 2} height={MONTH_H + 7 * STEP - GAP + PAD}>
              <G x={PAD}>
              {grid.monthLabels.map((m, w) =>
                m ? (
                  <SvgText key={w} x={w * STEP} y={12} fontSize={12} fontFamily={fonts.body} fill={t.colors.inkMuted}>
                    {m}
                  </SvgText>
                ) : null,
              )}
              {grid.weeks.map((week, w) =>
                week.map((cell, d) =>
                  cell.isFuture ? null : (
                    <Rect
                      key={cell.date}
                      x={w * STEP}
                      y={MONTH_H + d * STEP}
                      width={CELL}
                      height={CELL}
                      rx={3}
                      {...fillFor(cell.level)}
                    />
                  ),
                ),
              )}
              {/* Today gets a thin ring; the tapped day a bold one. */}
              {grid.weeks.map((week, w) =>
                week.map((cell, d) =>
                  cell.isToday || cell.date === selected ? (
                    <Rect
                      key={`ring-${cell.date}`}
                      x={w * STEP - 1.5}
                      y={MONTH_H + d * STEP - 1.5}
                      width={CELL + 3}
                      height={CELL + 3}
                      rx={4.5}
                      fill="none"
                      stroke={cell.date === selected ? t.colors.ink : t.colors.inkMuted}
                      strokeWidth={cell.date === selected ? 2 : 1.25}
                    />
                  ) : null,
                ),
              )}
              </G>
            </Svg>
          </Pressable>
        </ScrollView>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text variant="label" accessibilityLiveRegion="polite" style={{ flexShrink: 1 }}>
          {readout}
        </Text>
        <View
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants">
          <Text variant="caption" muted>
            Less
          </Text>
          <Svg width={5 * STEP - GAP} height={CELL}>
            {([0, 1, 2, 3, 4] as const).map((lv) => (
              <Rect key={lv} x={lv * STEP} y={0} width={CELL} height={CELL} rx={3} {...fillFor(lv)} />
            ))}
          </Svg>
          <Text variant="caption" muted>
            More
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Stat
          value={summary.currentStreak}
          label="day streak"
          icon={<Flame size={18} weight="fill" color={t.colors.streak} />}
        />
        <Stat value={summary.longestStreak} label="longest streak" />
        <Stat value={`${summary.activeDays30}/30`} label="active days" />
      </View>

      {noActivityYet ? (
        <Text variant="caption" muted>
          Finish a task and your first square fills in.
        </Text>
      ) : line ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Kala pose="streak" size={48} />
          <Text style={{ flex: 1 }}>{line}</Text>
        </View>
      ) : null}
    </Card>
  );
}

function Stat({ value, label, icon }: { value: number | string; label: string; icon?: React.ReactNode }) {
  const t = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${value} ${label}`}
      style={{ flex: 1, backgroundColor: t.colors.bg, borderRadius: 12, paddingVertical: spacing.md, paddingHorizontal: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        {icon}
        <Text variant="title">{value}</Text>
      </View>
      <Text variant="caption" muted>
        {label}
      </Text>
    </View>
  );
}
