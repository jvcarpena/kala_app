import { and, asc, desc, eq, isNotNull, isNull, max } from 'drizzle-orm';

import {
  type HistorySet,
  STARTER_TEMPLATES,
  type TemplateExercise,
  buildSessionSets,
  exerciseKey,
} from '@/features/fitness/logic';

import type { Db } from '../client';
import { newId } from '../ids';
import { templateExercises, workoutSessions, workoutSets, workoutTemplates } from '../schema';

// ---- Templates ---------------------------------------------------------------------------

const exerciseRows = (templateId: string, exercises: TemplateExercise[]) =>
  exercises.map((e, i) => ({
    id: newId(),
    templateId,
    name: e.name.trim(),
    sets: Math.max(1, Math.round(e.sets)),
    reps: Math.max(1, Math.round(e.reps)),
    weight: e.weight,
    restSec: Math.max(0, Math.round(e.restSec)),
    sortOrder: i,
  }));

export async function createTemplate(db: Db, name: string, exercises: TemplateExercise[]): Promise<string> {
  const id = newId();
  await db.insert(workoutTemplates).values({ id, name: name.trim() });
  const rows = exerciseRows(id, exercises.filter((e) => e.name.trim()));
  if (rows.length > 0) await db.insert(templateExercises).values(rows);
  return id;
}

export async function getTemplate(db: Db, id: string) {
  const [template] = await db.select().from(workoutTemplates).where(eq(workoutTemplates.id, id));
  if (!template) return undefined;
  const exercises = await db.select().from(templateExercises).where(eq(templateExercises.templateId, id)).orderBy(asc(templateExercises.sortOrder));
  return { template, exercises };
}

/** Replaces the template's name and exercises. Past workouts keep their own copy of the sets. */
export async function updateTemplate(db: Db, id: string, name: string, exercises: TemplateExercise[]): Promise<void> {
  await db.update(workoutTemplates).set({ name: name.trim() }).where(eq(workoutTemplates.id, id));
  await db.delete(templateExercises).where(eq(templateExercises.templateId, id));
  const rows = exerciseRows(id, exercises.filter((e) => e.name.trim()));
  if (rows.length > 0) await db.insert(templateExercises).values(rows);
}

/** Past workouts stay in your history; they just stop pointing at the template. */
export async function deleteTemplate(db: Db, id: string): Promise<void> {
  await db.delete(workoutTemplates).where(eq(workoutTemplates.id, id));
}

/** Adds the push / pull / legs starters, skipping any name you already have. Returns how many were added. */
export async function addStarterTemplates(db: Db): Promise<number> {
  const existing = new Set((await db.select({ name: workoutTemplates.name }).from(workoutTemplates)).map((t) => exerciseKey(t.name)));
  let added = 0;
  for (const s of STARTER_TEMPLATES) {
    if (existing.has(exerciseKey(s.name))) continue;
    await createTemplate(db, s.name, s.exercises);
    added++;
  }
  return added;
}

// ---- History ------------------------------------------------------------------------------

/** Every completed set from finished workouts: what "last time" and personal records compare against. */
export const historyQuery = (db: Db) =>
  db
    .select({
      name: workoutSets.exerciseName,
      sessionId: workoutSessions.id,
      endedAt: workoutSessions.endedAt,
      setIndex: workoutSets.setIndex,
      reps: workoutSets.reps,
      weight: workoutSets.weight,
    })
    .from(workoutSets)
    .innerJoin(workoutSessions, eq(workoutSets.sessionId, workoutSessions.id))
    .where(and(eq(workoutSets.done, true), isNotNull(workoutSessions.endedAt)));

type HistoryRow = Awaited<ReturnType<ReturnType<typeof historyQuery>['execute']>>[number];

export const toHistory = (rows: HistoryRow[]): HistorySet[] =>
  rows.map((r) => ({
    key: exerciseKey(r.name),
    sessionId: r.sessionId,
    endedAt: r.endedAt ?? 0,
    setIndex: r.setIndex,
    reps: r.reps,
    weight: r.weight,
  }));

export async function loadHistory(db: Db): Promise<HistorySet[]> {
  return toHistory(await historyQuery(db));
}

// ---- Sessions -----------------------------------------------------------------------------

export async function getActiveSessionId(db: Db): Promise<string | null> {
  const [row] = await db.select({ id: workoutSessions.id }).from(workoutSessions).where(isNull(workoutSessions.endedAt)).limit(1);
  return row?.id ?? null;
}

/**
 * Starts a workout from a template (or empty). Only one can be active: if one already is,
 * its id is returned and nothing new is created.
 */
export async function startSession(
  db: Db,
  input: { templateId: string | null; name: string; domainId: string; exercises: TemplateExercise[] },
  now: number = Date.now(),
): Promise<string> {
  const active = await getActiveSessionId(db);
  if (active) return active;

  const id = newId();
  await db.insert(workoutSessions).values({ id, templateId: input.templateId, name: input.name.trim() || 'Workout', domainId: input.domainId, startedAt: now });
  const sets = buildSessionSets(input.exercises, await loadHistory(db));
  if (sets.length > 0) await db.insert(workoutSets).values(sets.map((s) => ({ id: newId(), sessionId: id, ...s, done: false })));
  return id;
}

export async function setSetValues(db: Db, setId: string, values: { reps?: number; weight?: number | null }): Promise<void> {
  await db.update(workoutSets).set(values).where(eq(workoutSets.id, setId));
}

export async function toggleSet(db: Db, setId: string, done: boolean): Promise<void> {
  await db.update(workoutSets).set({ done }).where(eq(workoutSets.id, setId));
}

/** Adds a set to an exercise, copying its last set. */
export async function addSet(db: Db, sessionId: string, exerciseOrder: number): Promise<void> {
  const [last] = await db
    .select()
    .from(workoutSets)
    .where(and(eq(workoutSets.sessionId, sessionId), eq(workoutSets.exerciseOrder, exerciseOrder)))
    .orderBy(desc(workoutSets.setIndex))
    .limit(1);
  if (!last) return;
  await db.insert(workoutSets).values({
    id: newId(),
    sessionId,
    exerciseName: last.exerciseName,
    exerciseOrder,
    restSec: last.restSec,
    setIndex: last.setIndex + 1,
    reps: last.reps,
    weight: last.weight,
    done: false,
  });
}

export async function removeSet(db: Db, setId: string): Promise<void> {
  await db.delete(workoutSets).where(eq(workoutSets.id, setId));
}

/** Adds an exercise (3 sets) to a running workout, starting from what you did last time. */
export async function addExercise(db: Db, sessionId: string, name: string, restSec = 90): Promise<void> {
  const [{ top }] = await db.select({ top: max(workoutSets.exerciseOrder) }).from(workoutSets).where(eq(workoutSets.sessionId, sessionId));
  const order = top === null ? 0 : top + 1;
  // buildSessionSets starts each set from last time's numbers when there are any.
  const sets = buildSessionSets([{ name, sets: 3, reps: 10, weight: null, restSec }], await loadHistory(db));
  await db.insert(workoutSets).values(sets.map((s) => ({ id: newId(), sessionId, ...s, exerciseOrder: order, done: false })));
}

export async function removeExercise(db: Db, sessionId: string, exerciseOrder: number): Promise<void> {
  await db.delete(workoutSets).where(and(eq(workoutSets.sessionId, sessionId), eq(workoutSets.exerciseOrder, exerciseOrder)));
}

/**
 * Finishes the workout: stamps the end time and drops sets you never completed, so your history
 * only holds what you did. Returns false (and changes nothing) if no set was completed.
 */
export async function finishSession(db: Db, sessionId: string, now: number = Date.now()): Promise<boolean> {
  const done = await db.select({ id: workoutSets.id }).from(workoutSets).where(and(eq(workoutSets.sessionId, sessionId), eq(workoutSets.done, true)));
  if (done.length === 0) return false;
  await db.delete(workoutSets).where(and(eq(workoutSets.sessionId, sessionId), eq(workoutSets.done, false)));
  await db.update(workoutSessions).set({ endedAt: now }).where(eq(workoutSessions.id, sessionId));
  return true;
}

/** Throws the workout away (its sets go with it). */
export async function discardSession(db: Db, sessionId: string): Promise<void> {
  await db.delete(workoutSessions).where(eq(workoutSessions.id, sessionId));
}
