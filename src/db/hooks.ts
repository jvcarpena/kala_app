import { and, asc, eq, ne } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo } from 'react';

import type { ActivityEvent } from '@/features/activity/heatmap';

import { db } from './client';
import { doneTasksQuery, focusSessionsQuery, habitLogsQuery, toActivityEvents, workoutsQuery } from './queries';
import { domains, habitLogs, habits, settings, tasks } from './schema';
import { DEFAULT_SETTINGS, type Settings } from './settings';

// Each hook subscribes to SQLite, so screens update the moment data changes.

export function useDomains() {
  return useLiveQuery(db.select().from(domains).orderBy(asc(domains.sortOrder))).data;
}

/** Every task that hasn't been archived. */
export function useTasks() {
  return useLiveQuery(db.select().from(tasks).where(ne(tasks.status, 'archived'))).data;
}

/** Habits that haven't been archived, oldest first. */
export function useHabits() {
  return useLiveQuery(db.select().from(habits).where(eq(habits.archived, false)).orderBy(asc(habits.createdAt))).data;
}

/** Every log of every active habit, grouped: habitId -> (date -> value). */
export function useHabitLogs(): Map<string, Map<string, number>> {
  const { data } = useLiveQuery(
    db
      .select({ habitId: habitLogs.habitId, date: habitLogs.date, value: habitLogs.value })
      .from(habitLogs)
      .innerJoin(habits, eq(habitLogs.habitId, habits.id))
      .where(and(eq(habits.archived, false))),
  );
  return useMemo(() => {
    const byHabit = new Map<string, Map<string, number>>();
    for (const l of data) {
      let days = byHabit.get(l.habitId);
      if (!days) byHabit.set(l.habitId, (days = new Map()));
      days.set(l.date, l.value);
    }
    return byHabit;
  }, [data]);
}

export function useSettings(): Settings {
  const { data } = useLiveQuery(db.select().from(settings));
  return useMemo(() => {
    const merged: Record<string, unknown> = { ...DEFAULT_SETTINGS };
    for (const row of data) {
      try {
        merged[row.key] = JSON.parse(row.value);
      } catch {
        // Corrupt value: keep the default.
      }
    }
    return merged as Settings;
  }, [data]);
}

/**
 * Everything the user got done, as dated events: finished tasks, habit logs,
 * completed focus sessions and finished workouts. Feeds the activity grid.
 */
export function useActivityEvents(): ActivityEvent[] {
  const { data: doneTasks } = useLiveQuery(doneTasksQuery(db));
  const { data: logs } = useLiveQuery(habitLogsQuery(db));
  const { data: focus } = useLiveQuery(focusSessionsQuery(db));
  const { data: workouts } = useLiveQuery(workoutsQuery(db));

  return useMemo(() => toActivityEvents(doneTasks, logs, focus, workouts), [doneTasks, logs, focus, workouts]);
}
