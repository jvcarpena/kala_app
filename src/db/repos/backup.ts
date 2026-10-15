import {
  FORMAT_VERSION,
  TABLE_ORDER,
  TRANSIENT_SETTINGS,
  type Backup,
  type Row,
  type TableName,
} from '@/features/backup/format';

import type { Db } from '../client';
import { SCHEMA_VERSION } from '../schema-version';
import {
  domains,
  focusSessions,
  habitLogs,
  habits,
  notes,
  settings,
  tasks,
  templateExercises,
  workoutSessions,
  workoutSets,
  workoutTemplates,
} from '../schema';

const TABLES = {
  domains,
  tasks,
  habits,
  habitLogs,
  focusSessions,
  workoutTemplates,
  templateExercises,
  workoutSessions,
  workoutSets,
  notes,
  settings,
} as const satisfies Record<TableName, unknown>;

/** Rows per INSERT. Keeps each statement well under SQLite's limit on bound variables. */
const CHUNK = 100;

/** Every table as plain rows, minus transient settings (a running timer, a rest countdown). */
export async function exportData(db: Db, now: number = Date.now()): Promise<Backup> {
  const data = {} as Record<TableName, Row[]>;
  for (const name of TABLE_ORDER) {
    const rows: Row[] = await db.select().from(TABLES[name]);
    data[name] = name === 'settings' ? rows.filter((r) => !(TRANSIENT_SETTINGS as readonly unknown[]).includes(r.key)) : rows;
  }
  return { app: 'kala', formatVersion: FORMAT_VERSION, schemaVersion: SCHEMA_VERSION, exportedAt: now, data };
}

/**
 * Replaces everything with the backup's rows, in one transaction: if any row is rejected (a
 * missing domain, a broken reference, a duplicate id), nothing changes. Pass a backup from
 * `parseBackup`, which has already checked its shape and versions.
 */
export function importData(db: Db, backup: Backup): void {
  db.transaction((tx) => {
    // Children first, so no row is ever left pointing at a deleted parent.
    for (const name of [...TABLE_ORDER].reverse()) tx.delete(TABLES[name]).run();

    for (const name of TABLE_ORDER) {
      const rows = backup.data[name];
      for (let i = 0; i < rows.length; i += CHUNK) {
        // The rows are untyped JSON; SQLite's constraints are the final check, inside the transaction.
        const insert = tx.insert(TABLES[name]) as unknown as { values(rows: Row[]): { run(): unknown } };
        insert.values(rows.slice(i, i + CHUNK)).run();
      }
    }
  });
}
