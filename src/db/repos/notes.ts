import { and, desc, eq, sql } from 'drizzle-orm';

import type { Db } from '../client';
import { newId } from '../ids';
import { notes, tasks } from '../schema';
import type { TaskInput } from './tasks';

/** Saves a quick note to the inbox. Throws on an empty note. */
export async function createNote(db: Db, body: string): Promise<string> {
  const text = body.trim();
  if (!text) throw new Error('A note needs some text.');
  const id = newId();
  await db.insert(notes).values({ id, body: text });
  return id;
}

/** Unprocessed notes, newest first. `rowid` breaks ties: createdAt only has one-second resolution. */
export const inboxNotesQuery = (db: Db) =>
  db
    .select()
    .from(notes)
    .where(eq(notes.processed, false))
    .orderBy(desc(notes.createdAt), desc(sql`${notes}.rowid`));

/** Archive means "dealt with, no task". The note stays in the table. */
export async function archiveNote(db: Db, id: string): Promise<void> {
  await db.update(notes).set({ processed: true }).where(eq(notes.id, id));
}

/**
 * Creates a task from a note and marks the note processed, in one transaction:
 * if either write fails, neither happens. Returns the new task id.
 */
export function convertNoteToTask(db: Db, noteId: string, input: TaskInput): string {
  const taskId = newId();
  db.transaction((tx) => {
    tx.insert(tasks)
      .values({
        id: taskId,
        title: input.title.trim(),
        notes: input.notes?.trim() || null,
        domainId: input.domainId,
        energy: input.energy,
        dueDate: input.dueDate ?? null,
        estimateMin: input.estimateMin ?? null,
      })
      .run();
    const result = tx
      .update(notes)
      .set({ processed: true, convertedTaskId: taskId })
      .where(and(eq(notes.id, noteId), eq(notes.processed, false)))
      .run();
    // Already handled (say, from a second tap): roll back rather than make a duplicate task.
    if (result.changes === 0) throw new Error('This note was already processed.');
  });
  return taskId;
}
