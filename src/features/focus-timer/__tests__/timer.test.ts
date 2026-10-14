import {
  MINUTE,
  createTimer,
  elapsedFraction,
  finishTimer,
  formatClock,
  hasEnded,
  nextPhase,
  pauseTimer,
  remainingMs,
  resumeTimer,
  spokenClock,
} from '../timer';

const T0 = 1_000_000;
const base = { taskId: 't1', domainId: 'd1', phase: 'focus', round: 1, plannedMin: 25, sessionId: 's1' } as const;
const start = () => createTimer(base, T0);

describe('createTimer', () => {
  it('starts running and ends planned minutes later', () => {
    const t = start();
    expect(t).toMatchObject({ status: 'running', startedAt: T0, endsAt: T0 + 25 * MINUTE, phase: 'focus', round: 1 });
    expect(remainingMs(t, T0)).toBe(25 * MINUTE);
  });
});

describe('remainingMs and hasEnded', () => {
  it('counts down from the real clock, not from ticks', () => {
    const t = start();
    expect(remainingMs(t, T0 + 10 * MINUTE)).toBe(15 * MINUTE);
    expect(remainingMs(t, T0 + 25 * MINUTE)).toBe(0);
    expect(remainingMs(t, T0 + 99 * MINUTE)).toBe(0); // e.g. the app was closed for ages
  });

  it('only reports ended once the time is up', () => {
    const t = start();
    expect(hasEnded(t, T0 + 25 * MINUTE - 1)).toBe(false);
    expect(hasEnded(t, T0 + 25 * MINUTE)).toBe(true);
    expect(hasEnded(finishTimer(t), T0 + 99 * MINUTE)).toBe(false);
  });
});

describe('pause and resume', () => {
  it('freezes the remaining time while paused, however long it stays paused', () => {
    const paused = pauseTimer(start(), T0 + 10 * MINUTE);
    expect(paused.status).toBe('paused');
    expect(remainingMs(paused, T0 + 10 * MINUTE)).toBe(15 * MINUTE);
    expect(remainingMs(paused, T0 + 500 * MINUTE)).toBe(15 * MINUTE);
    expect(hasEnded(paused, T0 + 500 * MINUTE)).toBe(false);
  });

  it('resumes with exactly the time that was left', () => {
    const paused = pauseTimer(start(), T0 + 10 * MINUTE);
    const resumed = resumeTimer(paused, T0 + 60 * MINUTE);
    expect(resumed.status).toBe('running');
    expect(resumed.endsAt).toBe(T0 + 60 * MINUTE + 15 * MINUTE);
    expect(remainingMs(resumed, T0 + 60 * MINUTE)).toBe(15 * MINUTE);
  });

  it('ignores pause on a paused timer and resume on a running one', () => {
    const running = start();
    expect(resumeTimer(running, T0 + 1)).toBe(running);
    const paused = pauseTimer(running, T0 + 5);
    expect(pauseTimer(paused, T0 + 9)).toBe(paused);
  });

  it('does not let remaining time go negative if paused after the end', () => {
    expect(pauseTimer(start(), T0 + 40 * MINUTE).remainingMs).toBe(0);
  });
});

describe('finishTimer and elapsedFraction', () => {
  it('finishes with nothing left and keeps the real end time', () => {
    const done = finishTimer(start());
    expect(done).toMatchObject({ status: 'finished', remainingMs: 0, endsAt: T0 + 25 * MINUTE });
    expect(remainingMs(done, T0)).toBe(0);
  });

  it('reports progress from 0 to 1', () => {
    const t = start();
    expect(elapsedFraction(t, T0)).toBe(0);
    expect(elapsedFraction(t, T0 + 5 * MINUTE)).toBeCloseTo(0.2);
    expect(elapsedFraction(t, T0 + 25 * MINUTE)).toBe(1);
    expect(elapsedFraction(finishTimer(t), T0)).toBe(1);
  });
});

describe('clock text', () => {
  it('formats mm:ss and rounds up', () => {
    expect(formatClock(25 * MINUTE)).toBe('25:00');
    expect(formatClock(24 * MINUTE + 59_001)).toBe('25:00');
    expect(formatClock(61_000)).toBe('01:01');
    expect(formatClock(1)).toBe('00:01');
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(-5)).toBe('00:00');
    expect(formatClock(90 * MINUTE)).toBe('90:00');
  });

  it('speaks the time for screen readers', () => {
    expect(spokenClock(18 * MINUTE + 42_000)).toBe('18 minutes 42 seconds');
    expect(spokenClock(MINUTE)).toBe('1 minute');
    expect(spokenClock(1_000)).toBe('1 second');
    expect(spokenClock(45_000)).toBe('45 seconds');
  });
});

describe('nextPhase', () => {
  const pomodoro = { focusMin: 25, breakMin: 5 };

  it('goes from focus to a break in the same round', () => {
    expect(nextPhase(start(), pomodoro)).toEqual({ phase: 'break', round: 1, plannedMin: 5 });
  });

  it('goes from a break to the next focus round', () => {
    const breakTimer = createTimer({ ...base, phase: 'break', plannedMin: 5, sessionId: null }, T0);
    expect(nextPhase(breakTimer, pomodoro)).toEqual({ phase: 'focus', round: 2, plannedMin: 25 });
  });
});
