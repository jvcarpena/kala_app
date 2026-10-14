import { Barbell, BookOpen, Briefcase, House, Tag, type Icon } from 'phosphor-react-native';

// Domains store their icon as a Phosphor name. Add more here as custom domains get an icon picker.
const ICONS: Record<string, Icon> = { Briefcase, BookOpen, Barbell, House, Tag };

type Props = { name: string; size?: number; color: string };

/** Decorative: the domain name is always shown in text next to it. */
export function DomainIcon({ name, size = 16, color }: Props) {
  const Glyph = ICONS[name] ?? Tag;
  return <Glyph size={size} color={color} weight="regular" />;
}
