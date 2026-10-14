// Design tokens from design-system/kala/MASTER.md. Components use these via
// useTheme(); never raw hex.

export type DomainKey = 'work' | 'study' | 'health' | 'life';

export type DomainColors = { main: string; soft: string };

export type Theme = {
  scheme: 'light' | 'dark';
  colors: {
    bg: string;
    surface: string;
    surfaceSunk: string;
    ink: string;
    inkMuted: string;
    line: string;
    onInk: string;
    streak: string;
    danger: string;
  };
  domains: Record<DomainKey, DomainColors>;
  /** Extra colors users can pick for custom domains. */
  custom: string[];
  mascot: {
    fur: string;
    furShade: string;
    fluff: string;
    nose: string;
    blush: string;
    eye: string;
  };
};

export const lightTheme: Theme = {
  scheme: 'light',
  colors: {
    bg: '#EDF0F3',
    surface: '#FFFFFF',
    surfaceSunk: '#E2E7EC',
    ink: '#16202B',
    inkMuted: '#566271',
    line: '#D3DAE1',
    onInk: '#FFFFFF',
    streak: '#B7791F',
    danger: '#C2362B',
  },
  domains: {
    work: { main: '#2F5BD9', soft: '#E3EAFC' },
    study: { main: '#7A45CF', soft: '#EEE6FA' },
    health: { main: '#0E8A63', soft: '#DDF3EA' },
    life: { main: '#D2512B', soft: '#FBE6DE' },
  },
  custom: ['#0E7C99', '#B0367A', '#8A6A00', '#4F5D6B'],
  mascot: {
    fur: '#97A3AF',
    furShade: '#7F8C99',
    fluff: '#EEF1F4',
    nose: '#26303B',
    blush: '#F0A69C',
    eye: '#1B242E',
  },
};

export const darkTheme: Theme = {
  scheme: 'dark',
  colors: {
    bg: '#0E141B',
    surface: '#17202A',
    surfaceSunk: '#0A0F15',
    ink: '#E7ECF2',
    inkMuted: '#9AA6B4',
    line: '#2A3644',
    onInk: '#0E141B',
    streak: '#F2B84B',
    danger: '#FF7A6E',
  },
  domains: {
    work: { main: '#7C9BFF', soft: '#1C2847' },
    study: { main: '#B793F5', soft: '#2A1F42' },
    health: { main: '#43D19E', soft: '#133528' },
    life: { main: '#FF8A63', soft: '#3A2018' },
  },
  custom: ['#4FC3DC', '#E27AB4', '#D6B13A', '#9AA6B4'],
  mascot: {
    fur: '#A3AEBA',
    furShade: '#8592A0',
    fluff: '#E4E9EE',
    nose: '#1A222B',
    blush: '#E79388',
    eye: '#121920',
  },
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, huge: 48 } as const;

export const radius = {
  sheet: 28,
  card: 16,
  control: 12,
  checkbox: 8,
  pill: 999,
} as const;

/** Minimum touch target (dp). */
export const hit = 48;

export const fonts = {
  displayBold: 'BricolageGrotesque_700Bold',
  display: 'BricolageGrotesque_600SemiBold',
  body: 'AtkinsonHyperlegibleNext_400Regular',
  label: 'AtkinsonHyperlegibleNext_500Medium',
  bold: 'AtkinsonHyperlegibleNext_700Bold',
} as const;

export type TextStyleName = 'timer' | 'display' | 'title' | 'headline' | 'body' | 'label' | 'caption';

export const type: Record<
  TextStyleName,
  { fontFamily: string; fontSize: number; lineHeight: number; tabular?: boolean }
> = {
  timer: { fontFamily: fonts.display, fontSize: 64, lineHeight: 68, tabular: true },
  display: { fontFamily: fonts.displayBold, fontSize: 32, lineHeight: 38 },
  title: { fontFamily: fonts.display, fontSize: 22, lineHeight: 28 },
  headline: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 24 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24 },
  label: { fontFamily: fonts.label, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
};
