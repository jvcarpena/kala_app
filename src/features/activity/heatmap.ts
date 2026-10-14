import { addDays, differenceInCalendarDays, format, parseISO, startOfWeek } from 'date-fns';

import { type DateKey, dateKey } from '@/lib/dates';

/** One thing the user got done: a finished task, a habit log, a focus session or a workout. */
export type ActivityEvent = { date: DateKey; domainId: string };

export type Cell = {
  date: DateKey;
  count: number;
  /** 0 (nothing) to 4 (busiest). */
  level: 0 | 1 | 2 | 3 | 4;
  isFuture: boolean;
  isToday: boolean;
};

export type Grid = {
  /** Columns are weeks (oldest first); each has 7 cells, Monday to Sunday. */
  weeks: Cell[][];
  /** Short month label above the first week that starts in a new month, else ''. */
  monthLabels: string[];
  max: number;
};

export function countByDay(events: ActivityEvent[], domainId?: string | null): Record<DateKey, number> {
  const counts: Record<DateKey, number> = {};
  for (const e of events) {
    if (domainId && e.domainId !== domainId) continue;
    counts[e.date] = (counts[e.date] ?? 0) + 1;
  }
  return counts;
}

export function levelFor(count: number, max: number): Cell['level'] {
  if (count <= 0 || max <= 0) return 0;
  return Math.min(4, Math.max(1, Math.ceil((4 * count) / max))) as Cell['level'];
}

/**
 * Builds the GitHub-style grid: `weekCount` columns ending with the current
 * week, weeks start on Monday. Days after `today` are flagged as future.
 */
export function buildGrid(counts: Record<DateKey, number>, today: Date, weekCount: number): Grid {
  const todayStr = dateKey(today);
  const firstMonday = addDays(startOfWeek(today, { weekStartsOn: 1 }), -(weekCount - 1) * 7);

  let max = 0;
  const weeks: Cell[][] = [];
  for (let w = 0; w < weekCount; w++) {
    const week: Cell[] = [];
    for (let d = 0; d < 7; d++) {
      const date = dateKey(addDays(firstMonday, w * 7 + d));
      const count = counts[date] ?? 0;
      if (date <= todayStr && count > max) max = count;
      week.push({ date, count, level: 0, isFuture: date > todayStr, isToday: date === todayStr });
    }
    weeks.push(week);
  }
  for (const week of weeks) {
    for (const cell of week) cell.level = cell.isFuture ? 0 : levelFor(cell.count, max);
  }

  const monthLabels = weeks.map((week, i) => {
    const m = format(parseISO(week[0].date), 'MMM');
    const prev = i === 0 ? null : format(parseISO(weeks[i - 1][0].date), 'MMM');
    return m !== prev ? m : '';
  });

  return { weeks, monthLabels, max };
}

export type Summary = {
  today: number;
  /** Days in a row with something done, ending today (or yesterday if today is still empty). */
  currentStreak: number;
  longestStreak: number;
  /** Total things done in the last 7 days including today. */
  last7: number;
  /** Total things done in the last 30 days including today. */
  last30: number;
  /** Days with at least one thing done in the last 30 days. */
  activeDays30: number;
};

export function summarize(counts: Record<DateKey, number>, today: Date): Summary {
  const todayStr = dateKey(today);
  const at = (back: number) => counts[dateKey(addDays(today, -back))] ?? 0;

  // Current streak: today counts if done; if today is still empty, start from yesterday.
  let current = 0;
  for (let back = at(0) > 0 ? 0 : 1; at(back) > 0; back++) current++;

  const activeDates = Object.keys(counts)
    .filter((k) => counts[k] > 0 && k <= todayStr)
    .sort();
  let longest = 0;
  let run = 0;
  let prev: DateKey | null = null;
  for (const k of activeDates) {
    run = prev && differenceInCalendarDays(parseISO(k), parseISO(prev)) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = k;
  }

  let last7 = 0;
  let last30 = 0;
  let activeDays30 = 0;
  for (let back = 0; back < 30; back++) {
    const c = at(back);
    last30 += c;
    if (c > 0) activeDays30++;
    if (back < 7) last7 += c;
  }

  return { today: at(0), currentStreak: current, longestStreak: longest, last7, last30, activeDays30 };
}
