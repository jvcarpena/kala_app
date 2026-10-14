import type { ReactNode } from 'react';
import Svg, { Circle, Ellipse, G, Path, Rect, Text as SvgText } from 'react-native-svg';

import type { DomainKey } from '@/theme/tokens';
import { fonts } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { POSES, type KalaPose } from './poses';

type Props = {
  pose?: KalaPose;
  size?: number;
  /** Domain whose color the props (headband, book, barbell) take. */
  domain?: DomainKey;
};

/**
 * Kala the koala. One rig, many poses (see poses.ts and
 * design-system/kala/mascot.html). Decorative: hidden from screen readers.
 * Anything Kala "says" is real text rendered next to it.
 */
export function Kala({ pose = 'hello', size = 96, domain }: Props) {
  const t = useTheme();
  const m = t.mascot;
  const { eyes, mouth, arms, prop, extra = [] } = POSES[pose];
  const d = (k: DomainKey) => t.domains[k].main;
  const headband = d(domain ?? 'work');
  const book = d(domain ?? 'study');
  const bar = d(domain ?? 'health');

  const els: ReactNode[] = [];
  const add = (key: string, node: ReactNode) => els.push(<G key={key}>{node}</G>);

  add('shadow', <Ellipse cx={100} cy={203} rx={52} ry={5} fill={t.colors.ink} opacity={0.08} />);

  // Arms behind the body.
  if (arms === 'rest' || arms === 'wave' || arms === 'head') {
    add('armL', <Ellipse cx={60} cy={150} rx={13} ry={22} rotation={18} origin="60, 150" fill={m.furShade} />);
  }
  if (arms === 'rest') {
    add('armR', <Ellipse cx={140} cy={150} rx={13} ry={22} rotation={-18} origin="140, 150" fill={m.furShade} />);
  }
  if (arms === 'wave') {
    add('armW', <Ellipse cx={156} cy={112} rx={12} ry={22} rotation={35} origin="156, 112" fill={m.furShade} />);
  }
  if (arms === 'up') {
    add('armUL', <Ellipse cx={44} cy={112} rx={12} ry={22} rotation={-35} origin="44, 112" fill={m.furShade} />);
    add('armUR', <Ellipse cx={156} cy={112} rx={12} ry={22} rotation={35} origin="156, 112" fill={m.furShade} />);
  }
  if (arms === 'head') {
    add('armH', <Ellipse cx={150} cy={134} rx={12} ry={24} rotation={-12} origin="150, 134" fill={m.furShade} />);
  }

  // Feet, body, belly.
  add('footL', <Ellipse cx={78} cy={194} rx={16} ry={9} fill={m.furShade} />);
  add('footR', <Ellipse cx={122} cy={194} rx={16} ry={9} fill={m.furShade} />);
  add('body', <Ellipse cx={100} cy={156} rx={48} ry={42} fill={m.fur} />);
  add('belly', <Ellipse cx={100} cy={164} rx={30} ry={28} fill={m.fluff} />);

  // Ears.
  for (const [x, y] of [
    [46, 54],
    [154, 54],
  ] as const) {
    add(
      `ear${x}`,
      <>
        <Circle cx={x} cy={y} r={30} fill={m.fur} />
        <Circle cx={x + (x < 100 ? 2 : -2)} cy={y + 2} r={19} fill={m.fluff} />
      </>,
    );
  }

  // Head.
  add('head', <Ellipse cx={100} cy={88} rx={58} ry={50} fill={m.fur} />);

  if (extra.includes('headband')) {
    add(
      'headband',
      <>
        <Path d="M44 74 Q100 54 156 74 L156 86 Q100 66 44 86 Z" fill={headband} />
        <Path d="M154 78 l18 -8 l-4 12 z M154 82 l16 8 l-12 4 z" fill={headband} />
      </>,
    );
  }

  // Cheeks.
  add('cheekL', <Ellipse cx={64} cy={106} rx={10} ry={6} fill={m.blush} opacity={0.7} />);
  add('cheekR', <Ellipse cx={136} cy={106} rx={10} ry={6} fill={m.blush} opacity={0.7} />);

  // Eyes.
  add('eyes', <Eyes kind={eyes} color={m.eye} />);
  if (extra.includes('glasses')) {
    add(
      'glasses',
      <G fill="none" stroke={t.colors.ink} strokeWidth={2.6}>
        <Circle cx={76} cy={88} r={13} />
        <Circle cx={124} cy={88} r={13} />
        <Path d="M89 86 Q100 81 111 86" />
      </G>,
    );
  }

  // The koala nose.
  add(
    'nose',
    <>
      <Path
        d="M100 82 C114 82 117 92 116 104 C115 116 108 121 100 121 C92 121 85 116 84 104 C83 92 86 82 100 82 Z"
        fill={m.nose}
      />
      <Ellipse cx={94} cy={92} rx={4} ry={6} fill="#fff" opacity={0.22} />
    </>,
  );

  add('mouth', <Mouth kind={mouth} color={m.eye} blush={m.blush} />);

  // Props held in front.
  if (prop === 'book') {
    add(
      'book',
      <G rotation={-6} origin="100, 162">
        <Rect x={70} y={140} width={60} height={42} rx={4} fill={book} />
        <Rect x={74} y={143} width={25} height={35} rx={2} fill="#fff" opacity={0.92} />
        <Rect x={101} y={143} width={25} height={35} rx={2} fill="#fff" opacity={0.92} />
        <Path
          d="M78 151h17M78 157h17M78 163h12M105 151h17M105 157h17M105 163h12"
          stroke={book}
          strokeWidth={2}
          opacity={0.5}
        />
      </G>,
    );
  }
  if (prop === 'barbell') {
    add(
      'barbell',
      <>
        <Rect x={34} y={148} width={132} height={6} rx={3} fill={t.colors.ink} opacity={0.75} />
        <Rect x={38} y={134} width={12} height={34} rx={4} fill={bar} />
        <Rect x={150} y={134} width={12} height={34} rx={4} fill={bar} />
        <Rect x={28} y={140} width={9} height={22} rx={3} fill={bar} />
        <Rect x={163} y={140} width={9} height={22} rx={3} fill={bar} />
      </>,
    );
  }
  if (prop === 'note') {
    add(
      'note',
      <G rotation={8} origin="112, 160">
        <Rect x={94} y={138} width={44} height={44} rx={5} fill={t.colors.surface} stroke={t.colors.line} strokeWidth={2} />
        <Path d="M101 158h30M101 166h18" stroke={t.colors.inkMuted} strokeWidth={2.4} strokeLinecap="round" />
        <Path d="M101 150h30" stroke={d('life')} strokeWidth={2.4} strokeLinecap="round" />
      </G>,
    );
  }
  if (prop === 'flame') {
    add(
      'flame',
      <>
        <Path
          d="M100 186c-14 0-24-9-24-21 0-13 11-20 14-34 8 5 11 12 12 20 3-2 6-6 7-10 8 7 15 15 15 25 0 12-10 20-24 20z"
          fill={t.colors.streak}
        />
        <Path
          d="M100 182c-6 0-10-4-10-9 0-6 5-9 7-15 4 3 6 7 6 11 2-1 3-3 4-5 3 3 4 6 4 9 0 5-5 9-11 9z"
          fill="#fff"
          opacity={0.45}
        />
      </>,
    );
  }
  if (prop === 'leaf') {
    add(
      'leaf',
      <>
        <Path d="M66 190 Q96 160 140 132" fill="none" stroke="#6E8F7F" strokeWidth={3.5} strokeLinecap="round" />
        {(
          [
            [80, 174, -30],
            [96, 160, -40],
            [112, 148, -35],
            [128, 138, -45],
            [88, 176, 40],
            [106, 162, 35],
            [122, 150, 40],
          ] as const
        ).map(([x, y, r]) => (
          <Ellipse key={`${x}-${y}`} cx={x} cy={y} rx={11} ry={5.5} rotation={r} origin={`${x}, ${y}`} fill="#8FB3A2" />
        ))}
      </>,
    );
  }
  if (prop === 'cup') {
    add(
      'cup',
      <>
        <Rect x={84} y={146} width={32} height={34} rx={7} fill={d('life')} />
        <Path d="M116 154 q12 0 12 9 q0 9 -12 9" fill="none" stroke={d('life')} strokeWidth={4} />
        <Path
          d="M92 138 q4 -6 0 -12 M102 138 q4 -6 0 -12"
          stroke={t.colors.inkMuted}
          strokeWidth={2.4}
          fill="none"
          strokeLinecap="round"
          opacity={0.6}
        />
      </>,
    );
  }

  // Front paws holding a prop; paw on cheek for "oops".
  if (prop && (arms === 'rest' || arms === 'wave')) {
    add('pawL', <Ellipse cx={74} cy={158} rx={11} ry={9} fill={m.furShade} />);
    if (arms === 'rest') add('pawR', <Ellipse cx={126} cy={158} rx={11} ry={9} fill={m.furShade} />);
  }
  if (arms === 'head') add('pawCheek', <Circle cx={148} cy={112} r={12} fill={m.furShade} />);

  // Effects.
  if (extra.includes('sweat')) add('sweat', <Path d="M166 72 q7 10 0 15 q-7 -5 0 -15z" fill="#8EC5E8" />);
  if (extra.includes('sparkle')) {
    const star = (x: number, y: number, s: number) =>
      `M${x} ${y - s} Q${x} ${y} ${x + s} ${y} Q${x} ${y} ${x} ${y + s} Q${x} ${y} ${x - s} ${y} Q${x} ${y} ${x} ${y - s}Z`;
    add('sparkle', <Path d={star(22, 70, 9) + star(180, 60, 7) + star(176, 150, 6)} fill={t.colors.streak} />);
  }
  if (extra.includes('zzz')) {
    add(
      'zzz',
      <>
        <SvgText x={150} y={34} fontSize={18} fontFamily={fonts.displayBold} fill={t.colors.inkMuted}>
          z
        </SvgText>
        <SvgText x={164} y={20} fontSize={24} fontFamily={fonts.displayBold} fill={t.colors.inkMuted}>
          z
        </SvgText>
        <SvgText x={182} y={8} fontSize={14} fontFamily={fonts.displayBold} fill={t.colors.inkMuted}>
          z
        </SvgText>
      </>,
    );
  }
  if (extra.includes('q')) {
    add(
      'q',
      <SvgText x={164} y={44} fontSize={30} fontFamily={fonts.displayBold} fill={d('life')}>
        ?
      </SvgText>,
    );
  }

  return (
    <Svg
      width={size}
      height={size * (216 / 212)}
      viewBox="-6 -6 212 216"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      {els}
    </Svg>
  );
}

function Eyes({ kind, color }: { kind: string; color: string }) {
  const one = (x: number) => {
    switch (kind) {
      case 'happy':
        return <Path d={`M${x - 7} 91 Q${x} 81 ${x + 7} 91`} fill="none" stroke={color} strokeWidth={3.6} strokeLinecap="round" />;
      case 'closed':
        return <Path d={`M${x - 7} 87 Q${x} 94 ${x + 7} 87`} fill="none" stroke={color} strokeWidth={3.4} strokeLinecap="round" />;
      case 'wide':
        return (
          <>
            <Circle cx={x} cy={87} r={8.5} fill="#fff" />
            <Circle cx={x} cy={88} r={4.6} fill={color} />
          </>
        );
      case 'focus':
        return (
          <>
            <Circle cx={x} cy={90} r={5} fill={color} />
            <Path
              d={`M${x - 8} ${x < 100 ? 80 : 83} L${x + 8} ${x < 100 ? 83 : 80}`}
              stroke={color}
              strokeWidth={3}
              strokeLinecap="round"
            />
          </>
        );
      case 'proud':
        return <Path d={`M${x - 7} 89 Q${x} 83 ${x + 7} 89`} fill="none" stroke={color} strokeWidth={3.4} strokeLinecap="round" />;
      default:
        return (
          <>
            <Circle cx={x} cy={88} r={5.5} fill={color} />
            <Circle cx={x + 1.8} cy={86} r={1.7} fill="#fff" />
          </>
        );
    }
  };
  return (
    <>
      {one(76)}
      {one(124)}
    </>
  );
}

function Mouth({ kind, color, blush }: { kind: string; color: string; blush: string }) {
  switch (kind) {
    case 'open':
      return (
        <>
          <Path d="M90 126 Q100 142 110 126 Z" fill={color} />
          <Path d="M95 132 Q100 137 105 132" fill={blush} />
        </>
      );
    case 'o':
      return <Ellipse cx={100} cy={131} rx={5} ry={6} fill={color} />;
    case 'flat':
      return <Path d="M94 129 L106 129" stroke={color} strokeWidth={3} strokeLinecap="round" />;
    case 'sleepy':
      return <Ellipse cx={100} cy={130} rx={3.5} ry={3} fill={color} />;
    default:
      return <Path d="M92 128 Q100 134 108 128" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" />;
  }
}
