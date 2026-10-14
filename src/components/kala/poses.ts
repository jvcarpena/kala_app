export type KalaPose =
  | 'hello'
  | 'yay'
  | 'oops'
  | 'focus'
  | 'study'
  | 'gym'
  | 'streak'
  | 'sleepy'
  | 'chill';

type Eyes = 'dot' | 'happy' | 'closed' | 'wide' | 'focus' | 'proud';
type Mouth = 'smile' | 'open' | 'o' | 'flat' | 'sleepy';
type Arms = 'rest' | 'wave' | 'up' | 'head';
type Prop = 'book' | 'barbell' | 'note' | 'flame' | 'leaf' | 'cup';
type Extra = 'headband' | 'glasses' | 'sweat' | 'sparkle' | 'zzz' | 'q';

export type PoseSpec = { eyes: Eyes; mouth: Mouth; arms: Arms; prop?: Prop; extra?: Extra[] };

export const POSES: Record<KalaPose, PoseSpec> = {
  hello: { eyes: 'dot', mouth: 'smile', arms: 'wave' },
  yay: { eyes: 'happy', mouth: 'open', arms: 'up', extra: ['sparkle'] },
  oops: { eyes: 'wide', mouth: 'o', arms: 'head', prop: 'note', extra: ['sweat', 'q'] },
  focus: { eyes: 'focus', mouth: 'flat', arms: 'rest', extra: ['headband'] },
  study: { eyes: 'dot', mouth: 'smile', arms: 'rest', prop: 'book', extra: ['glasses'] },
  gym: { eyes: 'focus', mouth: 'open', arms: 'rest', prop: 'barbell', extra: ['sweat'] },
  streak: { eyes: 'proud', mouth: 'smile', arms: 'rest', prop: 'flame' },
  sleepy: { eyes: 'closed', mouth: 'sleepy', arms: 'rest', prop: 'cup', extra: ['zzz'] },
  chill: { eyes: 'closed', mouth: 'smile', arms: 'rest', prop: 'leaf' },
};
