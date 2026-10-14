import { fromDrafts, move, newDraft, toDraft, validateTemplate } from '../editor';

describe('fromDrafts', () => {
  it('drops blank names, trims, and reads numbers', () => {
    const out = fromDrafts([
      newDraft({ name: '  Bench press ', sets: '4', reps: '8', weight: '60', restSec: '120' }),
      newDraft({ name: '   ' }),
    ]);
    expect(out).toEqual([{ name: 'Bench press', sets: 4, reps: 8, weight: 60, restSec: 120 }]);
  });

  it('treats an empty or zero weight as bodyweight and accepts a decimal comma', () => {
    expect(fromDrafts([newDraft({ name: 'Pull-up', weight: '' })])[0].weight).toBeNull();
    expect(fromDrafts([newDraft({ name: 'Pull-up', weight: '0' })])[0].weight).toBeNull();
    expect(fromDrafts([newDraft({ name: 'Squat', weight: '57,5' })])[0].weight).toBe(57.5);
  });

  it('clamps counts and falls back to defaults for junk', () => {
    const [a] = fromDrafts([newDraft({ name: 'A', sets: '0', reps: '999', restSec: '-5' })]);
    expect(a).toMatchObject({ sets: 1, reps: 100, restSec: 0 });
    const [b] = fromDrafts([newDraft({ name: 'B', sets: '', reps: 'abc', restSec: '' })]);
    expect(b).toMatchObject({ sets: 3, reps: 10, restSec: 90 });
  });
});

describe('toDraft', () => {
  it('round-trips an exercise', () => {
    const ex = { name: 'Row', sets: 4, reps: 8, weight: 40, restSec: 60 };
    expect(fromDrafts([toDraft(ex)])).toEqual([ex]);
    expect(toDraft({ ...ex, weight: null }).weight).toBe('');
  });
});

describe('validateTemplate', () => {
  it('asks for a name and at least one exercise', () => {
    expect(validateTemplate('', [newDraft({ name: 'Row' })])).toBe('Give the workout a name.');
    expect(validateTemplate('Pull', [newDraft({ name: '  ' })])).toBe('Add at least one exercise.');
    expect(validateTemplate('Pull', [newDraft({ name: 'Row' })])).toBeNull();
  });
});

describe('move', () => {
  it('moves an item and leaves the original alone', () => {
    const list = ['a', 'b', 'c'];
    expect(move(list, 0, 2)).toEqual(['b', 'c', 'a']);
    expect(list).toEqual(['a', 'b', 'c']);
  });

  it('ignores moves that go out of range', () => {
    const list = ['a', 'b'];
    expect(move(list, 0, -1)).toBe(list);
    expect(move(list, 1, 2)).toBe(list);
    expect(move(list, 1, 1)).toBe(list);
  });
});
