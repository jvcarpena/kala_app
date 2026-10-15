import journal from '../../drizzle/meta/_journal.json';

/**
 * How many migrations this build of the app has. Backups record it so an older backup can be
 * imported (missing columns get their defaults) and a newer one is refused. Comes from the
 * generated journal, so it updates itself after `npm run db:generate`.
 */
export const SCHEMA_VERSION: number = journal.entries.length;
