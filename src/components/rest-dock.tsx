import { View } from 'react-native';

import { formatClock } from '@/features/focus-timer/timer';
import { type RestTimer, restElapsed, restRemainingMs } from '@/features/fitness/logic';
import { fonts, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { Button } from './button';
import { FocusRing } from './focus-ring';
import { Text } from './text';

type Props = {
  rest: RestTimer;
  now: number;
  /** The domain color the ring takes. */
  color: string;
  onExtend: () => void;
  onSkip: () => void;
};

/** The rest countdown docked above the Finish button: a small draining ring, the time, +30s and Skip. */
export function RestDock({ rest, now, color, onExtend, onSkip }: Props) {
  const t = useTheme();
  const left = restRemainingMs(rest, now);
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        backgroundColor: t.colors.surface,
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: t.colors.line,
        padding: spacing.md,
      }}>
      <FocusRing size={48} strokeWidth={5} elapsed={restElapsed(rest, now)} color={color} track={t.colors.surfaceSunk} />
      <View style={{ flex: 1 }}>
        <Text variant="caption" muted>
          Rest
        </Text>
        <Text
          accessibilityRole="timer"
          style={{ fontFamily: fonts.display, fontSize: 22, lineHeight: 26, fontVariant: ['tabular-nums'] }}>
          {formatClock(left)}
        </Text>
      </View>
      <Button variant="secondary" label="+30s" onPress={onExtend} />
      <Button variant="secondary" label="Skip" onPress={onSkip} />
    </View>
  );
}
