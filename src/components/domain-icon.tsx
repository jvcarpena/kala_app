import {
  Airplane,
  Barbell,
  BookOpen,
  Briefcase,
  Code,
  GraduationCap,
  Heart,
  House,
  Leaf,
  MusicNotes,
  Palette,
  PawPrint,
  ShoppingCart,
  Tag,
  Users,
  Wallet,
  type Icon,
} from 'phosphor-react-native';

import type { ICON_NAMES } from '@/features/domains/logic';

// Domains store their icon as a Phosphor name. The record is typed against ICON_NAMES, so adding
// a name to the picker without drawing it here is a compile error.
const ICONS: Record<(typeof ICON_NAMES)[number], Icon> = {
  Briefcase,
  BookOpen,
  Barbell,
  House,
  Heart,
  Palette,
  MusicNotes,
  Code,
  GraduationCap,
  Wallet,
  Users,
  ShoppingCart,
  Airplane,
  Leaf,
  PawPrint,
  Tag,
};

type Props = { name: string; size?: number; color: string };

/** Decorative: the domain name is always shown in text next to it. */
export function DomainIcon({ name, size = 16, color }: Props) {
  const Glyph = (ICONS as Record<string, Icon | undefined>)[name] ?? Tag;
  return <Glyph size={size} color={color} weight="regular" />;
}
