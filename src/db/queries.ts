import { and, eq, gte, isNotNull } from 'drizzle-orm';

import type { ActivityEvent } from '@/features/activity/heatmap';
import { dateKey } from '@/lib/dates';

import type { Db } from './client';
import { focusSessions, habitLogs, habits, tasks, workoutSessions } from './schema';

// The queries behind the activity grid. Kept as factories so the hook can subscribe to
// them live and tests can run the same SQL against a real database.

export const doneTasksQuery = (db: Db) =>
  db
    .select({ domainId: tasks.domainId, at: tasks.completedAt })
    .from(tasks)
    .where(and(eq(tasks.status, 'done'), isNotNull(tasks.completedAt)));

export const habitLogsQuery = (db: Db) =>
  db
    .select({ date: habitLogs.date, domainId: habits.domainId })
    .from(habitLogs)
    .innerJoin(habits, eq(habitLogs.habitId, habits.id))
    // A count habit (6 of 8 glasses) only counts as done once it reaches its target.
    .where(gte(habitLogs.value, habits.target));

export const focusSessionsQuery = (db: Db) =>
  db
    .select({ domainId: focusSessions.domainId, at: focusSessions.startedAt })
    .from(focusSessions)
    .where(and(eq(focusSessions.completed, true), eq(focusSessions.kind, 'focus')));

export const workoutsQuery = (db: Db) =>
  db
    .select({ domainId: workoutSessions.domainId, at: workoutSessions.endedAt })
    .from(workoutSessions)
    .where(isNotNull(workoutSessions.endedAt));

// The life-balance radar needs durations, which the activity queries above don't carry.

/** Completed focus phases with their planned length (breaks and early stops never count). */
export const focusMinutesQuery = (db: Db) =>
  db
    .select({ domainId: focusSessions.domainId, startedAt: focusSessions.startedAt, plannedMin: focusSessions.plannedMin })
    .from(focusSessions)
    .where(and(eq(focusSessions.completed, true), eq(focusSessions.kind, 'focus')));

/** Finished workouts with their start and end. */
export const finishedWorkoutsQuery = (db: Db) =>
  db
    .select({ domainId: workoutSessions.domainId, startedAt: workoutSessions.startedAt, endedAt: workoutSessions.endedAt })
    .from(workoutSessions)
    .where(isNotNull(workoutSessions.endedAt));

type Dated = { domainId: string; at: number | null };

/** Merges the four sources into dated events, bucketed by the user's local day. */
export function toActivityEvents(
  doneTasks: Dated[],
  logs: { date: string; domainId: string }[],
  focus: Dated[],
  workouts: Dated[],
): ActivityEvent[] {
  const events: ActivityEvent[] = [];
  for (const row of [...doneTasks, ...focus, ...workouts]) {
    if (row.at !== null) events.push({ date: dateKey(row.at), domainId: row.domainId });
  }
  for (const l of logs) events.push({ date: l.date, domainId: l.domainId });
  return events;
}
