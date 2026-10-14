/** @jest-environment node */
import { eq } from 'drizzle-orm';

import { countByDay } from '@/features/activity/heatmap';
import { findPersonalRecords, groupByExercise, lastPerformance, volume } from '@/features/fitness/logic';
import { makeDb } from '@/test/make-db';

import type { Db } from '../client';
import { toActivityEvents, workoutsQuery } from '../queries';
import {
  addExercise,
  addSet,
  addStarterTemplates,
  createTemplate,
  deleteTemplate,
  discardSession,
  finishSession,
  getActiveSessionId,
  getTemplate,
  loadHistory,
  removeExercise,
  removeSet,
  setSetValues,
  startSession,
  toggleSet,
  updateTemplate,
} from '../repos/workouts';
import * as schema from '../schema';
import { seedIfEmpty } from '../seed';

// expo-crypto is a native module and returns nothing under Jest, so use Node's UUIDs here.
jest.mock('../ids', () => ({ newId: () => jest.requireActual<typeof import('crypto')>('crypto').randomUUID() }));

const at = (d: number, h: number, m = 0) => new Date(2025, 9, d, h, m).getTime();

let db: Db;
let health: string;

const ex = (name: string, sets: number, reps: number, weight: number | null = null, restSec = 90) => ({ name, sets, reps, weight, restSec });
const sets = (sessionId: string) => db.select().from(schema.workoutSets).where(eq(schema.workoutSets.sessionId, sessionId));

beforeEach(async () => {
  db = makeDb();
  await seedIfEmpty(db);
  health = (await db.select().from(schema.domains)).find((d) => d.name === 'Health')!.id;
});

describe('templates', () => {
  it('creates, reads back in order, updates and deletes', async () => {
    const id = await createTemplate(db, '  Push day  ', [ex('Bench press', 4, 8, 60, 120), ex('  ', 1, 1), ex('Overhead press', 3, 10)]);
    const loaded = (await getTemplate(db, id))!;
    expect(loaded.template.name).toBe('Push day');
    expect(loaded.exercises.map((e) => [e.name, e.sets, e.reps, e.weight, e.restSec, e.sortOrder])).toEqual([
      ['Bench press', 4, 8, 60, 120, 0],
      ['Overhead press', 3, 10, null, 90, 1], // blank names are dropped
    ]);

    await updateTemplate(db, id, 'Push', [ex('Dips', 3, 12)]);
    const updated = (await getTemplate(db, id))!;
    expect(updated.template.name).toBe('Push');
    expect(updated.exercises.map((e) => e.name)).toEqual(['Dips']);

    await deleteTemplate(db, id);
    expect(await getTemplate(db, id)).toBeUndefined();
    expect(await db.select().from(schema.templateExercises)).toHaveLength(0);
  });

  it('adds the starter templates once, skipping names you already have', async () => {
    await createTemplate(db, 'push day', [ex('Bench press', 3, 8)]);
    expect(await addStarterTemplates(db)).toBe(2);
    expect(await addStarterTemplates(db)).toBe(0);
    expect((await db.select().from(schema.workoutTemplates)).map((t) => t.name).sort()).toEqual(['Leg day', 'Pull day', 'push day']);
  });
});

describe('starting a session', () => {
  it('copies the template into sets and allows only one active workout', async () => {
    const t = await createTemplate(db, 'Push', [ex('Bench press', 3, 8, 60, 120), ex('Dips', 2, 10)]);
    const { template, exercises } = (await getTemplate(db, t))!;
    const id = await startSession(db, { templateId: t, name: template.name, domainId: health, exercises }, at(15, 9));

    const rows = await sets(id);
    expect(rows).toHaveLength(5);
    expect(groupByExercise(rows).map((g) => [g.name, g.sets.length, g.restSec])).toEqual([
      ['Bench press', 3, 120],
      ['Dips', 2, 90],
    ]);
    expect(rows.every((r) => !r.done)).toBe(true);
    expect(await getActiveSessionId(db)).toBe(id);

    // A second start returns the running one and creates nothing new.
    expect(await startSession(db, { templateId: t, name: 'Again', domainId: health, exercises }, at(15, 10))).toBe(id);
    expect(await db.select().from(schema.workoutSessions)).toHaveLength(1);
  });
});

describe('logging sets', () => {
  async function newWorkout() {
    const t = await createTemplate(db, 'Push', [ex('Bench press', 2, 8, 60)]);
    const { template, exercises } = (await getTemplate(db, t))!;
    return startSession(db, { templateId: t, name: template.name, domainId: health, exercises }, at(15, 9));
  }

  it('edits values, toggles done, adds and removes sets and exercises', async () => {
    const id = await newWorkout();
    let rows = await sets(id);
    await setSetValues(db, rows[0].id, { reps: 10, weight: 65 });
    await toggleSet(db, rows[0].id, true);
    await addSet(db, id, 0); // copies the last set (60 x 8)
    await addExercise(db, id, 'Lateral raise');

    rows = await sets(id);
    const groups = groupByExercise(rows);
    expect(groups.map((g) => [g.name, g.sets.length])).toEqual([
      ['Bench press', 3],
      ['Lateral raise', 3],
    ]);
    expect(groups[0].sets.map((s) => [s.reps, s.weight, s.done])).toEqual([
      [10, 65, true],
      [8, 60, false],
      [8, 60, false],
    ]);

    await removeSet(db, groups[0].sets[2].id);
    await removeExercise(db, id, 1);
    expect(groupByExercise(await sets(id)).map((g) => [g.name, g.sets.length])).toEqual([['Bench press', 2]]);
  });
});

describe('finishing', () => {
  it('refuses to finish a workout with no completed sets', async () => {
    const t = await createTemplate(db, 'Push', [ex('Bench press', 2, 8, 60)]);
    const { template, exercises } = (await getTemplate(db, t))!;
    const id = await startSession(db, { templateId: t, name: template.name, domainId: health, exercises }, at(15, 9));
    expect(await finishSession(db, id, at(15, 10))).toBe(false);
    expect(await getActiveSessionId(db)).toBe(id);
    expect(await sets(id)).toHaveLength(2);
  });

  it('keeps only completed sets, stamps the end, frees the slot and counts as activity', async () => {
    const t = await createTemplate(db, 'Push', [ex('Bench press', 3, 8, 60)]);
    const { template, exercises } = (await getTemplate(db, t))!;
    const id = await startSession(db, { templateId: t, name: template.name, domainId: health, exercises }, at(15, 9));
    const rows = await sets(id);
    await toggleSet(db, rows[0].id, true);
    await toggleSet(db, rows[1].id, true);

    expect(await finishSession(db, id, at(15, 10))).toBe(true);
    expect(await sets(id)).toHaveLength(2); // the unchecked set is dropped
    expect(await getActiveSessionId(db)).toBeNull();
    expect(volume(await sets(id))).toBe(2 * 8 * 60);

    const counts = countByDay(toActivityEvents([], [], [], await workoutsQuery(db)));
    expect(counts).toEqual({ '2025-10-15': 1 });
    expect(countByDay(toActivityEvents([], [], [], await workoutsQuery(db)), health)).toEqual({ '2025-10-15': 1 });
  });

  it('does not count a workout that is still running', async () => {
    const t = await createTemplate(db, 'Push', [ex('Bench press', 1, 8, 60)]);
    const { template, exercises } = (await getTemplate(db, t))!;
    await startSession(db, { templateId: t, name: template.name, domainId: health, exercises }, at(15, 9));
    expect(await workoutsQuery(db)).toEqual([]);
  });

  it('discarding removes the workout and its sets', async () => {
    const t = await createTemplate(db, 'Push', [ex('Bench press', 2, 8, 60)]);
    const { template, exercises } = (await getTemplate(db, t))!;
    const id = await startSession(db, { templateId: t, name: template.name, domainId: health, exercises }, at(15, 9));
    await discardSession(db, id);
    expect(await getActiveSessionId(db)).toBeNull();
    expect(await db.select().from(schema.workoutSets)).toHaveLength(0);
  });

  it('keeps past workouts when their template is deleted', async () => {
    const t = await createTemplate(db, 'Push', [ex('Bench press', 1, 8, 60)]);
    const { template, exercises } = (await getTemplate(db, t))!;
    const id = await startSession(db, { templateId: t, name: template.name, domainId: health, exercises }, at(15, 9));
    await toggleSet(db, (await sets(id))[0].id, true);
    await finishSession(db, id, at(15, 10));
    await deleteTemplate(db, t);
    const [session] = await db.select().from(schema.workoutSessions);
    expect(session).toMatchObject({ name: 'Push', templateId: null });
  });
});

describe('progress across workouts', () => {
  async function doWorkout(day: number, weight: number, reps: number) {
    const id = await startSession(db, { templateId: null, name: 'Push', domainId: health, exercises: [ex('Bench press', 2, 8, 60)] }, at(day, 9));
    const rows = await sets(id);
    for (const r of rows) {
      await setSetValues(db, r.id, { reps, weight });
      await toggleSet(db, r.id, true);
    }
    await finishSession(db, id, at(day, 10));
    return id;
  }

  it('shows last time and starts the next workout from it', async () => {
    await doWorkout(10, 57.5, 8);
    await doWorkout(12, 60, 6);

    const history = await loadHistory(db);
    expect(lastPerformance('bench press', history)?.sets).toEqual([
      { reps: 6, weight: 60 },
      { reps: 6, weight: 60 },
    ]);

    // The next workout from the same exercise is prefilled with 6 x 60, not the template's 8 x 60.
    const id = await startSession(db, { templateId: null, name: 'Push', domainId: health, exercises: [ex('Bench press', 2, 8, 60)] }, at(15, 9));
    expect((await sets(id)).map((s) => [s.reps, s.weight])).toEqual([
      [6, 60],
      [6, 60],
    ]);
  });

  it('detects a personal record against finished workouts only', async () => {
    await doWorkout(10, 57.5, 8);
    const history = await loadHistory(db);

    const id = await startSession(db, { templateId: null, name: 'Push', domainId: health, exercises: [ex('Bench press', 1, 8, 60)] }, at(15, 9));
    const [row] = await sets(id);
    await setSetValues(db, row.id, { reps: 5, weight: 62.5 });
    await toggleSet(db, row.id, true);

    expect(findPersonalRecords(await sets(id), history)).toEqual([
      { exerciseName: 'Bench press', kind: 'weight', value: 62.5, previous: 57.5 },
    ]);
  });
});
