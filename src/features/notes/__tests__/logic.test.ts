import { dueChoices } from '@/features/tasks/logic';

import { canSaveCapture, isDraftDirty, noteToTaskDraft, TITLE_MAX } from '../logic';

describe('noteToTaskDraft', () => {
  it('uses a single line as the title', () => {
    expect(noteToTaskDraft('Buy rice')).toEqual({ title: 'Buy rice', notes: '' });
  });

  it('puts the first line in the title and the rest in the notes', () => {
    expect(noteToTaskDraft('Call the clinic\n\nAsk about Tuesday\nBring ID')).toEqual({
      title: 'Call the clinic',
      notes: 'Ask about Tuesday\nBring ID',
    });
  });

  it('trims whitespace and handles Windows line endings', () => {
    expect(noteToTaskDraft('  Pay rent  \r\n  due Friday ')).toEqual({ title: 'Pay rent', notes: 'due Friday' });
  });

  it('cuts a very long first line at a word and keeps the full text in the notes', () => {
    const long = `${'word '.repeat(60)}end`;
    const d = noteToTaskDraft(`${long}\nextra`);
    expect(d.title.length).toBeLessThanOrEqual(TITLE_MAX);
    expect(d.title.endsWith('word')).toBe(true);
    expect(d.notes).toBe(`${long}\nextra`);
  });

  it('cuts a long unbroken line at the limit', () => {
    const d = noteToTaskDraft('x'.repeat(300));
    expect(d.title).toHaveLength(TITLE_MAX);
    expect(d.notes).toHaveLength(300);
  });

  it('gives an empty draft for an empty note', () => {
    expect(noteToTaskDraft('   ')).toEqual({ title: '', notes: '' });
  });
});

describe('canSaveCapture', () => {
  const empty = { note: '', taskTitle: '' };
  it('needs text in the active segment', () => {
    expect(canSaveCapture('note', empty, true)).toBe(false);
    expect(canSaveCapture('note', { ...empty, note: '  ' }, true)).toBe(false);
    expect(canSaveCapture('note', { ...empty, note: 'idea' }, true)).toBe(true);
    // Text typed in the other segment doesn't enable this one.
    expect(canSaveCapture('task', { ...empty, note: 'idea' }, true)).toBe(false);
  });

  it('needs a domain for a task', () => {
    expect(canSaveCapture('task', { ...empty, taskTitle: 'Email Sam' }, false)).toBe(false);
    expect(canSaveCapture('task', { ...empty, taskTitle: 'Email Sam' }, true)).toBe(true);
  });

  it('never saves from the Log segment', () => {
    expect(canSaveCapture('log', { note: 'x', taskTitle: 'y' }, true)).toBe(false);
  });
});

describe('isDraftDirty', () => {
  it('is dirty when either field has text', () => {
    expect(isDraftDirty({ note: '', taskTitle: '' })).toBe(false);
    expect(isDraftDirty({ note: '  ', taskTitle: '' })).toBe(false);
    expect(isDraftDirty({ note: 'a', taskTitle: '' })).toBe(true);
    expect(isDraftDirty({ note: '', taskTitle: 'b' })).toBe(true);
  });
});

describe('dueChoices', () => {
  const label = (k: string) => `custom ${k}`;
  it('offers no date, today, tomorrow and in a week', () => {
    expect(dueChoices('2026-10-14', null, label)).toEqual([
      { label: 'No date', value: null },
      { label: 'Today', value: '2026-10-14' },
      { label: 'Tomorrow', value: '2026-10-15' },
      { label: 'In a week', value: '2026-10-21' },
    ]);
  });

  it('keeps an existing custom date visible, right after No date', () => {
    const c = dueChoices('2026-10-14', '2026-11-02', label);
    expect(c[1]).toEqual({ label: 'custom 2026-11-02', value: '2026-11-02' });
    expect(c).toHaveLength(5);
  });

  it('does not duplicate a date that is already a chip', () => {
    expect(dueChoices('2026-10-14', '2026-10-15', label)).toHaveLength(4);
  });
});
