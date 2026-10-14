import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { DomainChips } from '@/components/domain-chips';
import { EnergySegment } from '@/components/energy';
import { HabitRow } from '@/components/habit-row';
import { Segmented } from '@/components/segmented';
import { Text } from '@/components/text';
import { TextField } from '@/components/text-field';
import { db } from '@/db/client';
import { useDomains, useHabitLogs, useHabits, useSettings } from '@/db/hooks';
import { createNote } from '@/db/repos/notes';
import { createTask } from '@/db/repos/tasks';
import type { Task } from '@/db/schema';
import { isScheduled, parseSchedule } from '@/features/habits/logic';
import { canSaveCapture, isDraftDirty, type CaptureSegment } from '@/features/notes/logic';
import { dueChoices } from '@/features/tasks/logic';
import { dueLabel } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import { useToday } from '@/lib/use-today';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const SEGMENTS: { value: CaptureSegment; label: string }[] = [
  { value: 'note', label: 'Note' },
  { value: 'task', label: 'Task' },
  { value: 'log', label: 'Log' },
];

/**
 * The Capture sheet (spec 7.7), opened by the + button on Today, Tasks and Insights.
 * Note first with the keyboard up; Task saves inline; Log ticks today's habits.
 */
export default function CaptureSheet() {
  const t = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const today = useToday();
  const domains = useDomains();
  const habits = useHabits();
  const habitLogs = useHabitLogs();
  const { hiddenDomainIds } = useSettings();
  const params = useLocalSearchParams<{ dueDate?: string; domainId?: string }>();

  const [segment, setSegment] = useState<CaptureSegment>('note');
  const [note, setNote] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [domainId, setDomainId] = useState<string | null>(params.domainId ?? null);
  const [energy, setEnergy] = useState<Task['energy']>('medium');
  const [dueDate, setDueDate] = useState<string | null>(params.dueDate ?? null);
  const [saving, setSaving] = useState(false);
  // Set just before a deliberate close (saved, or discard confirmed) so the draft guard steps aside.
  const leaving = useRef(false);

  const defaultDomainId = (domains.find((d) => !hiddenDomainIds.includes(d.id)) ?? domains[0])?.id ?? null;
  const activeDomainId = domainId ?? defaultDomainId;
  const draft = { note, taskTitle };
  const canSave = canSaveCapture(segment, draft, activeDomainId !== null) && !saving;

  const dueOptions = useMemo(() => dueChoices(today, dueDate, (k) => dueLabel(k, today)), [today, dueDate]);
  const domainById = useMemo(() => new Map(domains.map((d) => [d.id, d])), [domains]);
  const habitsToday = useMemo(
    () => habits.filter((h) => !hiddenDomainIds.includes(h.domainId) && isScheduled(parseSchedule(h.schedule), today)),
    [habits, hiddenDomainIds, today],
  );

  // Every way out (Cancel, back button, swipe down, backdrop) ends in a 'beforeRemove' event.
  const dirty = isDraftDirty(draft);
  useEffect(() => {
    if (!dirty) return;
    return navigation.addListener('beforeRemove', (e) => {
      if (leaving.current) return;
      e.preventDefault();
      Alert.alert('Discard this?', 'What you typed will be lost.', [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
      ]);
    });
  }, [dirty, navigation]);

  const close = () => {
    Keyboard.dismiss();
    router.back();
  };

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      if (segment === 'note') await createNote(db, note);
      else if (activeDomainId) {
        await createTask(db, { title: taskTitle, domainId: activeDomainId, energy, dueDate });
      }
      haptic('success');
      leaving.current = true;
      // Closing with the keyboard up left the window short of its full height on Android.
      Keyboard.dismiss();
      router.back();
    } catch {
      setSaving(false);
      Alert.alert("Couldn't save this", 'What you typed is still here. Try Save again.');
    }
  };

  const moreOptions = () => {
    leaving.current = true;
    router.replace({
      pathname: '/task/[id]',
      params: {
        id: 'new',
        title: taskTitle,
        energy,
        ...(activeDomainId ? { domainId: activeDomainId } : {}),
        ...(dueDate ? { dueDate } : {}),
      },
    });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Tapping the dimmed area closes the sheet (and asks first if there's a draft). */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close capture"
        onPress={close}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(22,32,43,0.4)' }}
      />
      <View
        style={{
          maxHeight: '88%',
          backgroundColor: t.colors.bg,
          borderTopLeftRadius: radius.sheet,
          borderTopRightRadius: radius.sheet,
          overflow: 'hidden',
        }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: spacing.md,
            paddingHorizontal: spacing.sm,
          }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            onPress={close}
            style={{ minHeight: 48, minWidth: 72, justifyContent: 'center', paddingHorizontal: spacing.sm }}>
            <Text variant="headline">Cancel</Text>
          </Pressable>
          <Text variant="headline" accessibilityRole="header">
            Capture
          </Text>
          <View style={{ minWidth: 72 }} />
        </View>

        <ScrollView
          style={{ flexGrow: 0 }}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl }}>
          <Segmented label="What to capture" value={segment} onChange={setSegment} options={SEGMENTS} />

          {segment === 'note' ? (
            <TextField
              label="Quick note"
              value={note}
              onChangeText={setNote}
              placeholder="Anything on your mind. Sort it out later."
              autoFocus
              multiline
            />
          ) : null}

          {segment === 'task' ? (
            <>
              <TextField
                label="What needs doing?"
                value={taskTitle}
                onChangeText={setTaskTitle}
                autoFocus
                returnKeyType="done"
                maxLength={200}
              />
              <View style={{ gap: spacing.sm }}>
                <Text variant="label">Life domain</Text>
                <DomainChips domains={domains} selectedId={activeDomainId} onSelect={setDomainId} />
              </View>
              <View style={{ gap: spacing.sm }}>
                <Text variant="label">Energy needed</Text>
                <EnergySegment
                  label="Energy needed"
                  value={energy}
                  onChange={setEnergy}
                  options={['low', 'medium', 'high'] as Task['energy'][]}
                />
              </View>
              <View style={{ gap: spacing.sm }}>
                <Text variant="label">Due</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                  {dueOptions.map((o) => (
                    <Chip key={o.label} label={o.label} selected={dueDate === o.value} onPress={() => setDueDate(o.value)} />
                  ))}
                </View>
              </View>
              <Button variant="secondary" label="More options" onPress={moreOptions} />
            </>
          ) : null}

          {segment === 'log' ? (
            habitsToday.length > 0 ? (
              <View style={{ gap: spacing.sm }}>
                <Text variant="headline" accessibilityRole="header">
                  Habits today
                </Text>
                <Text variant="caption" muted>
                  Taps save right away.
                </Text>
                {habitsToday.map((h) => (
                  <HabitRow key={h.id} habit={h} domain={domainById.get(h.domainId)} logs={habitLogs.get(h.id)} today={today} />
                ))}
              </View>
            ) : (
              <Text muted>No habits scheduled today. Add one from the Habits tab.</Text>
            )
          ) : null}
        </ScrollView>

        <View
          style={{
            padding: spacing.lg,
            paddingBottom: Math.max(insets.bottom, spacing.lg),
            backgroundColor: t.colors.surface,
            borderTopWidth: 1,
            borderTopColor: t.colors.line,
          }}>
          {segment === 'log' ? (
            <Button label="Done" onPress={close} />
          ) : (
            <Button label={segment === 'note' ? 'Save note' : 'Add task'} onPress={save} disabled={!canSave} />
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
