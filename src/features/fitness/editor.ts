import type { TemplateExercise } from './logic';

// The template editor keeps numbers as text while you type, so a half-typed "6" can't turn
// into 0 or NaN. These helpers turn that text into clean exercises when you save.

export type ExerciseDraft = {
  /** Stable key for list rendering. */
  key: string;
  name: string;
  sets: string;
  reps: string;
  /** Empty means bodyweight. */
  weight: string;
  restSec: string;
};

let counter = 0;
export const newDraft = (over: Partial<ExerciseDraft> = {}): ExerciseDraft => ({
  key: `draft-${++counter}`,
  name: '',
  sets: '3',
  reps: '10',
  weight: '',
  restSec: '90',
  ...over,
});

export const toDraft = (e: TemplateExercise): ExerciseDraft =>
  newDraft({
    name: e.name,
    sets: String(e.sets),
    reps: String(e.reps),
    weight: e.weight === null ? '' : String(e.weight),
    restSec: String(e.restSec),
  });

const num = (text: string): number => Number(text.replace(',', '.'));

function whole(text: string, fallback: number, min: number, max: number): number {
  const n = Math.round(num(text));
  return Number.isFinite(n) && text.trim() !== '' ? Math.min(max, Math.max(min, n)) : fallback;
}

/** Cleans up the drafts: drops blank names, clamps counts to sensible ranges, empty weight = bodyweight. */
export function fromDrafts(drafts: ExerciseDraft[]): TemplateExercise[] {
  return drafts
    .filter((d) => d.name.trim().length > 0)
    .map((d) => {
      const w = num(d.weight);
      return {
        name: d.name.trim(),
        sets: whole(d.sets, 3, 1, 20),
        reps: whole(d.reps, 10, 1, 100),
        weight: d.weight.trim() !== '' && Number.isFinite(w) && w > 0 ? w : null,
        restSec: whole(d.restSec, 90, 0, 600),
      };
    });
}

/** What's stopping a save, in plain words, or null when it's fine. */
export function validateTemplate(name: string, drafts: ExerciseDraft[]): string | null {
  if (name.trim().length === 0) return 'Give the workout a name.';
  if (fromDrafts(drafts).length === 0) return 'Add at least one exercise.';
  return null;
}

/** Moves item `from` to `to`, returning a new array. Out-of-range moves do nothing. */
export function move<T>(list: T[], from: number, to: number): T[] {
  if (from < 0 || from >= list.length || to < 0 || to >= list.length || from === to) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
