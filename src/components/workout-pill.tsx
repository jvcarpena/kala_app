import { useRouter } from 'expo-router';
import { Barbell } from 'phosphor-react-native';

import { useActiveWorkout } from '@/db/hooks';
import { formatElapsed } from '@/features/fitness/logic';
import { useNow } from '@/lib/use-now';
import { useTheme } from '@/theme/use-theme';

import { FloatingPill } from './floating-pill';

/** Shows the running workout and how long it's been going. Tap to jump back in. */
export function WorkoutPill({ slot, clearOfAddButton }: { slot: number; clearOfAddButton: boolean }) {
  const t = useTheme();
  const router = useRouter();
  const workout = useActiveWorkout();
  const now = useNow(workout !== null);
  if (!workout) return null;

  const elapsed = formatElapsed(now - workout.startedAt);
  return (
    <FloatingPill
      slot={slot}
      clearOfAddButton={clearOfAddButton}
      icon={<Barbell size={20} weight="fill" color={t.colors.onInk} />}
      value={elapsed}
      label={workout.name}
      accessibilityLabel={`${workout.name} in progress, ${elapsed}. Open workout`}
      onPress={() => router.push({ pathname: '/workout/session/[id]', params: { id: workout.id } })}
    />
  );
}
