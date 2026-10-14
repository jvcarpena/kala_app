import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

type Props = {
  size: number;
  /** How much of the phase has gone, 0 to 1. */
  elapsed: number;
  color: string;
  track: string;
  children?: ReactNode;
};

const STROKE = 14;

/**
 * The timer ring: one arc that drains clockwise. The arc's start edge sweeps from 12 o'clock
 * round as time passes, so what's left is always the part still ahead. Decorative: the time is
 * read from the text in the middle.
 */
export function FocusRing({ size, elapsed, color, track, children }: Props) {
  const r = (size - STROKE) / 2;
  const circumference = 2 * Math.PI * r;
  const remaining = Math.min(1, Math.max(0, 1 - elapsed));
  const c = size / 2;

  return (
    <View
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
      accessibilityElementsHidden={false}>
      <Svg width={size} height={size} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Circle cx={c} cy={c} r={r} stroke={track} strokeWidth={STROKE} fill="none" />
        {remaining > 0.002 ? (
          <Circle
            cx={c}
            cy={c}
            r={r}
            stroke={color}
            strokeWidth={STROKE}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={[remaining * circumference, circumference]}
            rotation={-90 + elapsed * 360}
            origin={`${c}, ${c}`}
          />
        ) : null}
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>{children}</View>
    </View>
  );
}
