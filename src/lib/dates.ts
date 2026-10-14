import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';

// Calendar dates are 'YYYY-MM-DD' strings in the user's local time zone.

export type DateKey = string;

export const dateKey = (d: Date | number): DateKey => format(d, 'yyyy-MM-dd');

export const todayKey = (now: Date = new Date()): DateKey => dateKey(now);

export const addDaysToKey = (key: DateKey, days: number): DateKey => dateKey(addDays(parseISO(key), days));

export const keyToDate = (key: DateKey): Date => parseISO(key);

/** 'Tue 14 Oct' */
export const shortLabel = (key: DateKey): string => format(parseISO(key), 'EEE d MMM');

/** Relative label for due dates: 'Today', 'Tomorrow', 'Yesterday', or 'Tue 14 Oct'. */
export function dueLabel(key: DateKey, today: DateKey = todayKey()): string {
  if (key === today) return 'Today';
  if (key === addDaysToKey(today, 1)) return 'Tomorrow';
  if (key === addDaysToKey(today, -1)) return 'Yesterday';
  return shortLabel(key);
}

/** 'today', 'yesterday', '9 days ago'. */
export function daysAgoLabel(ts: number, now: number = Date.now()): string {
  const n = differenceInCalendarDays(now, ts);
  if (n <= 0) return 'today';
  if (n === 1) return 'yesterday';
  return `${n} days ago`;
}
