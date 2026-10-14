import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { DomainChips } from '@/components/domain-chips';
import { EnergySegment } from '@/components/energy';
import { Text } from '@/components/text';
import { TextField } from '@/components/text-field';
import { db } from '@/db/client';
import { useDomains, useHiddenDomainIds } from '@/db/hooks';
import { convertNoteToTask } from '@/db/repos/notes';
import { archiveTask, createTask, getTask, updateTask } from '@/db/repos/tasks';
import type { Task } from '@/db/schema';
import { dueChoices } from '@/features/tasks/logic';
import { dueLabel } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import { useToday } from '@/lib/use-today';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const ESTIMATES: (number | null)[] = [null, 10, 25, 50, 90];

export default function TaskEditor() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const today = useToday();
  const domains = useDomains();
  const hiddenDomainIds = useHiddenDomainIds();
  const params = useLocalSearchParams<{
    id: string;
    dueDate?: string;
    domainId?: string;
    // Prefill, from the Capture sheet's "More options" or an inbox note.
    title?: string;
    notes?: string;
    energy?: Task['energy'];
    fromNote?: string;
  }>();
  const isNew = params.id === 'new';
  const fromNote = isNew ? params.fromNote : undefined;

  const [title, setTitle] = useState(isNew ? (params.title ?? '') : '');
  const [notes, setNotes] = useState(isNew ? (params.notes ?? '') : '');
  const [domainId, setDomainId] = useState<string | null>(params.domainId ?? null);
  const [energy, setEnergy] = useState<Task['energy']>(isNew ? (params.energy ?? 'medium') : 'medium');
  const [dueDate, setDueDate] = useState<string | null>(params.dueDate ?? null);
  const [estimateMin, setEstimateMin] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(isNew);
  const [saving, setSaving] = useState(false);

  // Editing: load the saved task once.
  useEffect(() => {
    if (isNew) return;
    let cancelled = false;
    getTask(db, params.id).then((task) => {
      if (cancelled) return;
      if (task) {
        setTitle(task.title);
        setNotes(task.notes ?? '');
        setDomainId(task.domainId);
        setEnergy(task.energy);
        setDueDate(task.dueDate);
        setEstimateMin(task.estimateMin);
      }
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [isNew, params.id]);

  // Until the user picks one, default to the first domain Focus Mode isn't hiding.
  const defaultDomainId = (domains.find((d) => !hiddenDomainIds.includes(d.id)) ?? domains[0])?.id ?? null;
  const activeDomainId = domainId ?? defaultDomainId;

  const dueOptions = useMemo(() => dueChoices(today, dueDate, (k) => dueLabel(k, today)), [today, dueDate]);

  const canSave = loaded && title.trim().length > 0 && activeDomainId !== null && !saving;
  // Coming from an inbox note, cancelling loses nothing: the note is still in the inbox.
  const dirtyNew = isNew && !fromNote && (title.trim().length > 0 || notes.trim().length > 0);

  const close = () => {
    if (dirtyNew) {
      Alert.alert('Discard this task?', 'What you typed will be lost.', [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => router.back() },
      ]);
      return;
    }
    router.back();
  };

  const save = async () => {
    if (!canSave || !activeDomainId) return;
    setSaving(true);
    try {
      const input = { title, notes, domainId: activeDomainId, energy, dueDate, estimateMin };
      if (fromNote) convertNoteToTask(db, fromNote, input);
      else if (isNew) await createTask(db, input);
      else await updateTask(db, params.id, input);
      haptic('success');
      router.back();
    } catch {
      setSaving(false);
      Alert.alert("Couldn't save this task", 'Your changes are still here. Try Save again.');
    }
  };

  const remove = () =>
    Alert.alert('Delete this task?', 'It will be removed from all your lists.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          haptic('warning');
          await archiveTask(db, params.id);
          router.back();
        },
      },
    ]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: t.colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: insets.top + spacing.sm,
          paddingHorizontal: spacing.sm,
        }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancel"
          onPress={close}
          style={{ minHeight: 48, minWidth: 64, justifyContent: 'center', paddingHorizontal: spacing.sm }}>
          <Text variant="headline">Cancel</Text>
        </Pressable>
        <Text variant="headline" accessibilityRole="header">
          {isNew ? 'New task' : 'Edit task'}
        </Text>
        <View style={{ minWidth: 64 }} />
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl }}>
        <TextField
          label="What needs doing?"
          value={title}
          onChangeText={setTitle}
          autoFocus={isNew}
          returnKeyType="done"
          maxLength={200}
        />

        <View style={{ gap: spacing.sm }}>
          <Text variant="label">Life domain</Text>
          <DomainChips domains={domains} selectedId={activeDomainId} onSelect={setDomainId} />
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text variant="label">Energy needed</Text>
          <EnergySegment label="Energy needed" value={energy} onChange={setEnergy} options={['low', 'medium', 'high'] as Task['energy'][]} />
          <Text variant="caption" muted>
            Low-energy tasks are easy to find when you&apos;re tired.
          </Text>
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text variant="label">Due</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {dueOptions.map((o) => (
              <Chip key={o.label} label={o.label} selected={dueDate === o.value} onPress={() => setDueDate(o.value)} />
            ))}
          </View>
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text variant="label">Time needed</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {ESTIMATES.map((m) => (
              <Chip key={m ?? 'none'} label={m ? `${m} min` : 'Not sure'} selected={estimateMin === m} onPress={() => setEstimateMin(m)} />
            ))}
          </View>
        </View>

        <TextField label="Notes (optional)" value={notes} onChangeText={setNotes} multiline />

        {!isNew ? <Button variant="danger" label="Delete task" onPress={remove} /> : null}
      </ScrollView>

      <View
        style={{
          padding: spacing.lg,
          paddingBottom: Math.max(insets.bottom, spacing.lg),
          backgroundColor: t.colors.surface,
          borderTopWidth: 1,
          borderTopColor: t.colors.line,
        }}>
        <Button label={isNew ? 'Add task' : 'Save changes'} onPress={save} disabled={!canSave} />
      </View>
    </KeyboardAvoidingView>
  );
}
