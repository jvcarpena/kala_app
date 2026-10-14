import type { Domain, Task } from '@/db/schema';
import { FOCUS_PRESETS, hiddenIdsForPreset } from '@/features/focus/presets';

import { bucketForToday, compareOpen, filterTasks, groupOpenByDomain } from '../logic';

const TODAY = '2025-10-15';
const ms = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();

let n = 0;
const task = (over: Partial<Task> = {}): Task => ({
  id: `t${++n}`,
  title: `Task ${n}`,
  notes: null,
  domainId: 'work',
  energy: 'medium',
  dueDate: null,
  scheduledStart: null,
  estimateMin: null,
  status: 'todo',
  completedAt: null,
  createdAt: n,
  ...over,
});

const domain = (id: string, color: string, sortOrder: number): Domain => ({
  id,
  name: id,
  color,
  icon: 'Tag',
  sortOrder,
  isDefault: true,
  archived: false,
  createdAt: 0,
});

describe('filterTasks', () => {
  const tasks = [
    task({ id: 'a', domainId: 'work', energy: 'high' }),
    task({ id: 'b', domainId: 'study', energy: 'low' }),
    task({ id: 'c', domainId: 'life', energy: 'low' }),
  ];

  it('returns everything with no filters', () => {
    expect(filterTasks(tasks)).toHaveLength(3);
    expect(filterTasks(tasks, { energy: 'any' })).toHaveLength(3);
  });

  it('hides tasks from domains hidden by Focus Mode', () => {
    expect(filterTasks(tasks, { hiddenDomainIds: ['work', 'study'] }).map((t) => t.id)).toEqual(['c']);
  });

  it('shows only the chosen energy level', () => {
    expect(filterTasks(tasks, { energy: 'low' }).map((t) => t.id)).toEqual(['b', 'c']);
  });

  it('narrows to one domain and combines with the other filters', () => {
    expect(filterTasks(tasks, { domainId: 'study', energy: 'low' }).map((t) => t.id)).toEqual(['b']);
    expect(filterTasks(tasks, { domainId: 'study', hiddenDomainIds: ['study'] })).toEqual([]);
  });
});

describe('compareOpen', () => {
  it('sorts by due date with undated tasks last, then by creation order', () => {
    const undated = task({ id: 'u', createdAt: 1 });
    const late = task({ id: 'l', dueDate: '2025-10-20', createdAt: 2 });
    const soon = task({ id: 's', dueDate: '2025-10-16', createdAt: 3 });
    const soonOlder = task({ id: 'so', dueDate: '2025-10-16', createdAt: 0 });
    expect([undated, late, soon, soonOlder].sort(compareOpen).map((t) => t.id)).toEqual(['so', 's', 'l', 'u']);
  });
});

describe('bucketForToday', () => {
  it('splits overdue, due today and done today', () => {
    const tasks = [
      task({ id: 'old', dueDate: '2025-10-10' }),
      task({ id: 'yest', dueDate: '2025-10-14' }),
      task({ id: 'today', dueDate: TODAY }),
      task({ id: 'later', dueDate: '2025-10-16' }),
      task({ id: 'nodate' }),
      task({ id: 'done1', status: 'done', completedAt: ms(2025, 10, 15, 9), dueDate: TODAY }),
      task({ id: 'done2', status: 'done', completedAt: ms(2025, 10, 15, 14) }),
      task({ id: 'doneOld', status: 'done', completedAt: ms(2025, 10, 14, 14) }),
      task({ id: 'gone', status: 'archived', dueDate: '2025-10-01' }),
    ];
    const b = bucketForToday(tasks, TODAY);
    expect(b.overdue.map((t) => t.id)).toEqual(['old', 'yest']);
    expect(b.dueToday.map((t) => t.id)).toEqual(['today']);
    expect(b.doneToday.map((t) => t.id)).toEqual(['done2', 'done1']);
  });
});

describe('groupOpenByDomain', () => {
  it('groups open tasks per domain in domain order and keeps empty domains', () => {
    const domains = [domain('study', 'study', 1), domain('work', 'work', 0), domain('life', 'life', 2)];
    const tasks = [
      task({ domainId: 'study', id: 's1' }),
      task({ domainId: 'work', id: 'w1' }),
      task({ domainId: 'work', id: 'wdone', status: 'done' }),
    ];
    const groups = groupOpenByDomain(tasks, domains);
    expect(groups.map((g) => g.domain.id)).toEqual(['work', 'study', 'life']);
    expect(groups.map((g) => g.tasks.map((t) => t.id))).toEqual([['w1'], ['s1'], []]);
  });
});

describe('focus presets', () => {
  const domains = [
    domain('d-work', 'work', 0),
    domain('d-study', 'study', 1),
    domain('d-health', 'health', 2),
    domain('d-life', 'life', 3),
    domain('d-custom', '#0E7C99', 4),
  ];

  it('hides the built-in domains a preset names and never touches custom domains', () => {
    const gym = FOCUS_PRESETS.find((p) => p.name === 'Gym time')!;
    expect(hiddenIdsForPreset(gym, domains)).toEqual(['d-work', 'd-study']);
  });

  it('has presets with unique names', () => {
    const names = FOCUS_PRESETS.map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
