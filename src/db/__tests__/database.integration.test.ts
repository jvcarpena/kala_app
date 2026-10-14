/** @jest-environment node */
import { countByDay } from '@/features/activity/heatmap';
import { FOCUS_PRESETS } from '@/features/focus/presets';
import { applyFocusPreset, setCustomFocus, turnOffFocusMode } from '@/features/focus/store';
import { bucketForToday } from '@/features/tasks/logic';

import { makeDb } from '@/test/make-db';

import type { Db } from '../client';
import { doneTasksQuery, focusSessionsQuery, habitLogsQuery, toActivityEvents, workoutsQuery } from '../queries';
import { addToHabitLog, archiveHabit, createHabit, getHabit, getLogValue, setHabitLog } from '../repos/habits';
import { archiveTask, createTask, getTask, restoreTask, setTaskDone, setTaskDueDate, updateTask } from '../repos/tasks';
import * as schema from '../schema';
import { seedIfEmpty } from '../seed';
import { getSetting, setSetting } from '../settings';

// expo-crypto is a native module and returns nothing under Jest, so use Node's UUIDs here.
jest.mock('../ids', () => ({ newId: () => jest.requireActual<typeof import('crypto')>('crypto').randomUUID() }));

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();

let db: Db;
let work: string;
let study: string;
let health: string;

beforeEach(async () => {
  db = makeDb();
  await seedIfEmpty(db);
  const rows = await db.select().from(schema.domains);
  const id = (name: string) => rows.find((d) => d.name === name)!.id;
  [work, study, health] = [id('Work'), id('Study'), id('Health')];
});

describe('migrations and seed', () => {
  it('seeds the four default domains in order, once', async () => {
    await seedIfEmpty(db); // second launch
    const rows = await db.select().from(schema.domains).orderBy(schema.domains.sortOrder);
    expect(rows.map((d) => [d.name, d.color, d.isDefault])).toEqual([
      ['Work', 'work', true],
      ['Study', 'study', true],
      ['Health', 'health', true],
      ['Life', 'life', true],
    ]);
  });
});

describe('settings', () => {
  it('returns defaults, then stores and overwrites values', async () => {
    expect(await getSetting(db, 'companion')).toBe('chatty');
    await setSetting(db, 'companion', 'quiet');
    await setSetting(db, 'companion', 'off');
    expect(await getSetting(db, 'companion')).toBe('off');
    expect(await db.select().from(schema.settings)).toHaveLength(1);
  });

  it('round-trips structured values', async () => {
    await setSetting(db, 'pomodoro', { focusMin: 50, breakMin: 10 });
    expect(await getSetting(db, 'pomodoro')).toEqual({ focusMin: 50, breakMin: 10 });
  });
});

describe('task repository', () => {
  it('creates a task with trimmed text and sensible defaults', async () => {
    const id = await createTask(db, { title: '  Finish API spec  ', notes: '   ', domainId: work, energy: 'high' });
    const task = (await getTask(db, id))!;
    expect(task).toMatchObject({
      title: 'Finish API spec',
      notes: null,
      domainId: work,
      energy: 'high',
      status: 'todo',
      dueDate: null,
      completedAt: null,
    });
    expect(task.createdAt).toBeGreaterThan(0);
  });

  it('updates fields', async () => {
    const id = await createTask(db, { title: 'Read', domainId: study, energy: 'low' });
    await updateTask(db, id, { title: 'Read chapter 3', domainId: study, energy: 'medium', dueDate: '2025-10-16', estimateMin: 30 });
    expect(await getTask(db, id)).toMatchObject({ title: 'Read chapter 3', energy: 'medium', dueDate: '2025-10-16', estimateMin: 30 });
  });

  it('completes and un-completes, stamping when', async () => {
    const id = await createTask(db, { title: 'Run', domainId: health, energy: 'high' });
    await setTaskDone(db, id, true, at(2025, 10, 15));
    expect(await getTask(db, id)).toMatchObject({ status: 'done', completedAt: at(2025, 10, 15) });
    await setTaskDone(db, id, false);
    expect(await getTask(db, id)).toMatchObject({ status: 'todo', completedAt: null });
  });

  it('moves a due date, archives and restores', async () => {
    const id = await createTask(db, { title: 'Pay rent', domainId: work, energy: 'low', dueDate: '2025-10-10' });
    await setTaskDueDate(db, id, '2025-10-15');
    expect((await getTask(db, id))!.dueDate).toBe('2025-10-15');
    await archiveTask(db, id);
    expect((await getTask(db, id))!.status).toBe('archived');
    await restoreTask(db, id);
    expect((await getTask(db, id))!.status).toBe('todo');
  });

  it('refuses a task for a domain that does not exist (foreign keys are on)', async () => {
    await expect(createTask(db, { title: 'Orphan', domainId: 'nope', energy: 'low' })).rejects.toThrow();
  });

  it('feeds the Today buckets through the real database', async () => {
    await createTask(db, { title: 'Overdue', domainId: work, energy: 'low', dueDate: '2025-10-14' });
    await createTask(db, { title: 'Due today', domainId: work, energy: 'low', dueDate: '2025-10-15' });
    const doneId = await createTask(db, { title: 'Finished', domainId: study, energy: 'low', dueDate: '2025-10-15' });
    await setTaskDone(db, doneId, true, at(2025, 10, 15, 9));
    const b = bucketForToday(await db.select().from(schema.tasks), '2025-10-15');
    expect(b.overdue.map((t) => t.title)).toEqual(['Overdue']);
    expect(b.dueToday.map((t) => t.title)).toEqual(['Due today']);
    expect(b.doneToday.map((t) => t.title)).toEqual(['Finished']);
  });
});

describe('focus mode', () => {
  it('applies a preset, switches to custom, and turns off', async () => {
    const domains = await db.select().from(schema.domains);
    const gym = FOCUS_PRESETS.find((p) => p.name === 'Gym time')!;

    await applyFocusPreset(db, gym, domains);
    expect(await getSetting(db, 'focusPreset')).toBe('Gym time');
    expect(await getSetting(db, 'hiddenDomainIds')).toEqual([work, study]);

    await setCustomFocus(db, [health]);
    expect(await getSetting(db, 'focusPreset')).toBe('Custom');
    expect(await getSetting(db, 'hiddenDomainIds')).toEqual([health]);

    await setCustomFocus(db, []);
    expect(await getSetting(db, 'focusPreset')).toBeNull();

    await applyFocusPreset(db, gym, domains);
    await turnOffFocusMode(db);
    expect(await getSetting(db, 'focusPreset')).toBeNull();
    expect(await getSetting(db, 'hiddenDomainIds')).toEqual([]);
  });
});

describe('activity grid data', () => {
  async function load() {
    return toActivityEvents(
      await doneTasksQuery(db),
      await habitLogsQuery(db),
      await focusSessionsQuery(db),
      await workoutsQuery(db),
    );
  }

  it('counts finished tasks on the local day they were finished', async () => {
    const a = await createTask(db, { title: 'A', domainId: work, energy: 'low' });
    const b = await createTask(db, { title: 'B', domainId: work, energy: 'low' });
    const c = await createTask(db, { title: 'C', domainId: study, energy: 'low' });
    await createTask(db, { title: 'Not done', domainId: study, energy: 'low' });
    await setTaskDone(db, a, true, at(2025, 10, 15, 8));
    await setTaskDone(db, b, true, at(2025, 10, 15, 23));
    await setTaskDone(db, c, true, at(2025, 10, 14, 12));

    const counts = countByDay(await load());
    expect(counts).toEqual({ '2025-10-15': 2, '2025-10-14': 1 });
    expect(countByDay(await load(), study)).toEqual({ '2025-10-14': 1 });
  });

  it('stops counting a task that is un-checked or deleted', async () => {
    const a = await createTask(db, { title: 'A', domainId: work, energy: 'low' });
    const b = await createTask(db, { title: 'B', domainId: work, energy: 'low' });
    await setTaskDone(db, a, true, at(2025, 10, 15));
    await setTaskDone(db, b, true, at(2025, 10, 15));
    await setTaskDone(db, a, false);
    await archiveTask(db, b); // status becomes 'archived', so it no longer counts as done
    expect(await load()).toEqual([]);
  });

  it('also counts habit logs, focus sessions and workouts under their domains', async () => {
    const habitId = 'h1';
    await db.insert(schema.habits).values({ id: habitId, name: 'Read 20 pages', domainId: study });
    await db.insert(schema.habitLogs).values({ id: 'l1', habitId, date: '2025-10-15', value: 1 });
    await db.insert(schema.focusSessions).values([
      { id: 'f1', domainId: work, startedAt: at(2025, 10, 15, 9), plannedMin: 25, kind: 'focus', completed: true },
      { id: 'f2', domainId: work, startedAt: at(2025, 10, 15, 10), plannedMin: 25, kind: 'focus', completed: false },
      { id: 'f3', domainId: work, startedAt: at(2025, 10, 15, 11), plannedMin: 5, kind: 'break', completed: true },
    ]);
    await db.insert(schema.workoutSessions).values([
      { id: 'w1', name: 'Push day', domainId: health, startedAt: at(2025, 10, 15, 17), endedAt: at(2025, 10, 15, 18) },
      { id: 'w2', name: 'Abandoned', domainId: health, startedAt: at(2025, 10, 15, 19), endedAt: null },
    ]);

    const events = await load();
    // 1 habit log + 1 completed focus session (not the unfinished one or the break) + 1 finished workout.
    expect(events).toHaveLength(3);
    expect(countByDay(events)).toEqual({ '2025-10-15': 3 });
    expect(countByDay(events, health)).toEqual({ '2025-10-15': 1 });
    expect(countByDay(events, study)).toEqual({ '2025-10-15': 1 });
  });

  it('deleting a habit removes its logs (cascade) and their activity', async () => {
    await db.insert(schema.habits).values({ id: 'h1', name: 'Water', domainId: health });
    await db.insert(schema.habitLogs).values({ id: 'l1', habitId: 'h1', date: '2025-10-15', value: 1 });
    expect(await load()).toHaveLength(1);
    await db.delete(schema.habits);
    expect(await load()).toEqual([]);
  });
});

describe('habit repository', () => {
  const base = { name: 'Drink water', domainId: '', type: 'count' as const, target: 8, unit: 'glasses', schedule: [0, 1, 2, 3, 4, 5, 6] };

  it('normalises what it stores: yes/no habits ignore target and unit, schedules are sorted and unique', async () => {
    const id = await createHabit(db, { ...base, domainId: health, name: '  Gym  ', type: 'check', target: 5, unit: 'x', schedule: [4, 0, 2, 2] });
    expect(await getHabit(db, id)).toMatchObject({ name: 'Gym', type: 'check', target: 1, unit: null, schedule: '[0,2,4]' });
  });

  it('keeps a count habit target of at least 1', async () => {
    const id = await createHabit(db, { ...base, domainId: health, target: 0 });
    expect((await getHabit(db, id))!.target).toBe(1);
  });

  it('logs one value per day, overwriting instead of duplicating', async () => {
    const id = await createHabit(db, { ...base, domainId: health });
    await setHabitLog(db, id, '2025-10-15', 3);
    await setHabitLog(db, id, '2025-10-15', 5);
    expect(await db.select().from(schema.habitLogs)).toHaveLength(1);
    expect(await getLogValue(db, id, '2025-10-15')).toBe(5);
  });

  it('adds to a count, never goes below zero, and removes the row at zero', async () => {
    const id = await createHabit(db, { ...base, domainId: health });
    expect(await addToHabitLog(db, id, '2025-10-15', 1)).toBe(1);
    expect(await addToHabitLog(db, id, '2025-10-15', 1)).toBe(2);
    expect(await addToHabitLog(db, id, '2025-10-15', -5)).toBe(0);
    expect(await db.select().from(schema.habitLogs)).toHaveLength(0);
  });

  it('archiving hides the habit and clears its reminder but keeps the history', async () => {
    const id = await createHabit(db, { ...base, domainId: health, reminderTime: '07:00' });
    await setHabitLog(db, id, '2025-10-15', 8);
    await archiveHabit(db, id);
    expect(await getHabit(db, id)).toMatchObject({ archived: true, reminderTime: null });
    expect(await db.select().from(schema.habitLogs)).toHaveLength(1);
  });

  it('only counts a count habit toward activity once it reaches its target', async () => {
    const id = await createHabit(db, { ...base, domainId: health });
    await setHabitLog(db, id, '2025-10-14', 7); // 7 of 8: not done
    await setHabitLog(db, id, '2025-10-15', 8); // 8 of 8: done
    const events = toActivityEvents([], await habitLogsQuery(db), [], []);
    expect(countByDay(events)).toEqual({ '2025-10-15': 1 });
  });
});
