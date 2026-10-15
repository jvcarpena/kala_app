import {
  balanceSummary,
  formatMinutes,
  formatRate,
  radarPoints,
  sortStats,
  weekLabel,
  weekRange,
  weekStats,
  WORKOUT_CAP_MIN,
  type BalanceSources,
  type DomainStat,
} from '../balance';

// Thursday 15 October 2026. Its week runs Monday 12 to Sunday 18 October.
const TODAY = '2026-10-15';
const at = (day: number, h = 12, m = 0) => new Date(2026, 9, day, h, m).getTime();

const empty = (): BalanceSources => ({ focus: [], workouts: [], tasks: [], habits: [], logs: new Map() });
const thisWeek = weekRange(TODAY, 0);
const stat = (src: BalanceSources, id = 'w') => weekStats(['w', 's'], src, thisWeek, TODAY).find((x) => x.domainId === id)!;

describe('weekRange and weekLabel', () => {
  it('starts on Monday and ends on Sunday', () => {
    expect(weekRange(TODAY, 0)).toEqual({ start: '2026-10-12', end: '2026-10-18', offset: 0 });
    expect(weekRange('2026-10-12', 0).start).toBe('2026-10-12'); // a Monday is its own week start
    expect(weekRange('2026-10-18', 0).start).toBe('2026-10-12'); // Sunday belongs to the week before it
  });

  it('steps back whole weeks', () => {
    expect(weekRange(TODAY, -1)).toEqual({ start: '2026-10-05', end: '2026-10-11', offset: -1 });
    expect(weekRange(TODAY, -3).start).toBe('2026-09-21');
  });

  it('names this week and last week, and dates the rest', () => {
    expect(weekLabel(weekRange(TODAY, 0))).toBe('This week');
    expect(weekLabel(weekRange(TODAY, -1))).toBe('Last week');
    expect(weekLabel(weekRange(TODAY, -2))).toBe('28 Sep – 4 Oct');
  });
});

describe('weekStats: minutes', () => {
  it('adds focus sessions, capped workouts and task estimates per domain', () => {
    const src = empty();
    src.focus = [
      { domainId: 'w', startedAt: at(13), plannedMin: 25 },
      { domainId: 's', startedAt: at(14), plannedMin: 50 },
    ];
    src.workouts = [{ domainId: 'w', startedAt: at(14, 9), endedAt: at(14, 9, 45) }];
    src.tasks = [
      { domainId: 'w', status: 'done', dueDate: null, completedAt: at(13), estimateMin: 30 },
      { domainId: 'w', status: 'done', dueDate: null, completedAt: at(13), estimateMin: null }, // no estimate: 0
      { domainId: 'w', status: 'todo', dueDate: null, completedAt: null, estimateMin: 90 }, // not finished: 0
    ];
    expect(stat(src, 'w').minutes).toBe(25 + 45 + 30);
    expect(stat(src, 's').minutes).toBe(50);
  });

  it('caps a workout that was left running', () => {
    const src = empty();
    src.workouts = [{ domainId: 'w', startedAt: at(13, 8), endedAt: at(13, 20) }];
    expect(stat(src).minutes).toBe(WORKOUT_CAP_MIN);
  });

  it('only counts what happened inside the week, by local day', () => {
    const src = empty();
    src.focus = [
      { domainId: 'w', startedAt: at(11, 23, 59), plannedMin: 25 }, // Sunday before: last week
      { domainId: 'w', startedAt: at(12, 0, 1), plannedMin: 15 }, // Monday just after midnight: this week
      { domainId: 'w', startedAt: at(19, 0, 1), plannedMin: 90 }, // next Monday
    ];
    expect(stat(src).minutes).toBe(15);
    expect(weekStats(['w'], src, weekRange(TODAY, -1), TODAY)[0].minutes).toBe(25);
  });

  it('ignores domains it was not asked about (archived ones, for example)', () => {
    const src = empty();
    src.focus = [{ domainId: 'old', startedAt: at(13), plannedMin: 25 }];
    expect(weekStats(['w'], src, thisWeek, TODAY)).toEqual([{ domainId: 'w', minutes: 0, done: 0, due: 0, rate: null }]);
  });
});

describe('weekStats: completion', () => {
  it('counts tasks due this week, done or not, and skips archived ones', () => {
    const src = empty();
    src.tasks = [
      { domainId: 'w', status: 'done', dueDate: '2026-10-13', completedAt: at(13), estimateMin: null },
      { domainId: 'w', status: 'todo', dueDate: '2026-10-16', completedAt: null, estimateMin: null },
      { domainId: 'w', status: 'archived', dueDate: '2026-10-14', completedAt: null, estimateMin: null },
      { domainId: 'w', status: 'todo', dueDate: '2026-10-20', completedAt: null, estimateMin: null }, // next week
    ];
    expect(stat(src)).toMatchObject({ done: 1, due: 2, rate: 0.5 });
  });

  it('counts scheduled habit days up to today, with today only once it is met', () => {
    const src = empty();
    src.habits = [{ id: 'h', domainId: 'w', type: 'check', target: 1, schedule: '[0,1,2,3,4,5,6]', createdAt: at(1) }];
    src.logs = new Map([['h', new Map([['2026-10-12', 1], ['2026-10-14', 1]])]]);
    // Mon met, Tue missed, Wed met, Thu (today) not yet: pending, not counted.
    expect(stat(src)).toMatchObject({ done: 2, due: 3 });

    src.logs = new Map([['h', new Map([['2026-10-12', 1], ['2026-10-14', 1], ['2026-10-15', 1]])]]);
    expect(stat(src)).toMatchObject({ done: 3, due: 4 });
  });

  it('skips rest days and days before the habit existed', () => {
    const src = empty();
    // Weekdays only, created on Wednesday 14.
    src.habits = [{ id: 'h', domainId: 'w', type: 'check', target: 1, schedule: '[0,1,2,3,4]', createdAt: at(14, 8) }];
    src.logs = new Map([['h', new Map([['2026-10-14', 1]])]]);
    expect(stat(src)).toMatchObject({ done: 1, due: 1 });
  });

  it('counts a count habit only at its goal', () => {
    const src = empty();
    src.habits = [{ id: 'h', domainId: 'w', type: 'count', target: 8, schedule: '[0,1,2,3,4,5,6]', createdAt: at(1) }];
    src.logs = new Map([['h', new Map([['2026-10-12', 8], ['2026-10-13', 7]])]]);
    expect(stat(src)).toMatchObject({ done: 1 });
  });

  it('counts a whole past week, but nothing in the future', () => {
    const src = empty();
    src.habits = [{ id: 'h', domainId: 'w', type: 'check', target: 1, schedule: '[0,1,2,3,4,5,6]', createdAt: at(1) }];
    expect(weekStats(['w'], src, weekRange(TODAY, -1), TODAY)[0].due).toBe(7);
  });

  it('has no rate when nothing was due or scheduled', () => {
    const src = empty();
    src.focus = [{ domainId: 'w', startedAt: at(13), plannedMin: 25 }];
    expect(stat(src)).toMatchObject({ minutes: 25, due: 0, rate: null });
  });
});

describe('radarPoints', () => {
  it('puts the first axis straight up and goes clockwise', () => {
    const [up, right, down, left] = radarPoints([10, 10, 10, 10], 10, 100, 100, 50);
    expect(up.x).toBeCloseTo(100);
    expect(up.y).toBeCloseTo(50);
    expect(right.x).toBeCloseTo(150);
    expect(down.y).toBeCloseTo(150);
    expect(left.x).toBeCloseTo(50);
  });

  it('scales by max and clamps, and a zero max collapses to the centre', () => {
    const [half, over] = radarPoints([5, 20, 0, 0], 10, 0, 0, 100);
    expect(half.y).toBeCloseTo(-50);
    expect(Math.hypot(over.x, over.y)).toBeCloseTo(100);
    radarPoints([3, 3, 3], 0, 7, 7, 40).forEach((p) => expect(p).toEqual({ x: 7, y: 7 }));
  });
});

describe('formatting', () => {
  it('formats minutes and rates', () => {
    expect(formatMinutes(40)).toBe('40 min');
    expect(formatMinutes(70)).toBe('1 h 10 min');
    expect(formatMinutes(120)).toBe('2 h');
    expect(formatRate(0.754)).toBe('75%');
    expect(formatRate(null)).toBe('–');
  });
});

describe('balanceSummary', () => {
  const names = new Map([['w', 'Work'], ['h', 'Health'], ['s', 'Study']]);
  const s = (domainId: string, minutes: number, rate: number | null = null): DomainStat => ({
    domainId,
    minutes,
    done: 0,
    due: rate === null ? 0 : 1,
    rate,
  });

  it('names the biggest time change and the biggest completion change', () => {
    const now = [s('w', 60, 0.5), s('h', 100, 1), s('s', 30, 0.25)];
    const before = [s('w', 50, 0.5), s('h', 60, 0.9), s('s', 30, 0.5)];
    expect(balanceSummary(now, before, names, true)).toBe('Health up 40 min on last week, Study down 25%.');
  });

  it('can be only a time change or only a completion change', () => {
    expect(balanceSummary([s('w', 10)], [s('w', 100)], names, true)).toBe('Work down 1 h 30 min on last week.');
    expect(balanceSummary([s('w', 0, 0.8)], [s('w', 0, 0.5)], names, false)).toBe('Work up 30% on the week before.');
  });

  it('ignores tiny changes', () => {
    expect(balanceSummary([s('w', 52, 0.52)], [s('w', 50, 0.5)], names, true)).toBe('About the same as last week.');
  });

  it('says so when the week is empty', () => {
    expect(balanceSummary([s('w', 0)], [s('w', 90)], names, true)).toBe('Nothing logged this week yet.');
    expect(balanceSummary([s('w', 0)], [], names, false)).toBe('Nothing logged that week.');
  });
});

describe('sortStats', () => {
  const rows: DomainStat[] = [
    { domainId: 'a', minutes: 10, done: 0, due: 0, rate: null },
    { domainId: 'b', minutes: 90, done: 1, due: 2, rate: 0.5 },
    { domainId: 'c', minutes: 40, done: 3, due: 3, rate: 1 },
  ];

  it('keeps your order, or sorts by minutes or completion with "–" last', () => {
    expect(sortStats(rows, 'order').map((r) => r.domainId)).toEqual(['a', 'b', 'c']);
    expect(sortStats(rows, 'minutes').map((r) => r.domainId)).toEqual(['b', 'c', 'a']);
    expect(sortStats(rows, 'rate').map((r) => r.domainId)).toEqual(['c', 'b', 'a']);
  });
});
