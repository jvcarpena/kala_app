import { and, asc, desc, eq, isNull, ne } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo } from 'react';

import type { ActivityEvent } from '@/features/activity/heatmap';
import type { HistorySet } from '@/features/fitness/logic';

import { db } from './client';
import { doneTasksQuery, focusSessionsQuery, habitLogsQuery, toActivityEvents, workoutsQuery } from './queries';
import { historyQuery, toHistory } from './repos/workouts';
import {
  domains,
  habitLogs,
  habits,
  settings,
  tasks,
  templateExercises,
  workoutSessions,
  workoutSets,
  workoutTemplates,
} from './schema';
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

// ---- Workouts ------------------------------------------------------------------------------

/** Templates with their exercises, in the order you made them. */
export function useTemplates() {
  const { data: templates } = useLiveQuery(db.select().from(workoutTemplates).orderBy(asc(workoutTemplates.createdAt)));
  const { data: exercises } = useLiveQuery(db.select().from(templateExercises).orderBy(asc(templateExercises.sortOrder)));
  return useMemo(
    () => templates.map((template) => ({ template, exercises: exercises.filter((e) => e.templateId === template.id) })),
    [templates, exercises],
  );
}

/** Every workout, newest first. Finished ones have an endedAt; at most one is running. */
export function useWorkoutSessions() {
  return useLiveQuery(db.select().from(workoutSessions).orderBy(desc(workoutSessions.startedAt))).data;
}

/** The workout in progress, if any. */
export function useActiveWorkout() {
  return useLiveQuery(db.select().from(workoutSessions).where(isNull(workoutSessions.endedAt)).limit(1)).data[0] ?? null;
}

/** All sets of one workout. */
export function useWorkoutSets(sessionId: string | undefined) {
  return useLiveQuery(
    db
      .select()
      .from(workoutSets)
      .where(eq(workoutSets.sessionId, sessionId ?? ''))
      .orderBy(asc(workoutSets.exerciseOrder), asc(workoutSets.setIndex)),
    [sessionId],
  ).data;
}

/** Completed sets from finished workouts, for "last time" and personal records. */
export function useWorkoutHistory(): HistorySet[] {
  const { data } = useLiveQuery(historyQuery(db));
  return useMemo(() => toHistory(data), [data]);
}
