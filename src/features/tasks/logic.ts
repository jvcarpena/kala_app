import type { Domain, Task } from '@/db/schema';
import { addDaysToKey, dateKey, type DateKey } from '@/lib/dates';

export type Energy = Task['energy'];
export type EnergyFilter = 'any' | Energy;

export const ENERGY_LABEL: Record<Energy, string> = { high: 'High', medium: 'Med', low: 'Low' };

type Filters = {
  /** Domain ids hidden by Focus Mode. */
  hiddenDomainIds?: string[];
  /** 'any' (default) shows all; otherwise only tasks needing exactly that energy. */
  energy?: EnergyFilter;
  /** Only show this domain (from tapping a domain chip). */
  domainId?: string | null;
};

/** Applies Focus Mode, the domain chip and the energy filter. */
export function filterTasks<T extends Pick<Task, 'domainId' | 'energy'>>(tasks: T[], f: Filters = {}): T[] {
  const hidden = new Set(f.hiddenDomainIds ?? []);
  return tasks.filter(
    (t) =>
      !hidden.has(t.domainId) &&
      (!f.domainId || t.domainId === f.domainId) &&
      (!f.energy || f.energy === 'any' || t.energy === f.energy),
  );
}

/** Earliest due date first (undated last), then oldest created. */
export function compareOpen(a: Task, b: Task): number {
  if (a.dueDate !== b.dueDate) {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate < b.dueDate ? -1 : 1;
  }
  return a.createdAt - b.createdAt;
}

export type TodayBuckets = {
  /** Open tasks due before today, oldest first. */
  overdue: Task[];
  /** Open tasks due today. */
  dueToday: Task[];
  /** Tasks finished today, most recent first. */
  doneToday: Task[];
};

export function bucketForToday(tasks: Task[], today: DateKey): TodayBuckets {
  const open = tasks.filter((t) => t.status === 'todo').sort(compareOpen);
  return {
    overdue: open.filter((t) => t.dueDate !== null && t.dueDate < today),
    dueToday: open.filter((t) => t.dueDate === today),
    doneToday: tasks
      .filter((t) => t.status === 'done' && t.completedAt !== null && dateKey(t.completedAt) === today)
      .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0)),
  };
}

export type DomainGroup = { domain: Domain; tasks: Task[] };

/** Open tasks grouped by domain, in domain order. Empty domains are kept so users can add to them. */
export function groupOpenByDomain(tasks: Task[], domains: Domain[]): DomainGroup[] {
  const open = tasks.filter((t) => t.status === 'todo').sort(compareOpen);
  return [...domains]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((domain) => ({ domain, tasks: open.filter((t) => t.domainId === domain.id) }));
}

export type DueChoice = { label: string; value: DateKey | null };

/** The quick due-date chips. A custom date already on the task stays visible after "No date". */
export function dueChoices(today: DateKey, current: DateKey | null, labelFor: (key: DateKey) => string): DueChoice[] {
  const base: DueChoice[] = [
    { label: 'No date', value: null },
    { label: 'Today', value: today },
    { label: 'Tomorrow', value: addDaysToKey(today, 1) },
    { label: 'In a week', value: addDaysToKey(today, 7) },
  ];
  if (current && !base.some((o) => o.value === current)) base.splice(1, 0, { label: labelFor(current), value: current });
  return base;
}
