import { eq } from 'drizzle-orm';

import type { Db } from '@/db/client';
import { newId } from '@/db/ids';
import { focusSessions } from '@/db/schema';
import { getSetting, setSetting, type Settings } from '@/db/settings';

import {
  type ActiveTimer,
  createTimer,
  finishTimer,
  hasEnded,
  nextPhase,
  pauseTimer,
  resumeTimer,
} from './timer';

// Every change to the timer goes through here, so the settings row and the focus_sessions
// table can never disagree. Only completed focus phases count toward activity; breaks and
// sessions that were ended early are not counted.

const save = (db: Db, timer: ActiveTimer | null) => setSetting(db, 'activeTimer', timer);

async function openFocusSession(db: Db, taskId: string | null, domainId: string, plannedMin: number, now: number) {
  const id = newId();
  await db.insert(focusSessions).values({ id, taskId, domainId, startedAt: now, plannedMin, kind: 'focus', completed: false });
  return id;
}

/** Starts the first focus round for a task (or free focus when taskId is null). */
export async function startFocus(
  db: Db,
  input: { taskId: string | null; domainId: string; plannedMin: number },
  now: number = Date.now(),
): Promise<ActiveTimer> {
  const sessionId = await openFocusSession(db, input.taskId, input.domainId, input.plannedMin, now);
  const timer = createTimer({ ...input, phase: 'focus', round: 1, sessionId }, now);
  await save(db, timer);
  return timer;
}

export async function pauseActive(db: Db, timer: ActiveTimer, now: number = Date.now()): Promise<void> {
  await save(db, pauseTimer(timer, now));
}

export async function resumeActive(db: Db, timer: ActiveTimer, now: number = Date.now()): Promise<void> {
  await save(db, resumeTimer(timer, now));
}

/**
 * Called when a running phase's time is up (also when the app reopens after it was). Records a
 * completed focus session at the moment it actually ended. Safe to call twice: a timer that
 * isn't running-and-over is left alone.
 */
export async function finishPhase(db: Db, timer: ActiveTimer, now: number = Date.now()): Promise<boolean> {
  if (!hasEnded(timer, now)) return false;
  if (timer.phase === 'focus' && timer.sessionId) {
    await db.update(focusSessions).set({ endedAt: timer.endsAt, completed: true }).where(eq(focusSessions.id, timer.sessionId));
  }
  await save(db, finishTimer(timer));
  return true;
}

/** After a finished phase: starts the break, or the next focus round. */
export async function startNext(
  db: Db,
  timer: ActiveTimer,
  pomodoro: Settings['pomodoro'],
  now: number = Date.now(),
): Promise<ActiveTimer> {
  const next = nextPhase(timer, pomodoro);
  const sessionId =
    next.phase === 'focus' ? await openFocusSession(db, timer.taskId, timer.domainId, next.plannedMin, now) : null;
  const started = createTimer({ taskId: timer.taskId, domainId: timer.domainId, ...next, sessionId }, now);
  await save(db, started);
  return started;
}

/**
 * Stops the timer. A focus session ended before its time was up is kept as a record but
 * not counted as completed.
 */
export async function endTimer(db: Db, timer: ActiveTimer, now: number = Date.now()): Promise<void> {
  if (timer.phase === 'focus' && timer.sessionId && timer.status !== 'finished') {
    await db.update(focusSessions).set({ endedAt: now, completed: false }).where(eq(focusSessions.id, timer.sessionId));
  }
  await save(db, null);
}

/** Reads the timer straight from the database. Used by tests and by the engine on startup. */
export const loadTimer = (db: Db) => getSetting(db, 'activeTimer');
