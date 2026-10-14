// Pure workout rules: building a session from a template, volume, personal records,
// last-time numbers and the rest timer. Weights are in kilograms.

export const exerciseKey = (name: string): string => name.trim().replace(/\s+/g, ' ').toLowerCase();

export type TemplateExercise = {
  name: string;
  sets: number;
  reps: number;
  weight: number | null;
  restSec: number;
};

/** One finished, completed set from a past workout. */
export type HistorySet = {
  key: string;
  sessionId: string;
  endedAt: number;
  setIndex: number;
  reps: number;
  weight: number | null;
};

export type NewSet = {
  exerciseName: string;
  exerciseOrder: number;
  setIndex: number;
  reps: number;
  weight: number | null;
  restSec: number;
};

export type SessionSet = NewSet & { id: string; done: boolean };

export type Performance = { sessionId: string; endedAt: number; sets: { reps: number; weight: number | null }[] };

/** The most recent past session that included this exercise, with its sets in order. */
export function lastPerformance(name: string, history: HistorySet[]): Performance | null {
  const key = exerciseKey(name);
  const mine = history.filter((h) => h.key === key);
  if (mine.length === 0) return null;
  const latest = mine.reduce((a, b) => (b.endedAt > a.endedAt ? b : a));
  const sets = mine
    .filter((h) => h.sessionId === latest.sessionId)
    .sort((a, b) => a.setIndex - b.setIndex)
    .map((h) => ({ reps: h.reps, weight: h.weight }));
  return { sessionId: latest.sessionId, endedAt: latest.endedAt, sets };
}

export const trimNumber = (n: number): string => (Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100));

export const formatWeight = (w: number | null): string => (w === null ? 'Bodyweight' : `${trimNumber(w)} kg`);

/** '4 × 8 @ 57.5 kg', or the top set when the sets differ. */
export function describePerformance(perf: Performance): string {
  const { sets } = perf;
  const first = sets[0];
  const same = sets.every((s) => s.reps === first.reps && s.weight === first.weight);
  const at = (w: number | null) => (w === null ? '' : ` @ ${trimNumber(w)} kg`);
  if (same) return `${sets.length} × ${first.reps}${at(first.weight)}`;
  const top = sets.reduce((a, b) => ((b.weight ?? 0) > (a.weight ?? 0) ? b : a));
  return `${sets.length} sets, top ${top.reps}${at(top.weight)}`;
}

/**
 * Turns a template into the sets of a new workout. Each set starts from what you did last time
 * (same set number, else your last set), so progress carries over; otherwise from the template.
 */
export function buildSessionSets(exercises: TemplateExercise[], history: HistorySet[]): NewSet[] {
  const out: NewSet[] = [];
  exercises.forEach((ex, order) => {
    const last = lastPerformance(ex.name, history);
    for (let i = 0; i < Math.max(1, ex.sets); i++) {
      const from = last ? (last.sets[i] ?? last.sets[last.sets.length - 1]) : null;
      out.push({
        exerciseName: ex.name.trim(),
        exerciseOrder: order,
        setIndex: i,
        reps: from?.reps ?? ex.reps,
        weight: from ? from.weight : ex.weight,
        restSec: ex.restSec,
      });
    }
  });
  return out;
}

export type ExerciseGroup<S extends NewSet = SessionSet> = {
  name: string;
  order: number;
  restSec: number;
  sets: S[];
};

/** Groups a workout's sets by exercise, in order. */
export function groupByExercise<S extends NewSet>(sets: S[]): ExerciseGroup<S>[] {
  const groups = new Map<number, ExerciseGroup<S>>();
  for (const s of [...sets].sort((a, b) => a.exerciseOrder - b.exerciseOrder || a.setIndex - b.setIndex)) {
    const g = groups.get(s.exerciseOrder);
    if (g) g.sets.push(s);
    else groups.set(s.exerciseOrder, { name: s.exerciseName, order: s.exerciseOrder, restSec: s.restSec, sets: [s] });
  }
  return [...groups.values()];
}

type Done = { reps: number; weight: number | null; done: boolean };

/** Total weight lifted: reps × kg over completed sets. Bodyweight sets add nothing. */
export const volume = (sets: Done[]): number =>
  sets.reduce((sum, s) => (s.done && s.weight !== null ? sum + s.reps * s.weight : sum), 0);

export const doneCount = (sets: Done[]): number => sets.filter((s) => s.done).length;

/** '3,420 kg' */
export const formatVolume = (kg: number): string => `${Math.round(kg).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')} kg`;

export type PersonalRecord = { exerciseName: string; kind: 'weight' | 'reps'; value: number; previous: number };

/**
 * New personal bests set in this workout, compared with everything done before it. The first
 * time you do an exercise sets a baseline, not a record. Weighted exercises compare the
 * heaviest set; bodyweight ones compare most reps.
 */
export function findPersonalRecords(sets: (NewSet & { done: boolean })[], history: HistorySet[]): PersonalRecord[] {
  const records: PersonalRecord[] = [];
  for (const g of groupByExercise(sets)) {
    const done = g.sets.filter((s) => s.done);
    if (done.length === 0) continue;
    const past = history.filter((h) => h.key === exerciseKey(g.name));
    if (past.length === 0) continue;

    const weighted = done.filter((s) => s.weight !== null);
    if (weighted.length > 0) {
      const now = Math.max(...weighted.map((s) => s.weight as number));
      const before = Math.max(0, ...past.map((h) => h.weight ?? 0));
      if (now > before) records.push({ exerciseName: g.name, kind: 'weight', value: now, previous: before });
    } else {
      const now = Math.max(...done.map((s) => s.reps));
      const before = Math.max(0, ...past.map((h) => h.reps));
      if (now > before) records.push({ exerciseName: g.name, kind: 'reps', value: now, previous: before });
    }
  }
  return records;
}

/** '42 min' or '1 h 05 min' */
export function formatDuration(ms: number): string {
  const totalMin = Math.max(0, Math.round(ms / 60_000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h === 0 ? `${m} min` : `${h} h ${String(m).padStart(2, '0')} min`;
}

/** Running clock: '12:05' or '1:12:05'. */
export function formatElapsed(ms: number): string {
  const s = Math.floor(Math.max(0, ms) / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const two = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${two(m)}:${two(sec)}` : `${two(m)}:${two(sec)}`;
}

/** Nudges a weight or rep value, never below zero. */
export const nudge = (value: number, delta: number): number => Math.max(0, Math.round((value + delta) * 100) / 100);

export const WEIGHT_STEP = 2.5;
export const REPS_STEP = 1;

// ---- Rest timer: counts down after a set is checked ------------------------------------

export type RestTimer = { endsAt: number; totalSec: number };

export const startRest = (sec: number, now: number): RestTimer => ({ endsAt: now + sec * 1000, totalSec: sec });
export const restRemainingMs = (r: RestTimer, now: number): number => Math.max(0, r.endsAt - now);
export const restEnded = (r: RestTimer, now: number): boolean => now >= r.endsAt;
export const extendRest = (r: RestTimer, sec: number): RestTimer => ({ endsAt: r.endsAt + sec * 1000, totalSec: r.totalSec + sec });

/** How much of the rest has gone, 0 to 1. */
export function restElapsed(r: RestTimer, now: number): number {
  if (r.totalSec <= 0) return 1;
  return Math.min(1, Math.max(0, 1 - restRemainingMs(r, now) / (r.totalSec * 1000)));
}

export const REST_CHOICES = [30, 60, 90, 120, 180] as const;

// ---- Starter templates ------------------------------------------------------------------

export type StarterTemplate = { name: string; exercises: TemplateExercise[] };

const ex = (name: string, sets: number, reps: number, restSec = 90): TemplateExercise => ({ name, sets, reps, weight: null, restSec });

/** A push / pull / legs split to start from. Weights are left empty for you to fill in. */
export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    name: 'Push day',
    exercises: [ex('Bench press', 4, 8, 120), ex('Overhead press', 3, 10), ex('Incline dumbbell press', 3, 10), ex('Triceps pushdown', 3, 12, 60)],
  },
  {
    name: 'Pull day',
    exercises: [ex('Barbell row', 4, 8, 120), ex('Lat pulldown', 3, 10), ex('Seated cable row', 3, 12), ex('Biceps curl', 3, 12, 60)],
  },
  {
    name: 'Leg day',
    exercises: [ex('Squat', 4, 8, 150), ex('Romanian deadlift', 3, 10, 120), ex('Leg press', 3, 12), ex('Calf raise', 4, 15, 60)],
  },
];
