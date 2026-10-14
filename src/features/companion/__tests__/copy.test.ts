import {
  emptyTasks,
  greeting,
  habitReminderBody,
  habitsLine,
  overdueBody,
  overdueHeading,
  streakLine,
  timerAlert,
  timerLine,
  todayLine,
} from '../copy';

const taglish = { language: 'taglish', mode: 'chatty' } as const;
const english = { language: 'english', mode: 'chatty' } as const;
const quiet = { language: 'taglish', mode: 'quiet' } as const;

describe('greeting', () => {
  it('follows the time of day in both languages', () => {
    expect(greeting(taglish, 8)).toBe('Magandang umaga!');
    expect(greeting(taglish, 14)).toBe('Magandang hapon!');
    expect(greeting(taglish, 21)).toBe('Magandang gabi!');
    expect(greeting(english, 8)).toBe('Good morning!');
  });
});

describe('todayLine', () => {
  it('counts what is left and celebrates a cleared day', () => {
    expect(todayLine(3, 0, english)).toBe('3 things left today.');
    expect(todayLine(1, 2, english)).toBe('1 thing left today.');
    expect(todayLine(0, 4, taglish)).toBe('Tapos na talaga! Pahinga ka na.');
    expect(todayLine(0, 0, english)).toBe('Nothing planned yet today.');
  });
});

describe('overdue copy', () => {
  it('uses the "kala ko" joke only in chatty mode', () => {
    expect(overdueHeading(taglish)).toBe('Kala ko tapos na?');
    expect(overdueHeading(english)).toBe('Thought this was done?');
    expect(overdueHeading(quiet)).toBe('Overdue');
  });

  it('names the task, says when it was due and counts the rest', () => {
    expect(overdueBody('Submit lab report', '2025-10-14', '2025-10-15', 0)).toBe(
      '"Submit lab report" was due yesterday and is still open.',
    );
    expect(overdueBody('Pay rent', '2025-10-10', '2025-10-15', 2)).toContain('+2 more overdue.');
  });
});

describe('emptyTasks', () => {
  it('names the domain and keeps a next step in the body', () => {
    expect(emptyTasks(taglish, 'Study').title).toBe('Wala nang Study tasks');
    expect(emptyTasks(english, 'Study').title).toBe('No Study tasks');
    expect(emptyTasks(quiet).body).toContain('+ button');
  });
});

describe('streakLine', () => {
  it('stays quiet until there is a streak, and in quiet mode', () => {
    expect(streakLine(taglish, 0)).toBeNull();
    expect(streakLine(taglish, 1)).toBeNull();
    expect(streakLine(quiet, 10)).toBeNull();
  });

  it('encourages short streaks and celebrates a week', () => {
    expect(streakLine(taglish, 3)).toBe('3 days in a row. Tuloy lang!');
    expect(streakLine(english, 3)).toBe('3 days in a row. Keep going!');
    expect(streakLine(taglish, 7)).toBe('7 days straight! Lodi.');
  });
});

describe('habit copy', () => {
  it('keeps reminders plain in quiet mode', () => {
    expect(habitReminderBody(quiet)).toBe('Habit reminder');
    expect(habitReminderBody(english)).toBe("Time for this one. You've got it.");
  });

  it('tracks progress through the day and stays silent with no habits or in quiet mode', () => {
    expect(habitsLine(english, 0, 0)).toBeNull();
    expect(habitsLine(quiet, 1, 3)).toBeNull();
    expect(habitsLine(english, 0, 3)).toBe("Let's start with just one.");
    expect(habitsLine(english, 1, 3)).toBe('2 to go.');
    expect(habitsLine(taglish, 3, 3)).toBe('Kumpleto ngayon! Galing.');
  });
});

describe('timer copy', () => {
  it('has a line for every state in chatty mode and none in quiet mode', () => {
    for (const state of ['running', 'paused', 'focusDone', 'breakRunning', 'breakDone'] as const) {
      expect(timerLine(taglish, state)).toEqual(expect.any(String));
      expect(timerLine(english, state)).toEqual(expect.any(String));
      expect(timerLine(quiet, state)).toBeNull();
    }
    expect(timerLine(taglish, 'running')).toBe('Tara, focus.');
  });

  it('writes plain alerts in quiet mode and Taglish only when chatty', () => {
    expect(timerAlert(taglish, 'focus')).toEqual({ title: 'Focus complete', body: 'Tapos na! Pahinga muna.' });
    expect(timerAlert(english, 'break').body).toBe('Ready for another round?');
    expect(timerAlert(quiet, 'focus').body).toBe('Nice work. Time for a break.');
  });
});
