/** @jest-environment node */
import { countByDay } from '@/features/activity/heatmap';
import { focusSessionsQuery, toActivityEvents } from '@/db/queries';
import { createTask } from '@/db/repos/tasks';
import * as schema from '@/db/schema';
import { seedIfEmpty } from '@/db/seed';
import type { Db } from '@/db/client';
import { makeDb } from '@/test/make-db';

import { endTimer, finishPhase, loadTimer, pauseActive, resumeActive, startFocus, startNext } from '../actions';
import { MINUTE } from '../timer';

// expo-crypto is a native module and returns nothing under Jest, so use Node's UUIDs here.
jest.mock('@/db/ids', () => ({ newId: () => jest.requireActual<typeof import('crypto')>('crypto').randomUUID() }));

const at = (d: number, h: number, m = 0) => new Date(2025, 9, d, h, m).getTime();
const POMODORO = { focusMin: 25, breakMin: 5 };

let db: Db;
let work: string;
let taskId: string;

const sessions = () => db.select().from(schema.focusSessions);
const activityCounts = async () => countByDay(toActivityEvents([], [], await focusSessionsQuery(db), []));

beforeEach(async () => {
  db = makeDb();
  await seedIfEmpty(db);
  work = (await db.select().from(schema.domains)).find((d) => d.name === 'Work')!.id;
  taskId = await createTask(db, { title: 'Finish API spec', domainId: work, energy: 'high' });
});

describe('startFocus', () => {
  it('opens a not-yet-completed session and stores the running timer', async () => {
    const t0 = at(15, 9);
    const timer = await startFocus(db, { taskId, domainId: work, plannedMin: 25 }, t0);

    expect(timer).toMatchObject({ phase: 'focus', round: 1, status: 'running', endsAt: t0 + 25 * MINUTE });
    expect(await loadTimer(db)).toEqual(timer);
    expect(await sessions()).toMatchObject([
      { id: timer.sessionId, taskId, domainId: work, startedAt: t0, plannedMin: 25, kind: 'focus', completed: false, endedAt: null },
    ]);
    expect(await activityCounts()).toEqual({}); // nothing counts until it's completed
  });

  it('supports free focus with no task', async () => {
    const timer = await startFocus(db, { taskId: null, domainId: work, plannedMin: 15 }, at(15, 9));
    expect((await sessions())[0].taskId).toBeNull();
    expect(timer.taskId).toBeNull();
  });
});

describe('pause and resume', () => {
  it('survive a round trip through the database', async () => {
    const t0 = at(15, 9);
    const timer = await startFocus(db, { taskId, domainId: work, plannedMin: 25 }, t0);
    await pauseActive(db, timer, t0 + 10 * MINUTE);
    const paused = (await loadTimer(db))!;
    expect(paused).toMatchObject({ status: 'paused', remainingMs: 15 * MINUTE });

    await resumeActive(db, paused, t0 + 60 * MINUTE);
    expect(await loadTimer(db)).toMatchObject({ status: 'running', endsAt: t0 + 75 * MINUTE });
  });
});

describe('finishPhase', () => {
  it('records a completed session at the moment it really ended, even if noticed much later', async () => {
    const t0 = at(15, 9);
    const timer = await startFocus(db, { taskId, domainId: work, plannedMin: 25 }, t0);

    // The app was closed; it's reopened at 14:00.
    expect(await finishPhase(db, timer, at(15, 14))).toBe(true);

    expect(await loadTimer(db)).toMatchObject({ status: 'finished' });
    expect(await sessions()).toMatchObject([{ completed: true, endedAt: t0 + 25 * MINUTE }]);
    expect(await activityCounts()).toEqual({ '2025-10-15': 1 });
  });

  it('does nothing before the time is up, and is safe to call twice', async () => {
    const t0 = at(15, 9);
    const timer = await startFocus(db, { taskId, domainId: work, plannedMin: 25 }, t0);
    expect(await finishPhase(db, timer, t0 + 24 * MINUTE)).toBe(false);
    expect((await sessions())[0].completed).toBe(false);

    expect(await finishPhase(db, timer, t0 + 26 * MINUTE)).toBe(true);
    const finished = (await loadTimer(db))!;
    expect(await finishPhase(db, finished, t0 + 27 * MINUTE)).toBe(false); // already finished
    expect(await sessions()).toHaveLength(1);
  });
});

describe('startNext', () => {
  it('goes from a finished focus to an unrecorded break, then to a new focus round', async () => {
    const t0 = at(15, 9);
    const focus = await startFocus(db, { taskId, domainId: work, plannedMin: 25 }, t0);
    await finishPhase(db, focus, t0 + 30 * MINUTE);

    const brk = await startNext(db, (await loadTimer(db))!, POMODORO, t0 + 30 * MINUTE);
    expect(brk).toMatchObject({ phase: 'break', round: 1, plannedMin: 5, sessionId: null, taskId });
    expect(await sessions()).toHaveLength(1); // breaks aren't recorded

    await finishPhase(db, brk, t0 + 36 * MINUTE);
    const round2 = await startNext(db, (await loadTimer(db))!, POMODORO, t0 + 40 * MINUTE);
    expect(round2).toMatchObject({ phase: 'focus', round: 2, plannedMin: 25, taskId });
    expect(await sessions()).toHaveLength(2);
    expect(await activityCounts()).toEqual({ '2025-10-15': 1 }); // round 2 hasn't completed yet
  });
});

describe('endTimer', () => {
  it('keeps an early-ended session as a record but never counts it', async () => {
    const t0 = at(15, 9);
    const timer = await startFocus(db, { taskId, domainId: work, plannedMin: 25 }, t0);
    await endTimer(db, timer, t0 + 8 * MINUTE);

    expect(await loadTimer(db)).toBeNull();
    expect(await sessions()).toMatchObject([{ completed: false, endedAt: t0 + 8 * MINUTE }]);
    expect(await activityCounts()).toEqual({});
  });

  it("leaves a completed session alone when you tap Done afterwards", async () => {
    const t0 = at(15, 9);
    const timer = await startFocus(db, { taskId, domainId: work, plannedMin: 25 }, t0);
    await finishPhase(db, timer, t0 + 26 * MINUTE);
    await endTimer(db, (await loadTimer(db))!, t0 + 30 * MINUTE);

    expect(await loadTimer(db)).toBeNull();
    expect(await sessions()).toMatchObject([{ completed: true, endedAt: t0 + 25 * MINUTE }]);
    expect(await activityCounts()).toEqual({ '2025-10-15': 1 });
  });

  it('can end a break without touching any focus session', async () => {
    const t0 = at(15, 9);
    const focus = await startFocus(db, { taskId, domainId: work, plannedMin: 25 }, t0);
    await finishPhase(db, focus, t0 + 25 * MINUTE);
    const brk = await startNext(db, (await loadTimer(db))!, POMODORO, t0 + 26 * MINUTE);
    await endTimer(db, brk, t0 + 28 * MINUTE);
    expect(await loadTimer(db)).toBeNull();
    expect(await sessions()).toMatchObject([{ completed: true }]);
  });
});

it('treats a corrupt stored timer as no timer instead of crashing', async () => {
  await db.insert(schema.settings).values({ key: 'activeTimer', value: '{not valid json' });
  expect(await loadTimer(db)).toBeNull();
});
