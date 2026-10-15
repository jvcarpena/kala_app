import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Polygon } from 'react-native-svg';

import type { Domain } from '@/db/schema';
import { formatMinutes, formatRate, radarPoints, type DomainStat, type Point } from '@/features/insights/balance';
import { domainColors } from '@/theme/domain-colors';
import { useTheme } from '@/theme/use-theme';

import { DomainIcon } from './domain-icon';
import { Text } from './text';

export type RadarMode = 'time' | 'rate';

type Props = {
  domains: Domain[];
  current: DomainStat[];
  previous: DomainStat[];
  mode: RadarMode;
  /** Spoken description of the whole chart; the table below carries every value as text. */
  accessibilityLabel: string;
};

const RINGS = [0.25, 0.5, 0.75, 1];
/** Room around the shape for the domain labels. */
const LABEL_SPACE = 58;
const LABEL_W = 92;
const LABEL_H = 40;

const toPoints = (pts: Point[]) => pts.map((p) => `${p.x},${p.y}`).join(' ');

/**
 * Radar of one week per domain: this week solid, the week before dashed. The shapes are ink
 * (color means domain, and a week isn't a domain); each axis label carries the domain's icon,
 * color and name. Time scales to the biggest value in either week; Done % is absolute.
 */
export function BalanceRadar({ domains, current, previous, mode, accessibilityLabel }: Props) {
  const t = useTheme();
  const [width, setWidth] = useState(0);

  const valueOf = (s: DomainStat | undefined) => (mode === 'time' ? (s?.minutes ?? 0) : (s?.rate ?? 0) * 100);
  const byId = (list: DomainStat[]) => new Map(list.map((s) => [s.domainId, s]));
  const now = byId(current);
  const before = byId(previous);
  const nowValues = domains.map((d) => valueOf(now.get(d.id)));
  const beforeValues = domains.map((d) => valueOf(before.get(d.id)));
  const max = mode === 'time' ? Math.max(1, ...nowValues, ...beforeValues) : 100;

  const height = Math.min(width, 340);
  const radius = Math.max(0, Math.min(width, height) / 2 - LABEL_SPACE);
  const cx = width / 2;
  const cy = height / 2;
  const full = domains.map(() => max);
  const outer = radarPoints(full, max, cx, cy, radius);
  const labelAnchors = radarPoints(full, max, cx, cy, radius + 22);

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ width: '100%', height: height || 280 }}>
      {width > 0 ? (
        <>
          <Svg width={width} height={height}>
            {RINGS.map((r) => (
              <Polygon
                key={r}
                points={toPoints(radarPoints(full, max, cx, cy, radius * r))}
                fill="none"
                stroke={t.colors.line}
                strokeWidth={1}
              />
            ))}
            {outer.map((p, i) => (
              <Line key={domains[i].id} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={t.colors.line} strokeWidth={1} />
            ))}
            <Polygon
              points={toPoints(radarPoints(beforeValues, max, cx, cy, radius))}
              fill="none"
              stroke={t.colors.inkMuted}
              strokeWidth={1.5}
              strokeDasharray="5 4"
            />
            <Polygon
              points={toPoints(radarPoints(nowValues, max, cx, cy, radius))}
              fill={t.colors.ink}
              fillOpacity={0.12}
              stroke={t.colors.ink}
              strokeWidth={2}
              strokeLinejoin="round"
            />
            {radarPoints(nowValues, max, cx, cy, radius).map((p, i) => (
              <Circle key={domains[i].id} cx={p.x} cy={p.y} r={3.5} fill={t.colors.ink} />
            ))}
          </Svg>

          {domains.map((d, i) => {
            const a = labelAnchors[i];
            const c = domainColors(t, d.color);
            const s = now.get(d.id);
            const value = mode === 'time' ? formatMinutes(s?.minutes ?? 0) : formatRate(s?.rate ?? null);
            // Labels sit beyond the end of their axis: to the side for side axes, above or below
            // for the top and bottom ones, and always inside the chart's box.
            const side = a.x > cx + 8 ? 'right' : a.x < cx - 8 ? 'left' : 'middle';
            const rawLeft = side === 'right' ? a.x - 6 : side === 'left' ? a.x - LABEL_W + 6 : a.x - LABEL_W / 2;
            const rawTop = a.y < cy - 8 ? a.y - LABEL_H + 6 : a.y > cy + 8 ? a.y - 6 : a.y - LABEL_H / 2;
            const left = Math.min(Math.max(rawLeft, 0), width - LABEL_W);
            const top = Math.min(Math.max(rawTop, 0), height - LABEL_H);
            const align = side === 'right' ? 'flex-start' : side === 'left' ? 'flex-end' : 'center';
            return (
              <View
                key={d.id}
                importantForAccessibility="no-hide-descendants"
                accessibilityElementsHidden
                style={{ position: 'absolute', left, top, width: LABEL_W, height: LABEL_H, alignItems: align, justifyContent: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <DomainIcon name={d.icon} size={14} color={c.main} />
                  <Text variant="caption" numberOfLines={1} style={{ flexShrink: 1 }}>
                    {d.name}
                  </Text>
                </View>
                <Text variant="caption" muted>
                  {value}
                </Text>
              </View>
            );
          })}
        </>
      ) : null}
    </View>
  );
}
