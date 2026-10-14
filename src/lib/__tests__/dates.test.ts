import { addDaysToKey, daysAgoLabel, dueLabel, shortLabel, todayKey } from '../dates';

describe('dates', () => {
  it('builds local date keys and moves them across month ends', () => {
    expect(todayKey(new Date(2025, 9, 15, 23, 59))).toBe('2025-10-15');
    expect(addDaysToKey('2025-10-31', 1)).toBe('2025-11-01');
    expect(addDaysToKey('2025-03-01', -1)).toBe('2025-02-28');
  });

  it('labels due dates relative to today', () => {
    expect(dueLabel('2025-10-15', '2025-10-15')).toBe('Today');
    expect(dueLabel('2025-10-16', '2025-10-15')).toBe('Tomorrow');
    expect(dueLabel('2025-10-14', '2025-10-15')).toBe('Yesterday');
    expect(dueLabel('2025-10-20', '2025-10-15')).toBe(shortLabel('2025-10-20'));
  });

  it('says how long ago something happened in calendar days', () => {
    const now = new Date(2025, 9, 15, 8, 0).getTime();
    expect(daysAgoLabel(new Date(2025, 9, 15, 7, 0).getTime(), now)).toBe('today');
    expect(daysAgoLabel(new Date(2025, 9, 14, 23, 0).getTime(), now)).toBe('yesterday');
    expect(daysAgoLabel(new Date(2025, 9, 6, 12, 0).getTime(), now)).toBe('9 days ago');
  });
});
