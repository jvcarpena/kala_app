/** @jest-environment node */
import { parseBackup, TABLE_ORDER, type Backup } from '@/features/backup/format';
import { makeDb } from '@/test/make-db';

import type { Db } from '../client';
import { exportData, importData } from '../repos/backup';
import * as schema from '../schema';
import { SCHEMA_VERSION } from '../schema-version';
import { seedIfEmpty } from '../seed';
import { getSetting, setSetting } from '../settings';

// expo-crypto is a native module and returns nothing under Jest, so use Node's UUIDs here.
jest.mock('../ids', () => ({ newId: () => jest.requireActual<typeof import('crypto')>('crypto').randomUUID() }));

const T = new Date(2026, 9, 15, 9).getTime();

/** One row (or a few) in every table, including a note converted into a task and an archived domain. */
async function seedEverything(db: Db) {
  await seedIfEmpty(db);
  const [work] = await db.select().from(schema.domains);
  await db.insert(schema.domains).values({ id: 'd-old', name: 'Old hobby', color: 'custom2', icon: 'Leaf', sortOrder: 9, archived: true });
  await db.insert(schema.tasks).values([
    { id: 't1', title: 'Write report', domainId: work.id, energy: 'high', dueDate: '2026-10-15', estimateMin: 50 },
    { id: 't2', title: 'Pay rent', domainId: work.id, energy: 'low', status: 'done', completedAt: T },
  ]);
  await db.insert(schema.habits).values({ id: 'h1', name: 'Drink water', domainId: work.id, type: 'count', target: 8, unit: 'glasses', schedule: '[0,1,2,3,4,5,6]', reminderTime: '07:00' });
  await db.insert(schema.habitLogs).values({ id: 'l1', habitId: 'h1', date: '2026-10-15', value: 6 });
  await db.insert(schema.focusSessions).values({ id: 'f1', taskId: 't1', domainId: work.id, startedAt: T, endedAt: T + 1500000, plannedMin: 25, completed: true });
  await db.insert(schema.workoutTemplates).values({ id: 'wt1', name: 'Push' });
  await db.insert(schema.templateExercises).values({ id: 'te1', templateId: 'wt1', name: 'Bench press', sets: 3, reps: 8, weight: 60, restSec: 120, sortOrder: 0 });
  await db.insert(schema.workoutSessions).values({ id: 'ws1', templateId: 'wt1', name: 'Push', domainId: work.id, startedAt: T, endedAt: T + 3600000 });
  await db.insert(schema.workoutSets).values({ id: 'set1', sessionId: 'ws1', exerciseName: 'Bench press', setIndex: 0, reps: 8, weight: 62.5, done: true });
  await db.insert(schema.notes).values([
    { id: 'n1', body: 'Call the clinic' },
    { id: 'n2', body: 'Write report', processed: true, convertedTaskId: 't1' },
  ]);
  await setSetting(db, 'language', 'english');
  await setSetting(db, 'activeTimer', { taskId: 't1' } as never);
  await setSetting(db, 'restTimer', { endsAt: T } as never);
}

/** Every table's rows, sorted by primary key, for deep comparison. */
async function snapshot(db: Db) {
  const out: Record<string, unknown[]> = {};
  const tables = {
    domains: schema.domains,
    tasks: schema.tasks,
    habits: schema.habits,
    habitLogs: schema.habitLogs,
    focusSessions: schema.focusSessions,
    workoutTemplates: schema.workoutTemplates,
    templateExercises: schema.templateExercises,
    workoutSessions: schema.workoutSessions,
    workoutSets: schema.workoutSets,
    notes: schema.notes,
    settings: schema.settings,
  };
  for (const [name, table] of Object.entries(tables)) {
    const rows = (await db.select().from(table)) as Record<string, string>[];
    out[name] = rows.sort((a, b) => String(a.id ?? a.key).localeCompare(String(b.id ?? b.key)));
  }
  return out;
}

/** Export, then go through JSON text and the parser, exactly as a real file would. */
async function roundTripFile(db: Db): Promise<Backup> {
  const text = JSON.stringify(await exportData(db, T));
  const parsed = parseBackup(text, SCHEMA_VERSION);
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.backup;
}

describe('exportData', () => {
  it('includes every table, the versions and the time, but not transient settings', async () => {
    const db = makeDb();
    await seedEverything(db);
    const backup = await exportData(db, T);

    expect(backup).toMatchObject({ app: 'kala', formatVersion: 1, schemaVersion: SCHEMA_VERSION, exportedAt: T });
    expect(Object.keys(backup.data).sort()).toEqual([...TABLE_ORDER].sort());
    const keys = backup.data.settings.map((r) => r.key);
    expect(keys).toContain('language');
    expect(keys).toContain('workoutDomainId');
    expect(keys).not.toContain('activeTimer');
    expect(keys).not.toContain('restTimer');
  });
});

describe('importData', () => {
  it('round-trips every table into a fresh database, row for row', async () => {
    const source = makeDb();
    await seedEverything(source);
    const backup = await roundTripFile(source);

    const target = makeDb();
    importData(target, backup);

    const before = await snapshot(source);
    const after = await snapshot(target);
    // Transient settings are the one deliberate difference.
    before.settings = before.settings.filter((r) => !['activeTimer', 'restTimer'].includes((r as { key: string }).key));
    expect(after).toEqual(before);
    expect(await getSetting(target, 'activeTimer')).toBeNull();
  });

  it('replaces what was there, and clears a running timer', async () => {
    const source = makeDb();
    await seedEverything(source);
    const backup = await roundTripFile(source);

    const target = makeDb();
    await seedIfEmpty(target);
    await target.insert(schema.tasks).values({ id: 'mine', title: 'Only on this phone', domainId: (await target.select().from(schema.domains))[0].id, energy: 'medium' });
    await setSetting(target, 'activeTimer', { taskId: 'mine' } as never);

    importData(target, backup);

    const titles = (await target.select().from(schema.tasks)).map((t) => t.title).sort();
    expect(titles).toEqual(['Pay rent', 'Write report']);
    expect((await target.select().from(schema.domains)).map((d) => d.name).sort()).toEqual(
      ['Health', 'Life', 'Old hobby', 'Study', 'Work'],
    );
    expect(await getSetting(target, 'activeTimer')).toBeNull();
  });

  it('changes nothing when a row is rejected (a task pointing at a missing domain)', async () => {
    const source = makeDb();
    await seedEverything(source);
    const backup = await roundTripFile(source);
    backup.data.tasks.push({ id: 'bad', title: 'Orphan', domainId: 'no-such-domain', energy: 'medium' });

    const target = makeDb();
    await seedEverything(target);
    await target.insert(schema.tasks).values({ id: 'keep', title: 'Keep me', domainId: 'd-old', energy: 'low' });
    const before = await snapshot(target);

    expect(() => importData(target, backup)).toThrow();
    expect(await snapshot(target)).toEqual(before);
  });

  it('changes nothing when two rows share an id', async () => {
    const source = makeDb();
    await seedEverything(source);
    const backup = await roundTripFile(source);
    backup.data.notes.push({ ...backup.data.notes[0] });

    const target = makeDb();
    await seedEverything(target);
    const before = await snapshot(target);
    expect(() => importData(target, backup)).toThrow();
    expect(await snapshot(target)).toEqual(before);
  });

  it('imports an older backup: a missing column takes its default, an unknown one is ignored', async () => {
    const source = makeDb();
    await seedEverything(source);
    const backup = await roundTripFile(source);
    // As if exported before domains.archived existed, and with a column this app doesn't know.
    backup.schemaVersion = 2;
    backup.data.domains = backup.data.domains
      .filter((d) => d.id !== 'd-old')
      .map(({ archived: _archived, ...rest }) => ({ ...rest, futureColumn: 'ignored' }));

    const target = makeDb();
    importData(target, backup);
    const rows = await target.select().from(schema.domains);
    expect(rows).toHaveLength(4);
    expect(rows.every((d) => d.archived === false)).toBe(true);
  });

  it('imports more rows than fit in one statement', async () => {
    const source = makeDb();
    await seedEverything(source);
    const backup = await roundTripFile(source);
    const domainId = backup.data.domains[0].id;
    for (let i = 0; i < 250; i++) backup.data.tasks.push({ id: `bulk-${i}`, title: `Task ${i}`, domainId, energy: 'medium' });

    const target = makeDb();
    importData(target, backup);
    expect(await target.select().from(schema.tasks)).toHaveLength(252);
  });
});
