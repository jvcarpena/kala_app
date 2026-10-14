import type { CompanionMode, Language } from '@/db/settings';
import { dueLabel } from '@/lib/dates';

// Kala's lines. Short, kind, one at a time. Taglish by default.
// Quiet mode drops the jokes and keeps only plain, useful text; Off hides Kala.

type Voice = { language: Language; mode: CompanionMode };

const chatty = (v: Voice) => v.mode === 'chatty';

export function greeting(v: Voice, hour: number): string {
  const taglish = v.language === 'taglish';
  if (hour < 12) return taglish ? 'Magandang umaga!' : 'Good morning!';
  if (hour < 18) return taglish ? 'Magandang hapon!' : 'Good afternoon!';
  return taglish ? 'Magandang gabi!' : 'Good evening!';
}

export function todayLine(openCount: number, doneCount: number, v: Voice): string {
  const taglish = v.language === 'taglish';
  if (openCount === 0 && doneCount > 0) return taglish ? 'Tapos na talaga! Pahinga ka na.' : 'Done for real! Time to rest.';
  if (openCount === 0) return taglish ? 'Wala pang naka-plan ngayon.' : 'Nothing planned yet today.';
  return openCount === 1 ? '1 thing left today.' : `${openCount} things left today.`;
}

export function overdueHeading(v: Voice): string {
  if (!chatty(v)) return 'Overdue';
  return v.language === 'taglish' ? 'Kala ko tapos na?' : 'Thought this was done?';
}

export function overdueBody(title: string, dueDate: string, today: string, moreCount: number): string {
  const when = dueLabel(dueDate, today).toLowerCase();
  const more = moreCount > 0 ? ` +${moreCount} more overdue.` : '';
  return `"${title}" was due ${when} and is still open.${more}`;
}

export function emptyTasks(v: Voice, domainName?: string): { title: string; body: string } {
  const taglish = v.language === 'taglish' && chatty(v);
  const where = domainName ? ` ${domainName}` : '';
  return {
    title: taglish ? `Wala nang${where} tasks` : `No${where} tasks`,
    body: taglish
      ? 'Nothing left here. Add one with the + button, or chill muna.'
      : 'Nothing left here. Add one with the + button.',
  };
}

/** Kala's comment under the activity grid. Null when there's nothing to celebrate yet. */
export function streakLine(v: Voice, streak: number): string | null {
  if (!chatty(v) || streak < 2) return null;
  const taglish = v.language === 'taglish';
  if (streak >= 7) return taglish ? `${streak} days straight! Lodi.` : `${streak} days straight! Nice.`;
  return taglish ? `${streak} days in a row. Tuloy lang!` : `${streak} days in a row. Keep going!`;
}

export function habitReminderBody(v: Voice): string {
  if (!chatty(v)) return 'Habit reminder';
  return v.language === 'taglish' ? "Oras na! Kaya mo 'yan." : "Time for this one. You've got it.";
}

/** Line above the habit list. Null when there are no habits scheduled today. */
export function habitsLine(v: Voice, done: number, total: number): string | null {
  if (total === 0 || !chatty(v)) return null;
  const taglish = v.language === 'taglish';
  if (done === total) return taglish ? 'Kumpleto ngayon! Galing.' : 'All done today. Nice.';
  if (done === 0) return taglish ? 'Simulan natin, isa lang muna.' : "Let's start with just one.";
  return taglish ? `${total - done} na lang!` : `${total - done} to go.`;
}

export type TimerLineState = 'running' | 'paused' | 'focusDone' | 'breakRunning' | 'breakDone';

/** Kala's line on the timer screen. Null in quiet mode, where the timer speaks for itself. */
export function timerLine(v: Voice, state: TimerLineState): string | null {
  if (!chatty(v)) return null;
  const taglish = v.language === 'taglish';
  switch (state) {
    case 'running':
      return taglish ? 'Tara, focus.' : "You've got this.";
    case 'paused':
      return taglish ? 'Sige, hinga muna. Hihintayin kita.' : "Take a breath. I'll wait.";
    case 'focusDone':
      return taglish ? 'Tapos na ang focus! Pahinga muna.' : 'Focus done! Time for a break.';
    case 'breakRunning':
      return taglish ? 'Chill muna tayo.' : 'Easy does it.';
    case 'breakDone':
      return taglish ? 'Balik tayo? Isa pang round.' : 'Ready for another round?';
  }
}

/** The notification shown when a phase ends while the app isn't in front. */
export function timerAlert(v: Voice, phase: 'focus' | 'break'): { title: string; body: string } {
  const taglish = v.language === 'taglish' && chatty(v);
  if (phase === 'focus') {
    return { title: 'Focus complete', body: taglish ? 'Tapos na! Pahinga muna.' : 'Nice work. Time for a break.' };
  }
  return { title: 'Break is over', body: taglish ? 'Balik tayo? Isa pang round.' : 'Ready for another round?' };
}

export function fitnessEmpty(v: Voice): { title: string; body: string } {
  const taglish = v.language === 'taglish' && chatty(v);
  return {
    title: taglish ? 'Wala pang workout' : 'No workouts yet',
    body: 'Create a template, or start with a push, pull and legs split.',
  };
}

/** Kala's line when a workout is finished. Plain numbers in quiet mode. */
export function workoutDoneLine(v: Voice, minutes: number, sets: number): string {
  const facts = `${minutes} min, ${sets} ${sets === 1 ? 'set' : 'sets'}.`;
  if (!chatty(v)) return facts;
  return `${v.language === 'taglish' ? 'Lakas!' : 'Strong!'} ${facts}`;
}

export function recordLine(v: Voice, count: number): string {
  const plural = count === 1 ? 'record' : 'records';
  if (!chatty(v)) return `${count} new personal ${plural}`;
  return v.language === 'taglish' ? `${count} bagong ${plural}!` : `${count} new personal ${plural}!`;
}

export function inboxEmpty(v: Voice): { title: string; body: string } {
  const taglish = v.language === 'taglish' && chatty(v);
  return {
    title: taglish ? 'Wala pang laman ang inbox' : 'Your inbox is empty',
    body: 'Capture a quick note with the + button. You can turn it into a task later.',
  };
}

/** Line under the Inbox heading. */
export function inboxLine(count: number): string {
  return count === 1 ? '1 note to sort' : `${count} notes to sort`;
}
