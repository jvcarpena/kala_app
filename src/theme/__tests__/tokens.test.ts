import { DEFAULT_DOMAINS } from '@/db/seed';

import { contrast } from '../contrast';
import { darkTheme, lightTheme, type DomainKey } from '../tokens';

const themes = [lightTheme, darkTheme];
const domainKeys: DomainKey[] = ['work', 'study', 'health', 'life'];

describe.each(themes)('$scheme theme', (t) => {
  it('keeps body and muted text at 4.5:1 on bg and surface', () => {
    for (const text of [t.colors.ink, t.colors.inkMuted]) {
      for (const bg of [t.colors.bg, t.colors.surface]) {
        expect(contrast(text, bg)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('keeps primary button text readable', () => {
    expect(contrast(t.colors.onInk, t.colors.ink)).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps domain colors visible (3:1) on cards and on their soft tint', () => {
    for (const k of domainKeys) {
      expect(contrast(t.domains[k].main, t.colors.surface)).toBeGreaterThanOrEqual(3);
      expect(contrast(t.domains[k].main, t.domains[k].soft)).toBeGreaterThanOrEqual(3);
    }
  });

  it('keeps the streak color readable as text on surface', () => {
    expect(contrast(t.colors.streak, t.colors.surface)).toBeGreaterThanOrEqual(3);
  });

  it('keeps danger text at 4.5:1 on surface', () => {
    expect(contrast(t.colors.danger, t.colors.surface)).toBeGreaterThanOrEqual(4.5);
  });
});

it('seeds one default domain per themed domain key', () => {
  expect(DEFAULT_DOMAINS.map((d) => d.color).sort()).toEqual([...domainKeys].sort());
});
