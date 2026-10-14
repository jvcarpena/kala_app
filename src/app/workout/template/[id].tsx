import { useLocalSearchParams, useRouter } from 'expo-router';
import { CaretDown, CaretUp, Trash, type Icon } from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Text } from '@/components/text';
import { TextField } from '@/components/text-field';
import { db } from '@/db/client';
import { createTemplate, deleteTemplate, getTemplate, updateTemplate } from '@/db/repos/workouts';
import { type ExerciseDraft, fromDrafts, move, newDraft, toDraft, validateTemplate } from '@/features/fitness/editor';
import { haptic } from '@/lib/haptics';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

function IconButton({ Glyph, label, onPress, disabled }: { Glyph: Icon; label: string; onPress: () => void; disabled?: boolean }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.3 : 1 }}>
      <Glyph size={22} color={t.colors.ink} />
    </Pressable>
  );
}

export default function TemplateEditor() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';

  const [name, setName] = useState('');
  const [drafts, setDrafts] = useState<ExerciseDraft[]>(() => (isNew ? [newDraft()] : []));
  const [loaded, setLoaded] = useState(isNew);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isNew) return;
    let cancelled = false;
    getTemplate(db, id).then((found) => {
      if (cancelled) return;
      if (found) {
        setName(found.template.name);
        setDrafts(found.exercises.map(toDraft));
      }
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [isNew, id]);

  const problem = validateTemplate(name, drafts);
  const canSave = loaded && problem === null && !saving;
  const dirtyNew = isNew && (name.trim() !== '' || drafts.some((d) => d.name.trim() !== ''));

  const update = (key: string, patch: Partial<ExerciseDraft>) =>
    setDrafts((list) => list.map((d) => (d.key === key ? { ...d, ...patch } : d)));

  const close = () => {
    if (dirtyNew) {
      Alert.alert('Discard this workout?', 'What you typed will be lost.', [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => router.back() },
      ]);
      return;
    }
    router.back();
  };

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      if (isNew) await createTemplate(db, name, fromDrafts(drafts));
      else await updateTemplate(db, id, name, fromDrafts(drafts));
      haptic('success');
      router.back();
    } catch {
      setSaving(false);
      Alert.alert("Couldn't save this workout", 'Your changes are still here. Try Save again.');
    }
  };

  const remove = () =>
    Alert.alert('Delete this workout?', 'Your past sessions stay in your history.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          haptic('warning');
          await deleteTemplate(db, id);
          router.back();
        },
      },
    ]);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
          {isNew ? 'New workout' : 'Edit workout'}
        </Text>
        <View style={{ minWidth: 64 }} />
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        <TextField label="Workout name" value={name} onChangeText={setName} autoFocus={isNew} returnKeyType="done" maxLength={60} />

        {drafts.map((d, i) => (
          <Card key={d.key} style={{ padding: spacing.lg, gap: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs }}>
              <View style={{ flex: 1 }}>
                <TextField label={`Exercise ${i + 1}`} value={d.name} onChangeText={(v) => update(d.key, { name: v })} maxLength={60} />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                <TextField label="Sets" value={d.sets} onChangeText={(v) => update(d.key, { sets: v })} keyboardType="number-pad" selectTextOnFocus maxLength={2} />
              </View>
              <View style={{ flex: 1 }}>
                <TextField label="Reps" value={d.reps} onChangeText={(v) => update(d.key, { reps: v })} keyboardType="number-pad" selectTextOnFocus maxLength={3} />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                <TextField label="Weight (kg)" value={d.weight} onChangeText={(v) => update(d.key, { weight: v })} keyboardType="decimal-pad" selectTextOnFocus maxLength={6} />
              </View>
              <View style={{ flex: 1 }}>
                <TextField label="Rest (sec)" value={d.restSec} onChangeText={(v) => update(d.key, { restSec: v })} keyboardType="number-pad" selectTextOnFocus maxLength={3} />
              </View>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <IconButton Glyph={CaretUp} label={`Move exercise ${i + 1} up`} disabled={i === 0} onPress={() => setDrafts((l) => move(l, i, i - 1))} />
              <IconButton Glyph={CaretDown} label={`Move exercise ${i + 1} down`} disabled={i === drafts.length - 1} onPress={() => setDrafts((l) => move(l, i, i + 1))} />
              <IconButton
                Glyph={Trash}
                label={`Remove exercise ${i + 1}`}
                onPress={() => setDrafts((l) => (l.length === 1 ? [newDraft()] : l.filter((x) => x.key !== d.key)))}
              />
            </View>
          </Card>
        ))}

        <Text variant="caption" muted>
          Leave weight empty for bodyweight exercises. Your last session&apos;s numbers fill in automatically next time.
        </Text>
        <Button variant="secondary" label="Add exercise" onPress={() => setDrafts((l) => [...l, newDraft()])} />
        {!isNew ? <Button variant="danger" label="Delete workout" onPress={remove} /> : null}
      </ScrollView>

      <View
        style={{
          padding: spacing.lg,
          paddingBottom: Math.max(insets.bottom, spacing.lg),
          backgroundColor: t.colors.surface,
          borderTopWidth: 1,
          borderTopColor: t.colors.line,
          gap: spacing.xs,
        }}>
        {problem && (name !== '' || drafts.some((d) => d.name !== '')) ? (
          <Text variant="caption" style={{ color: t.colors.danger }}>
            {problem}
          </Text>
        ) : null}
        <Button label={isNew ? 'Add workout' : 'Save changes'} onPress={save} disabled={!canSave} />
      </View>
    </KeyboardAvoidingView>
  );
}
