import { asc, eq, sql } from 'drizzle-orm';

import { canArchive } from '@/features/domains/logic';

import type { Db } from '../client';
import { newId } from '../ids';
import { domains } from '../schema';

export type DomainInput = { name: string; color: string; icon: string };

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

/** Active domains in display order. `createdAt` has one-second resolution, so `rowid` breaks ties. */
const activeInOrder = (tx: Tx) =>
  tx
    .select()
    .from(domains)
    .where(eq(domains.archived, false))
    .orderBy(asc(domains.sortOrder), asc(sql`${domains}.rowid`))
    .all();

/** Adds a domain at the end of the list. Name validation is the caller's job (`validateDomainName`). */
export async function createDomain(db: Db, input: DomainInput): Promise<string> {
  const id = newId();
  const all = await db.select({ sortOrder: domains.sortOrder }).from(domains);
  const next = all.reduce((max, d) => Math.max(max, d.sortOrder), -1) + 1;
  await db.insert(domains).values({
    id,
    name: input.name.trim(),
    color: input.color,
    icon: input.icon,
    sortOrder: next,
    isDefault: false,
  });
  return id;
}

export async function updateDomain(db: Db, id: string, input: DomainInput): Promise<void> {
  await db
    .update(domains)
    .set({ name: input.name.trim(), color: input.color, icon: input.icon })
    .where(eq(domains.id, id));
}

/**
 * Moves an active domain one place up or down, past the nearest *active* neighbour (archived
 * ones are skipped). Renumbers the active domains 0..n-1 so gaps and ties can't pile up.
 * Does nothing at either end.
 */
export function moveDomain(db: Db, id: string, direction: 'up' | 'down'): void {
  db.transaction((tx) => {
    const list = activeInOrder(tx);
    const from = list.findIndex((d) => d.id === id);
    const to = direction === 'up' ? from - 1 : from + 1;
    if (from < 0 || to < 0 || to >= list.length) return;
    [list[from], list[to]] = [list[to], list[from]];
    list.forEach((d, i) => {
      if (d.sortOrder !== i) tx.update(domains).set({ sortOrder: i }).where(eq(domains.id, d.id)).run();
    });
  });
}

/**
 * Archives a domain: it leaves every picker and list, its tasks, habits and history stay.
 * Throws if it is the last active domain.
 */
export function archiveDomain(db: Db, id: string): void {
  db.transaction((tx) => {
    const all = tx.select().from(domains).all();
    if (!canArchive(all, id)) throw new Error('Keep at least one active domain.');
    tx.update(domains).set({ archived: true }).where(eq(domains.id, id)).run();
  });
}

/** Brings an archived domain back, at the end of the list. */
export function restoreDomain(db: Db, id: string): void {
  db.transaction((tx) => {
    const all = tx.select().from(domains).all();
    const next = all.reduce((max, d) => Math.max(max, d.sortOrder), -1) + 1;
    tx.update(domains).set({ archived: false, sortOrder: next }).where(eq(domains.id, id)).run();
  });
}
