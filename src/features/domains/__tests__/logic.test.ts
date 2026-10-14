import { COLOR_LABEL, suggestColor, ICON_NAMES, resolveWorkoutDomainId, archiveWarning, canArchive, activeDomains, domainUsage, effectiveHiddenIds, validateDomainName, NAME_MAX, COLOR_OPTIONS } from '../logic';

const d = (id: string, name: string, archived = false, sortOrder = 0) => ({ id, name, archived, sortOrder });

describe('validateDomainName', () => {
  const list = [d('a', 'Work'), d('b', 'Study'), d('c', 'Old hobby', true)];

  it('trims and collapses spaces', () => {
    expect(validateDomainName('  Side   project ', list)).toEqual({ ok: true, name: 'Side project' });
  });

  it('rejects an empty or blank name', () => {
    expect(validateDomainName('', list).ok).toBe(false);
    expect(validateDomainName('   ', list).ok).toBe(false);
  });

  it('rejects a name over the limit, but accepts exactly the limit', () => {
    expect(validateDomainName('x'.repeat(NAME_MAX + 1), list).ok).toBe(false);
    expect(validateDomainName('x'.repeat(NAME_MAX), list).ok).toBe(true);
  });

  it('rejects a duplicate of an active domain, ignoring case', () => {
    const r = validateDomainName('work', list);
    expect(r).toEqual({ ok: false, error: 'You already have a domain with this name.' });
  });

  it('lets a domain keep its own name', () => {
    expect(validateDomainName('Work', list, 'a').ok).toBe(true);
  });

  it('allows the name of an archived domain', () => {
    expect(validateDomainName('Old hobby', list).ok).toBe(true);
  });
});

describe('canArchive', () => {
  it('allows archiving when another active domain remains', () => {
    expect(canArchive([d('a', 'A'), d('b', 'B')], 'a')).toBe(true);
  });

  it('refuses the last active domain, even if archived ones exist', () => {
    expect(canArchive([d('a', 'A'), d('b', 'B', true)], 'a')).toBe(false);
  });

  it('refuses an id that is not an active domain', () => {
    expect(canArchive([d('a', 'A'), d('b', 'B')], 'zzz')).toBe(false);
    expect(canArchive([d('a', 'A'), d('b', 'B', true), d('c', 'C')], 'b')).toBe(false);
  });
});

describe('domainUsage and archiveWarning', () => {
  const tasks = [
    { domainId: 'a', status: 'todo' as const },
    { domainId: 'a', status: 'todo' as const },
    { domainId: 'a', status: 'done' as const },
    { domainId: 'a', status: 'archived' as const },
    { domainId: 'b', status: 'todo' as const },
  ];
  const habits = [
    { domainId: 'a', archived: false },
    { domainId: 'a', archived: true },
    { domainId: 'b', archived: false },
  ];

  it('counts only open tasks and active habits in that domain', () => {
    expect(domainUsage('a', tasks, habits)).toEqual({ openTasks: 2, habits: 1 });
    expect(domainUsage('zzz', tasks, habits)).toEqual({ openTasks: 0, habits: 0 });
  });

  it('words the warning with the right plurals', () => {
    expect(archiveWarning({ openTasks: 3, habits: 1 })).toBe(
      '3 open tasks and 1 habit will be hidden. They come back if you restore this domain.',
    );
    expect(archiveWarning({ openTasks: 1, habits: 0 })).toBe(
      '1 open task will be hidden. They come back if you restore this domain.',
    );
    expect(archiveWarning({ openTasks: 0, habits: 2 })).toContain('2 habits will be hidden.');
  });

  it('has no warning when nothing is attached', () => {
    expect(archiveWarning({ openTasks: 0, habits: 0 })).toBeNull();
  });
});

describe('activeDomains', () => {
  it('drops archived ones and sorts by sortOrder', () => {
    const out = activeDomains([d('c', 'C', false, 2), d('x', 'X', true, 0), d('a', 'A', false, 0), d('b', 'B', false, 1)]);
    expect(out.map((x) => x.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('effectiveHiddenIds', () => {
  it('merges Focus Mode ids with archived ones, without duplicates', () => {
    const ids = effectiveHiddenIds(['a', 'b'], [d('b', 'B', true), d('c', 'C', true), d('a', 'A')]);
    expect([...ids].sort()).toEqual(['a', 'b', 'c']);
  });

  it('is empty when nothing is hidden or archived', () => {
    expect(effectiveHiddenIds([], [d('a', 'A')])).toEqual([]);
  });
});

describe('option lists', () => {
  it('has unique icons and swatches', () => {
    expect(new Set(ICON_NAMES).size).toBe(ICON_NAMES.length);
    expect(new Set(COLOR_OPTIONS).size).toBe(COLOR_OPTIONS.length);
    expect(COLOR_OPTIONS).toHaveLength(8);
  });
});

describe('resolveWorkoutDomainId', () => {
  const dom = (id: string, color: string, archived = false) => ({ id, color, archived });
  const list = [dom('w', 'work'), dom('h', 'health'), dom('l', 'life')];

  it('keeps the remembered domain while it is active, even if recolored', () => {
    const recolored = [dom('w', 'work'), dom('h', 'custom1'), dom('l', 'health')];
    expect(resolveWorkoutDomainId(recolored, 'h')).toBe('h');
  });

  it('falls back to the Health color when nothing is remembered', () => {
    expect(resolveWorkoutDomainId(list, null)).toBe('h');
  });

  it('falls back to the first active domain when the remembered one is archived or unknown', () => {
    const archived = [dom('w', 'work'), dom('h', 'health', true), dom('l', 'life')];
    expect(resolveWorkoutDomainId(archived, 'h')).toBe('w');
    expect(resolveWorkoutDomainId(list, 'ghost')).toBe('h');
  });

  it('is null when there are no active domains', () => {
    expect(resolveWorkoutDomainId([dom('a', 'work', true)], null)).toBeNull();
  });
});

describe('suggestColor', () => {
  const c = (color: string, archived = false) => ({ color, archived });

  it('starts with the first swatch no active domain uses', () => {
    expect(suggestColor([c('work'), c('study'), c('health'), c('life')])).toBe('custom1');
    expect(suggestColor([c('work'), c('study'), c('health'), c('life'), c('custom1')])).toBe('custom2');
  });

  it('reuses the color of an archived domain', () => {
    expect(suggestColor([c('work'), c('study', true)])).toBe('study');
  });

  it('falls back to custom1 when every swatch is taken', () => {
    expect(suggestColor(COLOR_OPTIONS.map((o) => c(o)))).toBe('custom1');
  });

  it('has a label for every swatch', () => {
    expect(COLOR_OPTIONS.every((o) => COLOR_LABEL[o].length > 0)).toBe(true);
  });
});
