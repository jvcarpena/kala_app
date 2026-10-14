import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * The current time in ms, refreshed every `intervalMs` while `enabled`, and immediately when the
 * app returns to the foreground (timers keep their real end time while the app sleeps).
 */
export function useNow(enabled: boolean, intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    const refresh = () => setNow(Date.now());
    const id = setInterval(refresh, intervalMs);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    refresh();
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [enabled, intervalMs]);
  return now;
}
