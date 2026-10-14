import { View } from 'react-native';

import type { Domain } from '@/db/schema';
import { domainColors } from '@/theme/domain-colors';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { Chip } from './chip';
import { DomainIcon } from './domain-icon';

type Props = {
  domains: Domain[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

/** One chip per life domain (icon + name + color), for pickers in the task editor and Capture sheet. */
export function DomainChips({ domains, selectedId, onSelect }: Props) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      {domains.map((d) => {
        const c = domainColors(t, d.color);
        return (
          <Chip
            key={d.id}
            label={d.name}
            selected={selectedId === d.id}
            accent={c.main}
            tint={c.soft}
            icon={<DomainIcon name={d.icon} color={c.main} />}
            onPress={() => onSelect(d.id)}
          />
        );
      })}
    </View>
  );
}
