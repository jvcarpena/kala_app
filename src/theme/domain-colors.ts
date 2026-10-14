import type { DomainColors, DomainKey, Theme } from './tokens';

/** '#RRGGBB' + alpha 0..1 → 'rgba(r, g, b, a)'. */
export function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const HEX = /^#[0-9a-f]{6}$/i;

/**
 * A domain's `color` is either a built-in key ('work', 'study', ...) or a custom #hex.
 * Unknown values fall back to a neutral so a bad row can never crash a screen.
 */
export function domainColors(theme: Theme, color: string): DomainColors {
  if (color in theme.domains) return theme.domains[color as DomainKey];
  if (HEX.test(color)) return { main: color, soft: withAlpha(color, 0.14) };
  return { main: theme.colors.inkMuted, soft: theme.colors.surfaceSunk };
}
