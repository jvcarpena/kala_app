import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { Db } from '@/db/client';
import { exportData, importData } from '@/db/repos/backup';
import { habits } from '@/db/schema';
import type { CompanionMode, Language } from '@/db/settings';
import { cancelHabitReminders, syncHabitReminders, type ReminderResult } from '@/features/habits/reminders';
import { parseSchedule } from '@/features/habits/logic';

import { backupFileName, type Backup } from './format';

// The parts of backup that touch the phone: temp files, the share sheet, the file picker and
// reminders. Everything else (format, rules, database) is in format.ts and src/db/repos/backup.ts,
// where it is tested. Not covered by Jest: needs a device.

export type ShareResult = 'shared' | 'unavailable';

/** Writes every table to a JSON file in the cache folder and opens the share sheet with it. */
export async function shareBackup(db: Db, now: Date = new Date()): Promise<ShareResult> {
  if (!(await Sharing.isAvailableAsync())) return 'unavailable';
  const backup = await exportData(db, now.getTime());
  const file = new File(Paths.cache, backupFileName(now));
  file.create({ overwrite: true });
  file.write(JSON.stringify(backup));
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    UTI: 'public.json',
    dialogTitle: 'Save your Kala backup',
  });
  return 'shared';
}

/** Lets you pick a file and returns its text, or null if you backed out. Validation happens in `parseBackup`. */
export async function pickBackupText(): Promise<string | null> {
  // Android file pickers often label .json files as octet-stream, so don't filter by type here.
  const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
  if (result.canceled || result.assets.length === 0) return null;
  // Read with fetch, not `new File(uri).text()`: the picker's cache copy sits outside the folders
  // the File API may read, so it fails with "Missing 'READ' permission" (seen in Expo Go on Android).
  const response = await fetch(result.assets[0].uri);
  return response.text();
}

export type RestoreResult = { reminders: ReminderResult | 'none' };

/**
 * Replaces everything with the backup, then redoes habit reminders to match. A copy of the data
 * being replaced is kept first, in the app's own storage (`kala-before-restore.json`), so a
 * restore that turns out wrong can be undone by importing that file.
 */
export async function applyRestore(
  db: Db,
  backup: Backup,
  voice: { language: Language; mode: CompanionMode },
): Promise<RestoreResult> {
  const keep = new File(Paths.document, 'kala-before-restore.json');
  keep.create({ overwrite: true });
  keep.write(JSON.stringify(await exportData(db)));

  const oldHabits = await db.select({ id: habits.id }).from(habits);
  importData(db, backup);

  // Reminders live on the device, not in the database: drop the old ones, schedule the new ones.
  await Promise.all(oldHabits.map((h) => cancelHabitReminders(h.id)));
  const results: ReminderResult[] = [];
  for (const h of await db.select().from(habits)) {
    if (h.archived || !h.reminderTime) continue;
    results.push(
      await syncHabitReminders({ id: h.id, name: h.name, schedule: parseSchedule(h.schedule), reminderTime: h.reminderTime }, voice),
    );
  }
  const worst = results.find((r) => r === 'denied') ?? results.find((r) => r === 'unsupported') ?? results[0];
  return { reminders: worst ?? 'none' };
}
