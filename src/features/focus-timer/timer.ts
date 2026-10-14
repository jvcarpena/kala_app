// The focus timer is timestamp-based, never a tick counter, so it stays correct while the
// app is in the background, the screen is locked or the app is killed and reopened.

export const MINUTE = 60_000;

export type TimerPhase = 'focus' | 'break';
export type TimerStatus = 'running' | 'paused' | 'finished';

export type ActiveTimer = {
  taskId: string | null;
  domainId: string;
  phase: TimerPhase;
  /** 1 for the first focus session in a run, 2 for the next, and so on. A break shares its round. */
  round: number;
  plannedMin: number;
  /** When this phase started. */
  startedAt: number;
  status: TimerStatus;
  /** When a running phase ends (or ended, once finished). Unused while paused. */
  endsAt: number;
  /** Time left while paused. */
  remainingMs: number;
  /** The focus_sessions row for a focus phase. Breaks aren't recorded. */
  sessionId: string | null;
};

type NewTimer = Pick<ActiveTimer, 'taskId' | 'domainId' | 'phase' | 'round' | 'plannedMin' | 'sessionId'>;

export function createTimer(input: NewTimer, now: number): ActiveTimer {
  return {
    ...input,
    startedAt: now,
    status: 'running',
    endsAt: now + input.plannedMin * MINUTE,
    remainingMs: 0,
  };
}

export function remainingMs(t: ActiveTimer, now: number): number {
  switch (t.status) {
    case 'running':
      return Math.max(0, t.endsAt - now);
    case 'paused':
      return t.remainingMs;
    case 'finished':
      return 0;
  }
}

/** True once a running phase's time is up. The engine then calls finishTimer. */
export const hasEnded = (t: ActiveTimer, now: number): boolean => t.status === 'running' && now >= t.endsAt;

export function pauseTimer(t: ActiveTimer, now: number): ActiveTimer {
  if (t.status !== 'running') return t;
  return { ...t, status: 'paused', remainingMs: Math.max(0, t.endsAt - now) };
}

export function resumeTimer(t: ActiveTimer, now: number): ActiveTimer {
  if (t.status !== 'paused') return t;
  return { ...t, status: 'running', endsAt: now + t.remainingMs, remainingMs: 0 };
}

/** Marks the phase done. `endsAt` stays as the moment it really ended. */
export const finishTimer = (t: ActiveTimer): ActiveTimer => ({ ...t, status: 'finished', remainingMs: 0 });

/** How much of the phase has gone, 0 to 1. */
export function elapsedFraction(t: ActiveTimer, now: number): number {
  const total = t.plannedMin * MINUTE;
  if (total <= 0) return 1;
  return Math.min(1, Math.max(0, 1 - remainingMs(t, now) / total));
}

/** '24:59'. Rounds up so the clock never shows 00:00 while time is left. */
export function formatClock(ms: number): string {
  const totalSeconds = Math.ceil(Math.max(0, ms) / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Spoken form for screen readers: '18 minutes 42 seconds'. */
export function spokenClock(ms: number): string {
  const totalSeconds = Math.ceil(Math.max(0, ms) / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  const part = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'}`;
  if (m === 0) return part(s, 'second');
  if (s === 0) return part(m, 'minute');
  return `${part(m, 'minute')} ${part(s, 'second')}`;
}

export type Pomodoro = { focusMin: number; breakMin: number };

/** What follows a finished phase: a break after focus, the next round after a break. */
export function nextPhase(t: ActiveTimer, pomodoro: Pomodoro): Pick<NewTimer, 'phase' | 'round' | 'plannedMin'> {
  return t.phase === 'focus'
    ? { phase: 'break', round: t.round, plannedMin: pomodoro.breakMin }
    : { phase: 'focus', round: t.round + 1, plannedMin: pomodoro.focusMin };
}

export const FOCUS_LENGTHS = [15, 25, 50, 90] as const;
export const BREAK_LENGTHS = [5, 10, 15] as const;
