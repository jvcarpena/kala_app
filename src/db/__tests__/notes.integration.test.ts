/** @jest-environment node */
import { eq } from 'drizzle-orm';

import { makeDb } from '@/test/make-db';

import type { Db } from '../client';
import { archiveNote, convertNoteToTask, createNote, inboxNotesQuery } from '../repos/notes';
import * as schema from '../schema';
import { seedIfEmpty } from '../seed';

// expo-crypto is a native module and returns nothing under Jest, so use Node's UUIDs here.
jest.mock('../ids', () => ({ newId: () => jest.requireActual<typeof import('crypto')>('crypto').randomUUID() }));

let db: Db;
let work: string;

beforeEach(async () => {
  db = makeDb();
  await seedIfEmpty(db);
  work = (await db.select().from(schema.domains)).find((d) => d.name === 'Work')!.id;
});

const inbox = () => inboxNotesQuery(db);
const taskInput = (title: string, domainId = work) => ({ title, notes: 'n', domainId, energy: 'medium' as const });

describe('createNote', () => {
  it('saves a trimmed note as unprocessed', async () => {
    const id = await createNote(db, '  call the bank  ');
    const [row] = await inbox();
    expect(row).toMatchObject({ id, body: 'call the bank', processed: false, convertedTaskId: null, domainId: null });
  });

  it('rejects an empty or blank note and saves nothing', async () => {
    await expect(createNote(db, '')).rejects.toThrow();
    await expect(createNote(db, '   \n ')).rejects.toThrow();
    expect(await db.select().from(schema.notes)).toHaveLength(0);
  });
});

describe('inbox order', () => {
  it('lists newest first, even when notes are created in the same second', async () => {
    const a = await createNote(db, 'first');
    const b = await createNote(db, 'second');
    const c = await createNote(db, 'third');
    expect((await inbox()).map((n) => n.id)).toEqual([c, b, a]);
  });

  it('puts an older timestamp after a newer one', async () => {
    const old = await createNote(db, 'old');
    await db.update(schema.notes).set({ createdAt: 1000 }).where(eqId(old));
    const fresh = await createNote(db, 'fresh');
    expect((await inbox()).map((n) => n.id)).toEqual([fresh, old]);
  });
});

describe('archiveNote', () => {
  it('removes a note from the inbox but keeps the row, without making a task', async () => {
    const id = await createNote(db, 'not needed');
    await archiveNote(db, id);
    expect(await inbox()).toHaveLength(0);
    const [row] = await db.select().from(schema.notes);
    expect(row).toMatchObject({ id, processed: true, convertedTaskId: null });
    expect(await db.select().from(schema.tasks)).toHaveLength(0);
  });
});

describe('convertNoteToTask', () => {
  it('creates the task, marks the note processed and links them', async () => {
    const noteId = await createNote(db, 'Email Sam\nabout the invoice');
    const taskId = convertNoteToTask(db, noteId, taskInput('Email Sam'));

    const [task] = await db.select().from(schema.tasks);
    expect(task).toMatchObject({ id: taskId, title: 'Email Sam', notes: 'n', domainId: work, status: 'todo' });
    const [note] = await db.select().from(schema.notes);
    expect(note).toMatchObject({ processed: true, convertedTaskId: taskId });
    expect(await inbox()).toHaveLength(0);
  });

  it('leaves no task and an unprocessed note when the task cannot be created', async () => {
    const noteId = await createNote(db, 'will fail');
    expect(() => convertNoteToTask(db, noteId, taskInput('x', 'no-such-domain'))).toThrow();
    expect(await db.select().from(schema.tasks)).toHaveLength(0);
    expect((await inbox()).map((n) => n.id)).toEqual([noteId]);
  });

  it('rolls the task back when the note was already processed', async () => {
    const noteId = await createNote(db, 'once only');
    convertNoteToTask(db, noteId, taskInput('first'));
    expect(() => convertNoteToTask(db, noteId, taskInput('duplicate'))).toThrow(/already processed/);
    const titles = (await db.select().from(schema.tasks)).map((t) => t.title);
    expect(titles).toEqual(['first']);
  });

  it('rolls the task back when the note does not exist', async () => {
    expect(() => convertNoteToTask(db, 'missing', taskInput('orphan'))).toThrow();
    expect(await db.select().from(schema.tasks)).toHaveLength(0);
  });

  it('keeps the link if the task is later archived', async () => {
    const noteId = await createNote(db, 'link me');
    const taskId = convertNoteToTask(db, noteId, taskInput('link me'));
    await db.update(schema.tasks).set({ status: 'archived' }).where(eqId(taskId, schema.tasks));
    const [note] = await db.select().from(schema.notes);
    expect(note.convertedTaskId).toBe(taskId);
  });
});

function eqId(id: string, table: typeof schema.notes | typeof schema.tasks = schema.notes) {
  return eq(table.id, id);
}
