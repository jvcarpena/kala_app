import { addDays, parseISO, startOfWeek } from 'date-fns';

import type { Habit } from '@/db/schema';
import { type DateKey, dateKey } from '@/lib/dates';

// Weekdays are numbered 0 (Monday) to 6 (Sunday) everywhere in the app.

export const ALL_DAYS: number[] = [0, 1, 2, 3, 4, 5, 6];
export const WEEKDAYS: number[] = [0, 1, 2, 3, 4];
export const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;
export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

/** Reads the stored schedule JSON. Bad data falls back to every day rather than hiding the habit. */
export function parseSchedule(json: string): number[] {
  try {
    const v: unknown = JSON.parse(json);
    if (Array.isArray(v)) {
      const days = [...new Set(v.filter((n): n is number => Number.isInteger(n) && n >= 0 && n <= 6))].sort();
      return days;
    }
  } catch {
    // fall through
  }
  return ALL_DAYS;
}

/** 0 = Monday ... 6 = Sunday. */
export const weekdayIndex = (key: DateKey): number => (parseISO(key).getDay() + 6) % 7;

export const isScheduled = (schedule: number[], key: DateKey): boolean => schedule.includes(weekdayIndex(key));

/** expo-notifications weekdays run 1 (Sunday) to 7 (Saturday). */
export const toExpoWeekday = (index: number): number => ((index + 1) % 7) + 1;

/** Short description of a schedule: 'Every day', 'Weekdays', 'Mon, Wed, Fri'. */
export function describeSchedule(schedule: number[]): string {
  const days = [...schedule].sort();
  if (days.length === 7) return 'Every day';
  if (days.length === 0) return 'No days';
  if (days.join() === WEEKDAYS.join()) return 'Weekdays';
  if (days.join() === '5,6') return 'Weekends';
  return days.map((d) => DAY_NAMES[d].slice(0, 3)).join(', ');
}

type HabitLike = Pick<Habit, 'type' | 'target'>;

/** A day counts as done once the logged value reaches the target (always 1 for yes/no habits). */
export function isMet(habit: HabitLike, value: number | undefined): boolean {
  if (!value || value <= 0) return false;
  return habit.type === 'check' ? true : value >= habit.target;
}

export type LogMap = ReadonlyMap<DateKey, number>;

const MAX_LOOKBACK_DAYS = 366 * 3;

export type Streaks = { current: number; best: number };

/**
 * Streaks count scheduled days only: rest days neither add to a streak nor break it.
 * A missed scheduled day breaks it, except today, which is still pending until it ends.
 */
export function computeStreaks(habit: HabitLike, schedule: number[], logs: LogMap, today: DateKey): Streaks {
  if (schedule.length === 0) return { current: 0, best: 0 };

  let current = 0;
  let key = today;
  for (let i = 0; i < MAX_LOOKBACK_DAYS; i++, key = dateKey(addDays(parseISO(key), -1))) {
    if (!isScheduled(schedule, key)) continue;
    if (isMet(habit, logs.get(key))) current++;
    else if (key !== today) break;
  }

  // Best: walk forward from the first logged day.
  const logged = [...logs.keys()].filter((k) => k <= today && isMet(habit, logs.get(k))).sort();
  let best = 0;
  if (logged.length > 0) {
    let run = 0;
    for (let k = logged[0], n = 0; k <= today && n < MAX_LOOKBACK_DAYS * 2; k = dateKey(addDays(parseISO(k), 1)), n++) {
      if (!isScheduled(schedule, k)) continue;
      if (isMet(habit, logs.get(k))) {
        run++;
        best = Math.max(best, run);
      } else if (k !== today) {
        run = 0;
      }
    }
  }
  return { current, best: Math.max(best, current) };
}

export type DotState = 'done' | 'missed' | 'pending' | 'off';
export type WeekDot = { date: DateKey; state: DotState; isToday: boolean };

/** The Monday-to-Sunday dots for the week containing `today`. */
export function weekDots(habit: HabitLike, schedule: number[], logs: LogMap, today: DateKey): WeekDot[] {
  const monday = startOfWeek(parseISO(today), { weekStartsOn: 1 });
  return ALL_DAYS.map((i) => {
    const date = dateKey(addDays(monday, i));
    let state: DotState;
    if (!schedule.includes(i)) state = 'off';
    else if (isMet(habit, logs.get(date))) state = 'done';
    else state = date < today ? 'missed' : 'pending';
    return { date, state, isToday: date === today };
  });
}

/** 'HH:mm' to { hour, minute }, or null when malformed. */
export function parseTime(time: string | null): { hour: number; minute: number } | null {
  const m = time?.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  return hour <= 23 && minute <= 59 ? { hour, minute } : null;
}

export const REMINDER_TIMES = [
  { label: 'Morning · 7:00', value: '07:00' },
  { label: 'Noon · 12:00', value: '12:00' },
  { label: 'Evening · 18:00', value: '18:00' },
  { label: 'Night · 21:00', value: '21:00' },
] as const;

/** 'Count' habits show progress like '6 / 8 glasses'. */
export function progressLabel(habit: Pick<Habit, 'target' | 'unit'>, value: number): string {
  const unit = habit.unit ? ` ${habit.unit}` : '';
  return `${trimNumber(value)} / ${trimNumber(habit.target)}${unit}`;
}

export const trimNumber = (n: number): string => (Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10));
