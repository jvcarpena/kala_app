import type { Domain, Habit, Task } from '@/db/schema';

export const NAME_MAX = 24;

/** Swatches in the editor: the four built-in domain colors, then the four custom ones. */
export const COLOR_OPTIONS = ['work', 'study', 'health', 'life', 'custom1', 'custom2', 'custom3', 'custom4'] as const;

/** Icons in the picker. Each name must exist in `DomainIcon`. */
export const ICON_NAMES = [
  'Briefcase',
  'BookOpen',
  'Barbell',
  'House',
  'Heart',
  'Palette',
  'MusicNotes',
  'Code',
  'GraduationCap',
  'Wallet',
  'Users',
  'ShoppingCart',
  'Airplane',
  'Leaf',
  'PawPrint',
  'Tag',
] as const;

/** Spoken and written names for the swatches (the check mark, not color, shows which is selected). */
export const COLOR_LABEL: Record<(typeof COLOR_OPTIONS)[number], string> = {
  work: 'Blue',
  study: 'Purple',
  health: 'Green',
  life: 'Orange',
  custom1: 'Teal',
  custom2: 'Magenta',
  custom3: 'Gold',
  custom4: 'Slate',
};

/** The first swatch no active domain uses, so a new domain starts out distinct. */
export function suggestColor(domains: Pick<Domain, 'color' | 'archived'>[]): (typeof COLOR_OPTIONS)[number] {
  const used = new Set(domains.filter((d) => !d.archived).map((d) => d.color));
  return COLOR_OPTIONS.find((c) => !used.has(c)) ?? 'custom1';
}

export type NameCheck = { ok: true; name: string } | { ok: false; error: string };

/**
 * Trims a domain name and checks it: 1 to NAME_MAX characters, unique among active domains
 * (ignoring case). `selfId` lets a domain keep its own name while being edited.
 */
export function validateDomainName(raw: string, domains: Pick<Domain, 'id' | 'name' | 'archived'>[], selfId?: string): NameCheck {
  const name = raw.trim().replace(/\s+/g, ' ');
  if (!name) return { ok: false, error: 'Give this domain a name.' };
  if (name.length > NAME_MAX) return { ok: false, error: `Keep it to ${NAME_MAX} characters or fewer.` };
  const clash = domains.some((d) => !d.archived && d.id !== selfId && d.name.toLowerCase() === name.toLowerCase());
  if (clash) return { ok: false, error: 'You already have a domain with this name.' };
  return { ok: true, name };
}

/** The last active domain can't be archived: tasks and habits always need somewhere to live. */
export function canArchive(domains: Pick<Domain, 'id' | 'archived'>[], id: string): boolean {
  const active = domains.filter((d) => !d.archived);
  return active.length > 1 && active.some((d) => d.id === id);
}

export type DomainUsage = { openTasks: number; habits: number };

/** What archiving a domain will hide: its open tasks and its active habits. */
export function domainUsage(
  domainId: string,
  tasks: Pick<Task, 'domainId' | 'status'>[],
  habits: Pick<Habit, 'domainId' | 'archived'>[],
): DomainUsage {
  return {
    openTasks: tasks.filter((t) => t.domainId === domainId && t.status === 'todo').length,
    habits: habits.filter((h) => h.domainId === domainId && !h.archived).length,
  };
}

/** "3 open tasks and 1 habit will be hidden…", or null when nothing is attached. */
export function archiveWarning(usage: DomainUsage): string | null {
  const parts: string[] = [];
  if (usage.openTasks > 0) parts.push(`${usage.openTasks} open ${usage.openTasks === 1 ? 'task' : 'tasks'}`);
  if (usage.habits > 0) parts.push(`${usage.habits} ${usage.habits === 1 ? 'habit' : 'habits'}`);
  if (parts.length === 0) return null;
  return `${parts.join(' and ')} will be hidden. They come back if you restore this domain.`;
}

/** Active domains in display order. */
export function activeDomains<T extends Pick<Domain, 'archived' | 'sortOrder'>>(domains: T[]): T[] {
  return domains.filter((d) => !d.archived).sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Which domain a new workout counts under: the remembered one while it is still active, otherwise
 * the first active domain with the Health color, otherwise the first active domain.
 */
export function resolveWorkoutDomainId(
  domains: Pick<Domain, 'id' | 'color' | 'archived'>[],
  savedId: string | null,
): string | null {
  const active = domains.filter((d) => !d.archived);
  if (savedId && active.some((d) => d.id === savedId)) return savedId;
  return (active.find((d) => d.color === 'health') ?? active[0])?.id ?? null;
}

/** Every domain id that should be treated as hidden: Focus Mode's, plus archived ones. */
export function effectiveHiddenIds(focusHidden: string[], domains: Pick<Domain, 'id' | 'archived'>[]): string[] {
  const ids = new Set(focusHidden);
  for (const d of domains) if (d.archived) ids.add(d.id);
  return [...ids];
}
