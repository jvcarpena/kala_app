import { buildGrid, countByDay, levelFor, summarize, type ActivityEvent } from '../heatmap';

// Wednesday 15 Oct 2025 (local time). Weeks start on Monday.
const TODAY = new Date(2025, 9, 15, 10, 0);

const ev = (date: string, domainId = 'work'): ActivityEvent => ({ date, domainId });

describe('countByDay', () => {
  it('counts events per date', () => {
    expect(countByDay([ev('2025-10-15'), ev('2025-10-15'), ev('2025-10-14')])).toEqual({
      '2025-10-15': 2,
      '2025-10-14': 1,
    });
  });

  it('filters by domain', () => {
    const events = [ev('2025-10-15', 'work'), ev('2025-10-15', 'study'), ev('2025-10-14', 'study')];
    expect(countByDay(events, 'study')).toEqual({ '2025-10-15': 1, '2025-10-14': 1 });
  });
});

describe('levelFor', () => {
  it('is 0 for nothing and scales relative to the busiest day', () => {
    expect(levelFor(0, 8)).toBe(0);
    expect(levelFor(1, 8)).toBe(1);
    expect(levelFor(3, 8)).toBe(2);
    expect(levelFor(5, 8)).toBe(3);
    expect(levelFor(8, 8)).toBe(4);
  });

  it('gives any activity at least level 1', () => {
    expect(levelFor(1, 100)).toBe(1);
  });
});

describe('buildGrid', () => {
  it('has the requested number of Monday-to-Sunday weeks ending with this week', () => {
    const grid = buildGrid({}, TODAY, 4);
    expect(grid.weeks).toHaveLength(4);
    grid.weeks.forEach((w) => expect(w).toHaveLength(7));
    // The last column is the week of Mon 13 Oct 2025.
    expect(grid.weeks[3][0].date).toBe('2025-10-13');
    expect(grid.weeks[3][6].date).toBe('2025-10-19');
    expect(grid.weeks[0][0].date).toBe('2025-09-22');
  });

  it('flags today and future days, and never levels the future', () => {
    const grid = buildGrid({ '2025-10-17': 5 }, TODAY, 2);
    const thisWeek = grid.weeks[1];
    expect(thisWeek[2].isToday).toBe(true);
    expect(thisWeek[3].isFuture).toBe(true);
    expect(thisWeek[4].isFuture).toBe(true);
    expect(thisWeek[4].level).toBe(0);
  });

  it('levels cells against the busiest past day', () => {
    const grid = buildGrid({ '2025-10-13': 1, '2025-10-14': 4, '2025-10-15': 2 }, TODAY, 1);
    expect(grid.max).toBe(4);
    expect(grid.weeks[0].map((c) => c.level).slice(0, 3)).toEqual([1, 4, 2]);
  });

  it('labels a month only where it changes', () => {
    const grid = buildGrid({}, TODAY, 4);
    // Weeks start 22 Sep, 29 Sep, 6 Oct, 13 Oct.
    expect(grid.monthLabels).toEqual(['Sep', '', 'Oct', '']);
  });
});

describe('summarize', () => {
  it("counts today and the current streak when today is done", () => {
    const counts = { '2025-10-15': 2, '2025-10-14': 1, '2025-10-13': 3, '2025-10-11': 1 };
    const s = summarize(counts, TODAY);
    expect(s.today).toBe(2);
    expect(s.currentStreak).toBe(3);
  });

  it("keeps yesterday's streak alive while today is still empty", () => {
    const counts = { '2025-10-14': 1, '2025-10-13': 1 };
    const s = summarize(counts, TODAY);
    expect(s.today).toBe(0);
    expect(s.currentStreak).toBe(2);
  });

  it('resets the streak after a missed day', () => {
    const counts = { '2025-10-13': 1, '2025-10-12': 1 };
    expect(summarize(counts, TODAY).currentStreak).toBe(0);
  });

  it('finds the longest streak anywhere in the history', () => {
    const counts = {
      '2025-09-01': 1,
      '2025-09-02': 1,
      '2025-09-03': 1,
      '2025-09-04': 1,
      '2025-10-15': 1,
    };
    const s = summarize(counts, TODAY);
    expect(s.longestStreak).toBe(4);
    expect(s.currentStreak).toBe(1);
  });

  it('totals the last 7 and 30 days and counts active days', () => {
    const counts = { '2025-10-15': 2, '2025-10-10': 1, '2025-10-01': 4, '2025-08-01': 9 };
    const s = summarize(counts, TODAY);
    expect(s.last7).toBe(3); // 15th and 10th are inside the last 7 days (9 to 15 Oct)
    expect(s.last30).toBe(7);
    expect(s.activeDays30).toBe(3);
  });

  it('ignores future-dated entries for the longest streak', () => {
    const counts = { '2025-10-16': 1, '2025-10-17': 1, '2025-10-18': 1 };
    expect(summarize(counts, TODAY).longestStreak).toBe(0);
  });
});
