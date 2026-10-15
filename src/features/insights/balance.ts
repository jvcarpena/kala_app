import { addDays, format, parseISO, startOfWeek } from 'date-fns';

import type { Habit, Task } from '@/db/schema';
import { isMet, isScheduled, parseSchedule } from '@/features/habits/logic';
import { type DateKey, dateKey } from '@/lib/dates';

// Life balance: for one week (Monday to Sunday), how much time went into each life domain and
// how much of what was planned got done. Pure functions; the screen passes in plain rows.

/** A finished workout counts at most this long, so one left running by accident can't swamp the chart. */
export const WORKOUT_CAP_MIN = 180;

export type FocusRow = { domainId: string; startedAt: number; plannedMin: number };
export type WorkoutRow = { domainId: string; startedAt: number; endedAt: number };
export type TaskRow = Pick<Task, 'domainId' | 'status' | 'dueDate' | 'completedAt' | 'estimateMin'>;
export type HabitRow = Pick<Habit, 'id' | 'domainId' | 'type' | 'target' | 'schedule' | 'createdAt'>;

export type BalanceSources = {
  /** Completed focus phases only (no breaks, no sessions ended early). */
  focus: FocusRow[];
  /** Finished workouts only. */
  workouts: WorkoutRow[];
  /** Tasks that aren't archived. */
  tasks: TaskRow[];
  /** Habits that aren't archived. */
  habits: HabitRow[];
  /** habitId -> (date -> logged value). */
  logs: ReadonlyMap<string, ReadonlyMap<DateKey, number>>;
};

export type Week = { start: DateKey; end: DateKey; offset: number };

/** The week `offset` weeks from this one (0 = this week, -1 = last week). Weeks start on Monday. */
export function weekRange(today: DateKey, offset: number): Week {
  const monday = addDays(startOfWeek(parseISO(today), { weekStartsOn: 1 }), offset * 7);
  return { start: dateKey(monday), end: dateKey(addDays(monday, 6)), offset };
}

/** "This week", "Last week", or "29 Sep – 5 Oct". */
export function weekLabel(week: Week): string {
  if (week.offset === 0) return 'This week';
  if (week.offset === -1) return 'Last week';
  return `${format(parseISO(week.start), 'd MMM')} – ${format(parseISO(week.end), 'd MMM')}`;
}

export type DomainStat = {
  domainId: string;
  minutes: number;
  /** Tasks due this week that are done, plus habit days met. */
  done: number;
  /** Tasks due this week, plus scheduled habit days so far. */
  due: number;
  /** done / due, or null when nothing was due or scheduled. */
  rate: number | null;
};

const inWeek = (key: DateKey, w: Week) => key >= w.start && key <= w.end;

/**
 * Minutes and completion per domain for one week, in the order of `domainIds`.
 * Minutes: completed focus sessions (planned length), finished workouts (capped), and the estimate
 * of tasks finished that week (0 without one). Completion: tasks due that week, plus habit days
 * scheduled up to today; today only counts once it's met, like streaks.
 */
export function weekStats(domainIds: string[], src: BalanceSources, week: Week, today: DateKey): DomainStat[] {
  const stats = new Map<string, DomainStat>(
    domainIds.map((id) => [id, { domainId: id, minutes: 0, done: 0, due: 0, rate: null }]),
  );

  for (const f of src.focus) {
    const s = stats.get(f.domainId);
    if (s && inWeek(dateKey(f.startedAt), week)) s.minutes += f.plannedMin;
  }
  for (const w of src.workouts) {
    const s = stats.get(w.domainId);
    if (s && inWeek(dateKey(w.endedAt), week)) {
      s.minutes += Math.min(Math.max(0, Math.round((w.endedAt - w.startedAt) / 60000)), WORKOUT_CAP_MIN);
    }
  }
  for (const t of src.tasks) {
    const s = stats.get(t.domainId);
    if (!s || t.status === 'archived') continue;
    if (t.status === 'done' && t.completedAt !== null && inWeek(dateKey(t.completedAt), week)) s.minutes += t.estimateMin ?? 0;
    if (t.dueDate !== null && inWeek(t.dueDate, week)) {
      s.due += 1;
      if (t.status === 'done') s.done += 1;
    }
  }

  const last = week.end < today ? week.end : today;
  for (const h of src.habits) {
    const s = stats.get(h.domainId);
    if (!s) continue;
    const schedule = parseSchedule(h.schedule);
    const born = dateKey(h.createdAt);
    const logs = src.logs.get(h.id);
    for (let d = week.start; d <= last; d = dateKey(addDays(parseISO(d), 1))) {
      if (d < born || !isScheduled(schedule, d)) continue;
      const met = isMet(h, logs?.get(d));
      if (d === today && !met) continue; // today is still pending
      s.due += 1;
      if (met) s.done += 1;
    }
  }

  return domainIds.map((id) => {
    const s = stats.get(id)!;
    return { ...s, rate: s.due > 0 ? s.done / s.due : null };
  });
}

export type Point = { x: number; y: number };

/**
 * Corner points of a radar shape: axis i points straight up for i = 0 and goes clockwise.
 * Values are clamped to 0..max; a max of 0 puts every point at the centre.
 */
export function radarPoints(values: number[], max: number, cx: number, cy: number, radius: number): Point[] {
  const n = values.length;
  return values.map((v, i) => {
    const ratio = max > 0 ? Math.min(Math.max(v / max, 0), 1) : 0;
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return { x: cx + radius * ratio * Math.cos(angle), y: cy + radius * ratio * Math.sin(angle) };
  });
}

/** "40 min", "1 h 10 min", "2 h". */
export function formatMinutes(min: number): string {
  const m = Math.round(min);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest === 0 ? `${h} h` : `${h} h ${rest} min`;
}

/** "75%", or "–" when nothing was due. */
export const formatRate = (rate: number | null): string => (rate === null ? '–' : `${Math.round(rate * 100)}%`);

/** Smallest change worth a mention. */
const MIN_MINUTES_CHANGE = 5;
const MIN_RATE_CHANGE = 0.05;

/**
 * One plain sentence comparing a week with the one before it:
 * "Health up 40 min on last week, Study down 25%." Names the biggest time change and the
 * biggest completion change. `names` maps domain id to name.
 */
export function balanceSummary(
  current: DomainStat[],
  previous: DomainStat[],
  names: ReadonlyMap<string, string>,
  isThisWeek: boolean,
): string {
  const empty = current.every((s) => s.minutes === 0 && s.due === 0);
  if (empty) return isThisWeek ? 'Nothing logged this week yet.' : 'Nothing logged that week.';

  const before = new Map(previous.map((s) => [s.domainId, s]));
  let time: { id: string; delta: number } | null = null;
  let rate: { id: string; delta: number } | null = null;
  for (const s of current) {
    const p = before.get(s.domainId);
    const dMin = s.minutes - (p?.minutes ?? 0);
    if (Math.abs(dMin) >= MIN_MINUTES_CHANGE && (!time || Math.abs(dMin) > Math.abs(time.delta))) time = { id: s.domainId, delta: dMin };
    if (s.rate !== null && p?.rate != null) {
      const dRate = s.rate - p.rate;
      if (Math.abs(dRate) >= MIN_RATE_CHANGE && (!rate || Math.abs(dRate) > Math.abs(rate.delta))) rate = { id: s.domainId, delta: dRate };
    }
  }

  const parts: string[] = [];
  const than = isThisWeek ? 'on last week' : 'on the week before';
  if (time) parts.push(`${names.get(time.id) ?? 'A domain'} ${time.delta > 0 ? 'up' : 'down'} ${formatMinutes(Math.abs(time.delta))} ${than}`);
  if (rate) {
    const word = `${names.get(rate.id) ?? 'A domain'} ${rate.delta > 0 ? 'up' : 'down'} ${Math.round(Math.abs(rate.delta) * 100)}%`;
    parts.push(time ? word : `${word} ${than}`);
  }
  if (parts.length === 0) return isThisWeek ? 'About the same as last week.' : 'About the same as the week before.';
  return `${parts.join(', ')}.`;
}

export type SortKey = 'order' | 'minutes' | 'rate';

/** Table order: your domain order, most minutes first, or best completion first ("–" last). */
export function sortStats(stats: DomainStat[], key: SortKey): DomainStat[] {
  if (key === 'order') return stats;
  return [...stats].sort((a, b) => {
    if (key === 'minutes') return b.minutes - a.minutes;
    if (a.rate === null) return b.rate === null ? 0 : 1;
    if (b.rate === null) return -1;
    return b.rate - a.rate;
  });
}
