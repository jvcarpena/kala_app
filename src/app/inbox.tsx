import { useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Kala } from '@/components/kala/kala';
import { Text } from '@/components/text';
import { db } from '@/db/client';
import { useInboxNotes, useSettings } from '@/db/hooks';
import { archiveNote } from '@/db/repos/notes';
import { inboxEmpty, inboxLine } from '@/features/companion/copy';
import { noteToTaskDraft } from '@/features/notes/logic';
import { daysAgoLabel } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

/** Unprocessed quick notes. Each one becomes a task (prefilled editor) or is archived. */
export default function InboxScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const notes = useInboxNotes();
  const settings = useSettings();
  const voice = { language: settings.language, mode: settings.companion };
  const empty = inboxEmpty(voice);

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: insets.top + spacing.sm,
          paddingHorizontal: spacing.sm,
        }}>
        <View style={{ minWidth: 64 }} />
        <Text variant="headline" accessibilityRole="header">
          Inbox
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Done"
          onPress={() => router.back()}
          style={{ minHeight: 48, minWidth: 64, justifyContent: 'center', alignItems: 'flex-end', paddingHorizontal: spacing.sm }}>
          <Text variant="headline">Done</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.lg, gap: spacing.md }}>
        {notes.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: spacing.xl, gap: spacing.sm }}>
            {settings.companion === 'off' ? null : <Kala pose="chill" size={170} />}
            <Text variant="title" style={{ textAlign: 'center' }}>
              {empty.title}
            </Text>
            <Text muted style={{ textAlign: 'center', maxWidth: 300 }}>
              {empty.body}
            </Text>
          </View>
        ) : (
          <>
            <Text variant="caption" muted accessibilityLiveRegion="polite">
              {inboxLine(notes.length)}
            </Text>
            {notes.map((n) => (
              <Card key={n.id} style={{ padding: spacing.lg, gap: spacing.md }}>
                <View style={{ gap: 4 }}>
                  <Text>{n.body}</Text>
                  <Text variant="caption" muted>{`Captured ${daysAgoLabel(n.createdAt)}`}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <Button
                    grow
                    label="Turn into task"
                    onPress={() => {
                      const draft = noteToTaskDraft(n.body);
                      router.push({
                        pathname: '/task/[id]',
                        params: { id: 'new', fromNote: n.id, title: draft.title, notes: draft.notes },
                      });
                    }}
                  />
                  <Button
                    variant="secondary"
                    label="Archive"
                    onPress={() => {
                      haptic('warning');
                      archiveNote(db, n.id);
                    }}
                  />
                </View>
              </Card>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}
