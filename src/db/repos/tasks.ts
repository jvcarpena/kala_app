import { eq } from 'drizzle-orm';

import type { Db } from '../client';
import { newId } from '../ids';
import { tasks, type Task } from '../schema';

export type TaskInput = {
  title: string;
  notes?: string | null;
  domainId: string;
  energy: Task['energy'];
  dueDate?: string | null;
  estimateMin?: number | null;
};

export async function createTask(db: Db, input: TaskInput): Promise<string> {
  const id = newId();
  await db.insert(tasks).values({
    id,
    title: input.title.trim(),
    notes: input.notes?.trim() || null,
    domainId: input.domainId,
    energy: input.energy,
    dueDate: input.dueDate ?? null,
    estimateMin: input.estimateMin ?? null,
  });
  return id;
}

export async function getTask(db: Db, id: string): Promise<Task | undefined> {
  const [row] = await db.select().from(tasks).where(eq(tasks.id, id));
  return row;
}

export async function updateTask(db: Db, id: string, input: TaskInput): Promise<void> {
  await db
    .update(tasks)
    .set({
      title: input.title.trim(),
      notes: input.notes?.trim() || null,
      domainId: input.domainId,
      energy: input.energy,
      dueDate: input.dueDate ?? null,
      estimateMin: input.estimateMin ?? null,
    })
    .where(eq(tasks.id, id));
}

/** Checks a task off (stamping when) or puts it back on the list. */
export async function setTaskDone(db: Db, id: string, done: boolean, now: number = Date.now()): Promise<void> {
  await db
    .update(tasks)
    .set(done ? { status: 'done', completedAt: now } : { status: 'todo', completedAt: null })
    .where(eq(tasks.id, id));
}

export async function setTaskDueDate(db: Db, id: string, dueDate: string | null): Promise<void> {
  await db.update(tasks).set({ dueDate }).where(eq(tasks.id, id));
}

/** Soft delete. Archived tasks disappear from every list but can be restored. */
export async function archiveTask(db: Db, id: string): Promise<void> {
  await db.update(tasks).set({ status: 'archived' }).where(eq(tasks.id, id));
}

export async function restoreTask(db: Db, id: string): Promise<void> {
  await db.update(tasks).set({ status: 'todo', completedAt: null }).where(eq(tasks.id, id));
}
