import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import fs from 'fs';
import path from 'path';

import type { Db } from '@/db/client';
import * as schema from '@/db/schema';

/**
 * A real in-memory SQLite database with the app's generated migrations applied:
 * the same SQL the phone runs. For tests only.
 */
export function makeDb(): Db {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  const dir = path.join(__dirname, '../../drizzle');
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    for (const stmt of fs.readFileSync(path.join(dir, file), 'utf8').split('--> statement-breakpoint')) {
      if (stmt.trim()) sqlite.exec(stmt);
    }
  }
  return drizzle(sqlite, { schema }) as unknown as Db;
}
