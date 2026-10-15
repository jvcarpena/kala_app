/** @jest-environment node */
import { weekRange, weekStats, type WorkoutRow } from '@/features/insights/balance';
import { makeDb } from '@/test/make-db';

import type { Db } from '../client';
import { finishedWorkoutsQuery, focusMinutesQuery } from '../queries';
import * as schema from '../schema';
import { seedIfEmpty } from '../seed';

// expo-crypto is a native module and returns nothing under Jest, so use Node's UUIDs here.
jest.mock('../ids', () => ({ newId: () => jest.requireActual<typeof import('crypto')>('crypto').randomUUID() }));

const at = (day: number, h = 12, m = 0) => new Date(2026, 9, day, h, m).getTime();

let db: Db;
let work: string;
let health: string;

beforeEach(async () => {
  db = makeDb();
  await seedIfEmpty(db);
  const rows = await db.select().from(schema.domains);
  work = rows.find((d) => d.name === 'Work')!.id;
  health = rows.find((d) => d.name === 'Health')!.id;
});

describe('balance queries', () => {
  it('returns only completed focus phases, with their planned length', async () => {
    await db.insert(schema.focusSessions).values([
      { id: 'f1', domainId: work, startedAt: at(13), endedAt: at(13, 12, 25), plannedMin: 25, kind: 'focus', completed: true },
      { id: 'f2', domainId: work, startedAt: at(13, 14), endedAt: at(13, 14, 10), plannedMin: 50, kind: 'focus', completed: false },
      { id: 'f3', domainId: work, startedAt: at(13, 15), endedAt: at(13, 15, 5), plannedMin: 5, kind: 'break', completed: true },
    ]);
    expect(await focusMinutesQuery(db)).toEqual([{ domainId: work, startedAt: at(13), plannedMin: 25 }]);
  });

  it('returns only finished workouts', async () => {
    await db.insert(schema.workoutSessions).values([
      { id: 'w1', name: 'Push', domainId: health, startedAt: at(14, 9), endedAt: at(14, 10) },
      { id: 'w2', name: 'Pull', domainId: health, startedAt: at(15, 9), endedAt: null },
    ]);
    expect(await finishedWorkoutsQuery(db)).toEqual([{ domainId: health, startedAt: at(14, 9), endedAt: at(14, 10) }]);
  });

  it('feeds weekStats end to end', async () => {
    await db.insert(schema.focusSessions).values({
      id: 'f1', domainId: work, startedAt: at(13), endedAt: at(13, 12, 25), plannedMin: 25, kind: 'focus', completed: true,
    });
    await db.insert(schema.workoutSessions).values({ id: 'w1', name: 'Push', domainId: health, startedAt: at(14, 9), endedAt: at(14, 10) });
    await db.insert(schema.tasks).values({ id: 't1', title: 'Report', domainId: work, energy: 'high', dueDate: '2026-10-14', status: 'done', completedAt: at(14), estimateMin: 50 });

    const focus = await focusMinutesQuery(db);
    const workouts = (await finishedWorkoutsQuery(db)).filter((w): w is WorkoutRow => w.endedAt !== null);
    const tasks = await db.select().from(schema.tasks);
    const stats = weekStats([work, health], { focus, workouts, tasks, habits: [], logs: new Map() }, weekRange('2026-10-15', 0), '2026-10-15');

    expect(stats).toEqual([
      { domainId: work, minutes: 75, done: 1, due: 1, rate: 1 },
      { domainId: health, minutes: 60, done: 0, due: 0, rate: null },
    ]);
  });
});
