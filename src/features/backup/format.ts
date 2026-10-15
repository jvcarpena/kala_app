import { format } from 'date-fns';

// The backup file: every table as plain JSON rows, plus enough version info to refuse files
// this app can't understand. Pure functions only; reading and writing files lives in io.ts and
// the database work in src/db/repos/backup.ts.

export const FORMAT_VERSION = 1;

/** Tables in foreign-key order: each one only points at tables listed before it. */
export const TABLE_ORDER = [
  'domains',
  'tasks',
  'habits',
  'habitLogs',
  'focusSessions',
  'workoutTemplates',
  'templateExercises',
  'workoutSessions',
  'workoutSets',
  'notes',
  'settings',
] as const;

export type TableName = (typeof TABLE_ORDER)[number];
export type Row = Record<string, unknown>;

/** Settings that describe what's happening right now on this phone. Never exported, reset on import. */
export const TRANSIENT_SETTINGS = ['activeTimer', 'restTimer'] as const;

export type Backup = {
  app: 'kala';
  formatVersion: number;
  schemaVersion: number;
  exportedAt: number;
  data: Record<TableName, Row[]>;
};

export const READ_ERROR = "Couldn't read this backup file. Pick a file exported from Kala (.json).";
export const NO_DOMAINS_ERROR = "This backup has no life domains, so Kala can't use it.";
export const NEWER_ERROR = 'This backup is from a newer version of Kala. Update the app, then try again.';

export type ParseResult = { ok: true; backup: Backup } | { ok: false; error: string };

const isObject = (v: unknown): v is Row => typeof v === 'object' && v !== null && !Array.isArray(v);
const isWholeNumber = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
const isTransient = (key: unknown) => (TRANSIENT_SETTINGS as readonly unknown[]).includes(key);

/** Every row needs its primary key: SQLite would otherwise accept a NULL text id. */
function rowsAreValid(table: TableName, rows: unknown[]): rows is Row[] {
  return rows.every((r) => {
    if (!isObject(r)) return false;
    if (table === 'settings') return typeof r.key === 'string' && r.key !== '' && typeof r.value === 'string';
    return typeof r.id === 'string' && r.id !== '';
  });
}

/**
 * Checks a backup file and returns it ready to import. Accepts backups from this schema version
 * or older (every migration so far only adds columns, and missing columns get their defaults);
 * refuses newer ones. Unknown tables are dropped, and transient settings are removed.
 */
export function parseBackup(text: string, currentSchemaVersion: number): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: READ_ERROR };
  }
  if (!isObject(raw) || raw.app !== 'kala' || !isObject(raw.data)) return { ok: false, error: READ_ERROR };
  if (!isWholeNumber(raw.formatVersion) || raw.formatVersion < 1) return { ok: false, error: READ_ERROR };
  if (!isWholeNumber(raw.schemaVersion) || raw.schemaVersion < 1) return { ok: false, error: READ_ERROR };
  if (typeof raw.exportedAt !== 'number' || !Number.isFinite(raw.exportedAt)) return { ok: false, error: READ_ERROR };
  if (raw.formatVersion > FORMAT_VERSION || raw.schemaVersion > currentSchemaVersion) return { ok: false, error: NEWER_ERROR };

  const data = {} as Record<TableName, Row[]>;
  for (const table of TABLE_ORDER) {
    const rows = raw.data[table];
    if (!Array.isArray(rows) || !rowsAreValid(table, rows)) return { ok: false, error: READ_ERROR };
    data[table] = table === 'settings' ? rows.filter((r) => !isTransient(r.key)) : rows;
  }

  // Tasks and habits always need a domain to belong to, and the pickers need at least one active.
  if (!data.domains.some((d) => d.archived !== true)) return { ok: false, error: NO_DOMAINS_ERROR };

  return {
    ok: true,
    backup: upgradeBackup({
      app: 'kala',
      formatVersion: raw.formatVersion,
      schemaVersion: raw.schemaVersion,
      exportedAt: raw.exportedAt,
      data,
    }),
  };
}

/**
 * Brings an older backup up to the current schema. Nothing to do yet: every migration so far
 * only added columns, which take their schema defaults on insert. If a migration ever renames or
 * removes a column, add a step here keyed on `backup.schemaVersion`.
 */
export function upgradeBackup(backup: Backup): Backup {
  return backup;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** "From Thu 15 Oct 2026 · 4 domains, 23 tasks, 5 habits, 12 workouts, 3 notes" for the confirm dialog. */
export function backupSummary(backup: Backup): string {
  const d = backup.data;
  const counts = [
    plural(d.domains.filter((r) => r.archived !== true).length, 'domain'),
    plural(d.tasks.filter((r) => r.status !== 'archived').length, 'task'),
    plural(d.habits.filter((r) => r.archived !== true).length, 'habit'),
    plural(d.workoutSessions.filter((r) => r.endedAt != null).length, 'workout'),
    plural(d.notes.filter((r) => r.processed !== true).length, 'note'),
  ];
  return `From ${format(backup.exportedAt, 'EEE d MMM yyyy')} · ${counts.join(', ')}`;
}

/** `kala-backup-2026-10-15.json` */
export function backupFileName(at: Date | number): string {
  return `kala-backup-${format(at, 'yyyy-MM-dd')}.json`;
}
