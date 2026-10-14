import {
  computeStreaks,
  describeSchedule,
  isMet,
  isScheduled,
  parseSchedule,
  parseTime,
  progressLabel,
  toExpoWeekday,
  weekdayIndex,
  weekDots,
  type LogMap,
} from '../logic';

// Wednesday 15 Oct 2025.
const TODAY = '2025-10-15';
const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];
const check = { type: 'check', target: 1 } as const;
const logs = (...days: (string | [string, number])[]): LogMap =>
  new Map(days.map((d) => (Array.isArray(d) ? d : ([d, 1] as [string, number]))));

describe('schedule helpers', () => {
  it('numbers weekdays Monday=0 to Sunday=6', () => {
    expect(weekdayIndex('2025-10-13')).toBe(0); // Mon
    expect(weekdayIndex('2025-10-15')).toBe(2); // Wed
    expect(weekdayIndex('2025-10-19')).toBe(6); // Sun
  });

  it('maps to expo-notifications weekdays (Sunday=1 ... Saturday=7)', () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(toExpoWeekday)).toEqual([2, 3, 4, 5, 6, 7, 1]);
  });

  it('parses stored schedules and survives bad data', () => {
    expect(parseSchedule('[4,0,2,2]')).toEqual([0, 2, 4]);
    expect(parseSchedule('not json')).toEqual(EVERY_DAY);
    expect(parseSchedule('{"a":1}')).toEqual(EVERY_DAY);
    expect(parseSchedule('[9,-1,"x",3]')).toEqual([3]);
  });

  it('checks whether a date is scheduled', () => {
    expect(isScheduled([0, 2, 4], TODAY)).toBe(true); // Wed
    expect(isScheduled([0, 4], TODAY)).toBe(false);
  });

  it('describes schedules in plain words', () => {
    expect(describeSchedule(EVERY_DAY)).toBe('Every day');
    expect(describeSchedule([0, 1, 2, 3, 4])).toBe('Weekdays');
    expect(describeSchedule([5, 6])).toBe('Weekends');
    expect(describeSchedule([4, 0, 2])).toBe('Mon, Wed, Fri');
  });
});

describe('isMet', () => {
  it('treats any logged yes/no habit as done', () => {
    expect(isMet(check, 1)).toBe(true);
    expect(isMet(check, 0)).toBe(false);
    expect(isMet(check, undefined)).toBe(false);
  });

  it('needs a count habit to reach its target', () => {
    const water = { type: 'count', target: 8 } as const;
    expect(isMet(water, 7)).toBe(false);
    expect(isMet(water, 8)).toBe(true);
    expect(isMet(water, 10)).toBe(true);
  });
});

describe('computeStreaks', () => {
  it('counts consecutive done days ending today', () => {
    const s = computeStreaks(check, EVERY_DAY, logs('2025-10-15', '2025-10-14', '2025-10-13'), TODAY);
    expect(s).toEqual({ current: 3, best: 3 });
  });

  it("does not break the streak while today is still pending", () => {
    const s = computeStreaks(check, EVERY_DAY, logs('2025-10-14', '2025-10-13'), TODAY);
    expect(s.current).toBe(2);
  });

  it('breaks the streak at a missed scheduled day', () => {
    const s = computeStreaks(check, EVERY_DAY, logs('2025-10-15', '2025-10-13', '2025-10-12'), TODAY);
    expect(s.current).toBe(1);
    expect(s.best).toBe(2);
  });

  it('lets rest days pass without breaking or counting', () => {
    // Mon/Wed/Fri habit. Done Fri 10, Mon 13, Wed 15 (today). Tue and Thu are rest days.
    const s = computeStreaks(check, [0, 2, 4], logs('2025-10-10', '2025-10-13', '2025-10-15'), TODAY);
    expect(s).toEqual({ current: 3, best: 3 });
  });

  it('still breaks on a missed scheduled day around rest days', () => {
    // Missed Mon 13 (scheduled), so only today counts.
    const s = computeStreaks(check, [0, 2, 4], logs('2025-10-10', '2025-10-15'), TODAY);
    expect(s.current).toBe(1);
  });

  it('only counts a count habit once its target is reached', () => {
    const water = { type: 'count', target: 8 } as const;
    const s = computeStreaks(water, EVERY_DAY, logs(['2025-10-15', 5], ['2025-10-14', 8], ['2025-10-13', 9]), TODAY);
    expect(s.current).toBe(2); // today's 5/8 is pending, the two before it count
  });

  it('keeps the best streak from the past', () => {
    const s = computeStreaks(check, EVERY_DAY, logs('2025-09-01', '2025-09-02', '2025-09-03', '2025-09-04', '2025-10-15'), TODAY);
    expect(s).toEqual({ current: 1, best: 4 });
  });

  it('is zero with no logs or no scheduled days', () => {
    expect(computeStreaks(check, EVERY_DAY, logs(), TODAY)).toEqual({ current: 0, best: 0 });
    expect(computeStreaks(check, [], logs('2025-10-15'), TODAY)).toEqual({ current: 0, best: 0 });
  });
});

describe('weekDots', () => {
  it('shows done, missed, pending and off days for the current week', () => {
    // Mon/Tue/Wed/Fri habit. Done Mon. Missed Tue. Today (Wed) pending. Thu off. Fri pending.
    const dots = weekDots(check, [0, 1, 2, 4], logs('2025-10-13'), TODAY);
    expect(dots.map((d) => d.state)).toEqual(['done', 'missed', 'pending', 'off', 'pending', 'off', 'off']);
    expect(dots.map((d) => d.date)[0]).toBe('2025-10-13');
    expect(dots.filter((d) => d.isToday).map((d) => d.date)).toEqual([TODAY]);
  });

  it('marks today done once logged', () => {
    expect(weekDots(check, EVERY_DAY, logs(TODAY), TODAY)[2].state).toBe('done');
  });
});

describe('parseTime and labels', () => {
  it('parses HH:mm and rejects junk', () => {
    expect(parseTime('07:30')).toEqual({ hour: 7, minute: 30 });
    expect(parseTime('7:05')).toEqual({ hour: 7, minute: 5 });
    expect(parseTime('24:00')).toBeNull();
    expect(parseTime('abc')).toBeNull();
    expect(parseTime(null)).toBeNull();
  });

  it('labels count progress with the unit', () => {
    expect(progressLabel({ target: 8, unit: 'glasses' }, 6)).toBe('6 / 8 glasses');
    expect(progressLabel({ target: 20, unit: null }, 2.5)).toBe('2.5 / 20');
  });
});
