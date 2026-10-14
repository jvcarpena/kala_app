import { domainColors, withAlpha } from '../domain-colors';
import { lightTheme } from '../tokens';

describe('domainColors', () => {
  it('returns the built-in colors for a domain key', () => {
    expect(domainColors(lightTheme, 'health')).toEqual(lightTheme.domains.health);
  });

  it('derives a soft tint for a custom hex color', () => {
    const c = domainColors(lightTheme, '#0E7C99');
    expect(c.main).toBe('#0E7C99');
    expect(c.soft).toBe('rgba(14, 124, 153, 0.14)');
  });

  it('falls back to a neutral for unknown values instead of crashing', () => {
    expect(domainColors(lightTheme, 'nonsense').main).toBe(lightTheme.colors.inkMuted);
  });
});

it('withAlpha converts hex to rgba', () => {
  expect(withAlpha('#FFFFFF', 0.5)).toBe('rgba(255, 255, 255, 0.5)');
});
