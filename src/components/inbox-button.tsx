import { useRouter } from 'expo-router';
import { Tray } from 'phosphor-react-native';
import { Pressable, View } from 'react-native';

import { useInboxNotes } from '@/db/hooks';
import { fonts } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { Text } from './text';

/** Header icon for the note inbox, with a count badge while notes are waiting. */
export function InboxButton() {
  const t = useTheme();
  const router = useRouter();
  const count = useInboxNotes().length;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={count > 0 ? `Inbox, ${count} ${count === 1 ? 'note' : 'notes'} to sort` : 'Inbox, empty'}
      hitSlop={4}
      onPress={() => router.push('/inbox')}
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: t.colors.surface,
        borderWidth: 1,
        borderColor: t.colors.line,
      }}>
      <Tray size={22} color={t.colors.ink} weight={count > 0 ? 'fill' : 'regular'} />
      {count > 0 ? (
        <View
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
          style={{
            position: 'absolute',
            top: -4,
            right: -4,
            minWidth: 20,
            height: 20,
            paddingHorizontal: 5,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: t.colors.ink,
            borderWidth: 2,
            borderColor: t.colors.bg,
          }}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 12, lineHeight: 16, color: t.colors.onInk }}>
            {count > 99 ? '99+' : String(count)}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
