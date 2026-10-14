import { and, eq } from 'drizzle-orm';

import type { Db } from '../client';
import { newId } from '../ids';
import { habitLogs, habits, type Habit } from '../schema';

export type HabitInput = {
  name: string;
  domainId: string;
  type: Habit['type'];
  /** For count habits: how many make a day count. Yes/no habits are always 1. */
  target: number;
  unit?: string | null;
  /** Weekdays 0 (Mon) to 6 (Sun). */
  schedule: number[];
  /** 'HH:mm' or null. */
  reminderTime?: string | null;
};

const row = (input: HabitInput) => ({
  name: input.name.trim(),
  domainId: input.domainId,
  type: input.type,
  target: input.type === 'check' ? 1 : Math.max(1, input.target),
  unit: input.type === 'check' ? null : input.unit?.trim() || null,
  schedule: JSON.stringify([...new Set(input.schedule)].sort()),
  reminderTime: input.reminderTime ?? null,
});

export async function createHabit(db: Db, input: HabitInput): Promise<string> {
  const id = newId();
  await db.insert(habits).values({ id, ...row(input) });
  return id;
}

export async function getHabit(db: Db, id: string): Promise<Habit | undefined> {
  const [found] = await db.select().from(habits).where(eq(habits.id, id));
  return found;
}

export async function updateHabit(db: Db, id: string, input: HabitInput): Promise<void> {
  await db.update(habits).set(row(input)).where(eq(habits.id, id));
}

/** Soft delete: the history stays (and keeps counting toward past activity), the habit leaves your lists. */
export async function archiveHabit(db: Db, id: string): Promise<void> {
  await db.update(habits).set({ archived: true, reminderTime: null }).where(eq(habits.id, id));
}

export async function getLogValue(db: Db, habitId: string, date: string): Promise<number> {
  const [found] = await db
    .select({ value: habitLogs.value })
    .from(habitLogs)
    .where(and(eq(habitLogs.habitId, habitId), eq(habitLogs.date, date)));
  return found?.value ?? 0;
}

/**
 * Sets the value for one day. One row per habit per day: a zero or negative value
 * removes the log, so un-checking leaves no trace.
 */
export async function setHabitLog(db: Db, habitId: string, date: string, value: number): Promise<void> {
  if (value <= 0) {
    await db.delete(habitLogs).where(and(eq(habitLogs.habitId, habitId), eq(habitLogs.date, date)));
    return;
  }
  await db
    .insert(habitLogs)
    .values({ id: newId(), habitId, date, value })
    .onConflictDoUpdate({ target: [habitLogs.habitId, habitLogs.date], set: { value } });
}

/** Adds to a day's value (never below zero). Returns the new value. */
export async function addToHabitLog(db: Db, habitId: string, date: string, delta: number): Promise<number> {
  const next = Math.max(0, (await getLogValue(db, habitId, date)) + delta);
  await setHabitLog(db, habitId, date, next);
  return next;
}
