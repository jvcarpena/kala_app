export const TITLE_MAX = 200;

/** Splits a note into a task title (its first line) and notes (the rest). */
export function noteToTaskDraft(body: string): { title: string; notes: string } {
  const lines = body.trim().split(/\r?\n/);
  const first = (lines.shift() ?? '').trim();
  const rest = lines.join('\n').trim();
  if (first.length <= TITLE_MAX) return { title: first, notes: rest };
  // A very long first line: cut at a word boundary and keep the whole line in the notes.
  const cut = first.slice(0, TITLE_MAX);
  const space = cut.lastIndexOf(' ');
  const title = (space > TITLE_MAX / 2 ? cut.slice(0, space) : cut).trim();
  return { title, notes: [first, rest].filter(Boolean).join('\n') };
}

export type CaptureSegment = 'note' | 'task' | 'log';

export type CaptureDraft = {
  note: string;
  taskTitle: string;
};

/** Whether the Save button is enabled. The Log segment saves as you tap, so it has no Save. */
export function canSaveCapture(segment: CaptureSegment, draft: CaptureDraft, hasDomain: boolean): boolean {
  if (segment === 'note') return draft.note.trim().length > 0;
  if (segment === 'task') return draft.taskTitle.trim().length > 0 && hasDomain;
  return false;
}

/** Whether closing the sheet should ask before throwing something away. */
export function isDraftDirty(draft: CaptureDraft): boolean {
  return draft.note.trim().length > 0 || draft.taskTitle.trim().length > 0;
}
