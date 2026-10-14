import type { Domain } from '@/db/schema';

/**
 * Focus Mode presets hide whole domains so the screen only shows what fits the moment.
 * They name the built-in domain keys to hide ('work' | 'study' | 'health' | 'life').
 */
export type FocusPreset = { name: string; description: string; hide: string[] };

export const FOCUS_PRESETS: FocusPreset[] = [
  { name: 'Gym time', description: 'Hides Work and Study', hide: ['work', 'study'] },
  { name: 'Study block', description: 'Hides Work and Life', hide: ['work', 'life'] },
  { name: 'Weekend', description: 'Hides Work', hide: ['work'] },
];

/** Domain ids to hide for a preset. Custom domains are never hidden by a preset. */
export function hiddenIdsForPreset(preset: FocusPreset, domains: Domain[]): string[] {
  return domains.filter((d) => preset.hide.includes(d.color)).map((d) => d.id);
}
