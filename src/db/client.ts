import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from './schema';

// enableChangeListener lets useLiveQuery re-render screens when tables change.
const expo = openDatabaseSync('kala.db', { enableChangeListener: true });

// Foreign keys are off by default in SQLite. WAL is faster and safer for writes.
expo.execSync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

export const db = drizzle(expo, { schema });
export type Db = typeof db;
