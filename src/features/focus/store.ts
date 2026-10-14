import type { Db } from '@/db/client';
import type { Domain } from '@/db/schema';
import { setSetting } from '@/db/settings';

import { hiddenIdsForPreset, type FocusPreset } from './presets';

/** Turns Focus Mode on with a preset. */
export async function applyFocusPreset(db: Db, preset: FocusPreset, domains: Domain[]): Promise<void> {
  await setSetting(db, 'hiddenDomainIds', hiddenIdsForPreset(preset, domains));
  await setSetting(db, 'focusPreset', preset.name);
}

/** Hides exactly these domains. Named "Custom" so the header chip still reads sensibly. */
export async function setCustomFocus(db: Db, hiddenDomainIds: string[]): Promise<void> {
  await setSetting(db, 'hiddenDomainIds', hiddenDomainIds);
  await setSetting(db, 'focusPreset', hiddenDomainIds.length ? 'Custom' : null);
}

export async function turnOffFocusMode(db: Db): Promise<void> {
  await setSetting(db, 'hiddenDomainIds', []);
  await setSetting(db, 'focusPreset', null);
}
