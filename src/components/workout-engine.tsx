import { useEffect } from 'react';

import { db } from '@/db/client';
import { useActiveWorkout, useSettings } from '@/db/hooks';
import { setSetting } from '@/db/settings';
import { restEnded } from '@/features/fitness/logic';
import { haptic } from '@/lib/haptics';
import { useNow } from '@/lib/use-now';

/**
 * Mounted once at the root. Ends a rest when its time is up (with a buzz), so it still ends if you've
 * left the workout screen, and clears a stale rest if the workout is gone.
 */
export function WorkoutEngine() {
  const { restTimer } = useSettings();
  const workout = useActiveWorkout();
  const now = useNow(restTimer !== null);

  useEffect(() => {
    if (!restTimer) return;
    if (workout === null) {
      setSetting(db, 'restTimer', null).catch(() => {});
      return;
    }
    if (restEnded(restTimer, now)) {
      haptic('success');
      setSetting(db, 'restTimer', null).catch(() => {});
    }
  }, [restTimer, workout, now]);

  return null;
}
