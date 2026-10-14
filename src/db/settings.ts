import { eq } from 'drizzle-orm';

import type { RestTimer } from '@/features/fitness/logic';
import type { ActiveTimer } from '@/features/focus-timer/timer';

import type { Db } from './client';
import { settings } from './schema';

export type CompanionMode = 'chatty' | 'quiet' | 'off';
export type Language = 'taglish' | 'english';

export type Settings = {
  companion: CompanionMode;
  language: Language;
  /** Domain ids hidden by Focus Mode. */
  hiddenDomainIds: string[];
  /** Name of the active Focus Mode preset, or null when Focus Mode is off. */
  focusPreset: string | null;
  pomodoro: { focusMin: number; breakMin: number };
  /** The domain finished workouts count under. Remembered by id so renaming, recoloring or archiving Health can't move it. */
  workoutDomainId: string | null;
  /** The running, paused or just-finished focus/break phase. Null when no timer is active. */
  activeTimer: ActiveTimer | null;
  /** Rest countdown after a completed set in a workout. Null when not resting. */
  restTimer: RestTimer | null;
};

export const DEFAULT_SETTINGS: Settings = {
  companion: 'chatty',
  language: 'taglish',
  hiddenDomainIds: [],
  focusPreset: null,
  pomodoro: { focusMin: 25, breakMin: 5 },
  workoutDomainId: null,
  activeTimer: null,
  restTimer: null,
};

export async function getSetting<K extends keyof Settings>(db: Db, key: K): Promise<Settings[K]> {
  const [row] = await db.select().from(settings).where(eq(settings.key, key));
  if (!row) return DEFAULT_SETTINGS[key];
  try {
    return JSON.parse(row.value) as Settings[K];
  } catch {
    return DEFAULT_SETTINGS[key];
  }
}

export async function setSetting<K extends keyof Settings>(db: Db, key: K, value: Settings[K]): Promise<void> {
  const json = JSON.stringify(value);
  await db
    .insert(settings)
    .values({ key, value: json })
    .onConflictDoUpdate({ target: settings.key, set: { value: json } });
}
