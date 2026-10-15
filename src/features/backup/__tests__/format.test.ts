import { backupFileName, backupSummary, NEWER_ERROR, NO_DOMAINS_ERROR, parseBackup, READ_ERROR, TABLE_ORDER, type Backup } from '../format';

const T = new Date(2026, 9, 15, 9).getTime();

function file(over: Record<string, unknown> = {}, data: Record<string, unknown> = {}) {
  const tables = Object.fromEntries(TABLE_ORDER.map((t) => [t, []]));
  return JSON.stringify({
    app: 'kala',
    formatVersion: 1,
    schemaVersion: 3,
    exportedAt: T,
    data: { ...tables, domains: [{ id: 'd1', name: 'Work' }], ...data },
    ...over,
  });
}

describe('parseBackup', () => {
  it('accepts a valid file from this schema version', () => {
    const r = parseBackup(file(), 3);
    expect(r.ok).toBe(true);
  });

  it('accepts an older schema version', () => {
    expect(parseBackup(file({ schemaVersion: 1 }), 3).ok).toBe(true);
  });

  it('refuses a newer schema or format version with a clear message', () => {
    expect(parseBackup(file({ schemaVersion: 4 }), 3)).toEqual({ ok: false, error: NEWER_ERROR });
    expect(parseBackup(file({ formatVersion: 2 }), 3)).toEqual({ ok: false, error: NEWER_ERROR });
  });

  it.each([
    ['not JSON', 'hello'],
    ['JSON but not an object', '[1,2]'],
    ['another app', file({ app: 'notes' })],
    ['no data', file({ data: null })],
    ['a bad version', file({ schemaVersion: 'three' })],
    ['a bad timestamp', file({ exportedAt: 'yesterday' })],
  ])('refuses %s', (_label, text) => {
    expect(parseBackup(text, 3)).toEqual({ ok: false, error: READ_ERROR });
  });

  it('refuses a missing or non-array table', () => {
    const tables = Object.fromEntries(TABLE_ORDER.filter((t) => t !== 'habits').map((t) => [t, t === 'domains' ? [{ id: 'd1' }] : []]));
    const missing = JSON.stringify({ app: 'kala', formatVersion: 1, schemaVersion: 3, exportedAt: T, data: tables });
    expect(parseBackup(missing, 3).ok).toBe(false);
    expect(parseBackup(file({}, { tasks: {} }), 3).ok).toBe(false);
  });

  it('refuses rows without a primary key, since SQLite would accept a NULL text id', () => {
    expect(parseBackup(file({}, { tasks: [{ title: 'no id' }] }), 3).ok).toBe(false);
    expect(parseBackup(file({}, { tasks: [{ id: '' }] }), 3).ok).toBe(false);
    expect(parseBackup(file({}, { settings: [{ key: 'language' }] }), 3).ok).toBe(false);
  });

  it('refuses a backup with no active life domain', () => {
    expect(parseBackup(file({}, { domains: [] }), 3)).toEqual({ ok: false, error: NO_DOMAINS_ERROR });
    expect(parseBackup(file({}, { domains: [{ id: 'd1', archived: true }] }), 3)).toEqual({ ok: false, error: NO_DOMAINS_ERROR });
  });

  it('drops transient settings and unknown tables', () => {
    const r = parseBackup(
      file({}, {
        settings: [
          { key: 'language', value: '"english"' },
          { key: 'activeTimer', value: '{}' },
          { key: 'restTimer', value: '{}' },
        ],
        somethingNew: [{ id: 'x' }],
      }),
      3,
    );
    if (!r.ok) throw new Error(r.error);
    expect(r.backup.data.settings.map((s) => s.key)).toEqual(['language']);
    expect('somethingNew' in r.backup.data).toBe(false);
  });
});

describe('backupSummary', () => {
  const backup = (data: Partial<Backup['data']>): Backup => ({
    app: 'kala',
    formatVersion: 1,
    schemaVersion: 3,
    exportedAt: T,
    data: { ...(Object.fromEntries(TABLE_ORDER.map((t) => [t, []])) as unknown as Backup['data']), ...data },
  });

  it('counts what you would see: active domains, open and done tasks, active habits, finished workouts, inbox notes', () => {
    const s = backupSummary(
      backup({
        domains: [{ id: 'a' }, { id: 'b' }, { id: 'c', archived: true }],
        tasks: [{ id: '1', status: 'todo' }, { id: '2', status: 'done' }, { id: '3', status: 'archived' }],
        habits: [{ id: 'h', archived: false }],
        workoutSessions: [{ id: 'w1', endedAt: T }, { id: 'w2', endedAt: null }],
        notes: [{ id: 'n1', processed: false }, { id: 'n2', processed: true }],
      }),
    );
    expect(s).toBe('From Thu 15 Oct 2026 · 2 domains, 2 tasks, 1 habit, 1 workout, 1 note');
  });

  it('says zero plainly for an empty backup', () => {
    expect(backupSummary(backup({}))).toBe('From Thu 15 Oct 2026 · 0 domains, 0 tasks, 0 habits, 0 workouts, 0 notes');
  });
});

it('names the file by date', () => {
  expect(backupFileName(T)).toBe('kala-backup-2026-10-15.json');
});
