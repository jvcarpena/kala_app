import { count } from 'drizzle-orm';

import type { Db } from './client';
import { newId } from './ids';
import { domains } from './schema';

/** The four built-in life domains. `color` is a key into theme.domains. */
export const DEFAULT_DOMAINS = [
  { name: 'Work', color: 'work', icon: 'Briefcase' },
  { name: 'Study', color: 'study', icon: 'BookOpen' },
  { name: 'Health', color: 'health', icon: 'Barbell' },
  { name: 'Life', color: 'life', icon: 'House' },
] as const;

/** Inserts the default domains on first launch. Safe to call every launch. */
export async function seedIfEmpty(db: Db): Promise<void> {
  const [{ n }] = await db.select({ n: count() }).from(domains);
  if (n > 0) return;

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
