import { useEffect, useRef } from 'react';

import { db } from '@/db/client';
import { useSettings } from '@/db/hooks';
import { cancelTimerAlert, scheduleTimerAlert } from '@/features/focus-timer/alerts';
import { finishPhase } from '@/features/focus-timer/actions';
import { hasEnded } from '@/features/focus-timer/timer';
import { haptic } from '@/lib/haptics';
import { useNow } from '@/lib/use-now';

/**
 * Mounted once at the root. It is the only thing that ends a phase, so the timer screen and the
 * mini pill can both just display. It also keeps the end-of-phase notification in step with the
 * timer, and finishes a phase that ran out while the app was closed.
 */
export function TimerEngine() {
  const { activeTimer: timer, language, companion } = useSettings();
  const now = useNow(timer?.status === 'running');
  const finishedKey = useRef<string | null>(null);

  useEffect(() => {
    if (!timer || !hasEnded(timer, now)) return;
    const key = `${timer.startedAt}:${timer.phase}:${timer.round}`;
    finishPhase(db, timer, now)
      .then((finished) => {
        if (finished && finishedKey.current !== key) {
          finishedKey.current = key;
          haptic('success');
        }
      })
      .catch(() => {});
  }, [timer, now]);

  useEffect(() => {
    if (timer?.status === 'running') scheduleTimerAlert(timer, { language, mode: companion }).catch(() => {});
    else cancelTimerAlert().catch(() => {});
  }, [timer, language, companion]);

  return null;
}
