import { count } from 'drizzle-orm';

import { resolveWorkoutDomainId } from '@/features/domains/logic';

import type { Db } from './client';
import { newId } from './ids';
import { domains } from './schema';
import { getSetting, setSetting } from './settings';

/** The four built-in life domains. `color` is a key into theme.domains. */
export const DEFAULT_DOMAINS = [
  { name: 'Work', color: 'work', icon: 'Briefcase' },
  { name: 'Study', color: 'study', icon: 'BookOpen' },
  { name: 'Health', color: 'health', icon: 'Barbell' },
  { name: 'Life', color: 'life', icon: 'House' },
] as const;

/**
 * Inserts the default domains on first launch and remembers which one workouts count under.
 * Safe to call every launch. The workout domain is recorded here, while the Health color still
 * identifies it, so later renames, recolors and archiving can't move it.
 */
export async function seedIfEmpty(db: Db): Promise<void> {
  const [{ n }] = await db.select({ n: count() }).from(domains);
  if (n === 0) {
    await db.insert(domains).values(
      DEFAULT_DOMAINS.map((d, i) => ({
        id: newId(),
        name: d.name,
        color: d.color,
        icon: d.icon,
        sortOrder: i,
        isDefault: true,
      })),
    );
  }

  if ((await getSetting(db, 'workoutDomainId')) === null) {
    const id = resolveWorkoutDomainId(await db.select().from(domains), null);
    if (id) await setSetting(db, 'workoutDomainId', id);
  }
}
