/** @jest-environment node */
import { eq } from 'drizzle-orm';

import { countByDay } from '@/features/activity/heatmap';
import { activeDomains } from '@/features/domains/logic';
import { makeDb } from '@/test/make-db';

import type { Db } from '../client';
import { doneTasksQuery, toActivityEvents } from '../queries';
import { archiveDomain, createDomain, moveDomain, restoreDomain, updateDomain } from '../repos/domains';
import { createTask, setTaskDone } from '../repos/tasks';
import * as schema from '../schema';
import { seedIfEmpty } from '../seed';
import { getSetting } from '../settings';

// expo-crypto is a native module and returns nothing under Jest, so use Node's UUIDs here.
jest.mock('../ids', () => ({ newId: () => jest.requireActual<typeof import('crypto')>('crypto').randomUUID() }));

let db: Db;

beforeEach(async () => {
  db = makeDb();
  await seedIfEmpty(db);
});

const all = () => db.select().from(schema.domains).all();
const order = () => activeDomains(all()).map((d) => d.name);
const idOf = (name: string) => all().find((d) => d.name === name)!.id;

describe('migration', () => {
  it('adds an archived column that defaults to false for the seeded domains', () => {
    expect(all().map((d) => d.archived)).toEqual([false, false, false, false]);
  });
});

describe('workout domain', () => {
  it('is remembered at seed time as the Health domain, and not overwritten later', async () => {
    const health = idOf('Health');
    expect(await getSetting(db, 'workoutDomainId')).toBe(health);

    // Renaming, recoloring and archiving Health can't move it: the id is what is stored.
    await updateDomain(db, health, { name: 'Body', color: 'custom1', icon: 'Heart' });
    await db.update(schema.domains).set({ color: 'health' }).where(eq(schema.domains.id, idOf('Life')));
    await seedIfEmpty(db); // next launch
    expect(await getSetting(db, 'workoutDomainId')).toBe(health);
  });
});

describe('createDomain', () => {
  it('appends at the end, trimmed, not marked as a default', async () => {
    const id = await createDomain(db, { name: '  Side project ', color: 'custom1', icon: 'Code' });
    expect(order()).toEqual(['Work', 'Study', 'Health', 'Life', 'Side project']);
    expect(all().find((d) => d.id === id)).toMatchObject({
      name: 'Side project',
      color: 'custom1',
      icon: 'Code',
      sortOrder: 4,
      isDefault: false,
      archived: false,
    });
  });

  it('keeps appending after an archived domain, never reusing its slot', async () => {
    archiveDomain(db, idOf('Life'));
    await createDomain(db, { name: 'Pets', color: 'custom2', icon: 'PawPrint' });
    expect(all().find((d) => d.name === 'Pets')!.sortOrder).toBe(4);
  });
});

describe('updateDomain', () => {
  it('changes name, color and icon, and nothing else', async () => {
    const id = idOf('Study');
    await updateDomain(db, id, { name: ' School ', color: 'custom3', icon: 'GraduationCap' });
    expect(all().find((d) => d.id === id)).toMatchObject({
      name: 'School',
      color: 'custom3',
      icon: 'GraduationCap',
      isDefault: true,
      archived: false,
      sortOrder: 1,
    });
  });
});

describe('moveDomain', () => {
  it('moves a domain down and up', () => {
    moveDomain(db, idOf('Work'), 'down');
    expect(order()).toEqual(['Study', 'Work', 'Health', 'Life']);
    moveDomain(db, idOf('Work'), 'up');
    expect(order()).toEqual(['Work', 'Study', 'Health', 'Life']);
  });

  it('does nothing at either end', () => {
    moveDomain(db, idOf('Work'), 'up');
    moveDomain(db, idOf('Life'), 'down');
    expect(order()).toEqual(['Work', 'Study', 'Health', 'Life']);
  });

  it('skips archived neighbours', () => {
    archiveDomain(db, idOf('Study'));
    moveDomain(db, idOf('Work'), 'down');
    expect(order()).toEqual(['Health', 'Work', 'Life']);
  });

  it('renumbers 0..n-1 even when sort orders had gaps and ties', async () => {
    await db.update(schema.domains).set({ sortOrder: 7 }).where(eq(schema.domains.id, idOf('Work')));
    await db.update(schema.domains).set({ sortOrder: 7 }).where(eq(schema.domains.id, idOf('Study')));
    // Display order is now Health(2), Life(3), Work(7), Study(7); moving Life up swaps it with Health.
    moveDomain(db, idOf('Life'), 'up');
    expect(order()).toEqual(['Life', 'Health', 'Work', 'Study']);
    expect(activeDomains(all()).map((d) => d.sortOrder)).toEqual([0, 1, 2, 3]);
  });

  it('ignores an unknown or archived id', () => {
    archiveDomain(db, idOf('Life'));
    moveDomain(db, 'nope', 'up');
    moveDomain(db, idOf('Life'), 'up');
    expect(order()).toEqual(['Work', 'Study', 'Health']);
  });
});

describe('archive and restore', () => {
  it('archives without deleting, and the active list drops it', () => {
    archiveDomain(db, idOf('Study'));
    expect(order()).toEqual(['Work', 'Health', 'Life']);
    expect(all()).toHaveLength(4);
  });

  it('keeps the tasks of an archived domain and their activity history', async () => {
    const study = idOf('Study');
    const taskId = await createTask(db, { title: 'Read ch. 3', domainId: study, energy: 'medium' });
    await setTaskDone(db, taskId, true, new Date(2026, 9, 14, 12).getTime());
    archiveDomain(db, study);

    const [task] = await db.select().from(schema.tasks);
    expect(task).toMatchObject({ domainId: study, status: 'done' });
    const events = toActivityEvents(await doneTasksQuery(db), [], [], []);
    expect(countByDay(events)['2026-10-14']).toBe(1);
    expect(countByDay(events, study)['2026-10-14']).toBe(1);
  });

  it('refuses to archive the last active domain and changes nothing', () => {
    archiveDomain(db, idOf('Study'));
    archiveDomain(db, idOf('Health'));
    archiveDomain(db, idOf('Life'));
    expect(() => archiveDomain(db, idOf('Work'))).toThrow(/at least one/);
    expect(order()).toEqual(['Work']);
  });

  it('refuses an unknown id', () => {
    expect(() => archiveDomain(db, 'nope')).toThrow();
  });

  it('restores an archived domain at the end of the list', () => {
    const study = idOf('Study');
    archiveDomain(db, study);
    restoreDomain(db, study);
    expect(order()).toEqual(['Work', 'Health', 'Life', 'Study']);
  });
});
