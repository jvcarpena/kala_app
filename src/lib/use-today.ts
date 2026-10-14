import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { type DateKey, todayKey } from './dates';

/** Today's date key. Refreshes when the app returns to the foreground, so it survives midnight. */
export function useToday(): DateKey {
  const [key, setKey] = useState(todayKey);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setKey(todayKey());
    });
    return () => sub.remove();
  }, []);
  return key;
}
