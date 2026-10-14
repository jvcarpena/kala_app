import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { DomainIcon } from '@/components/domain-icon';
import { IconGrid } from '@/components/icon-grid';
import { Swatches } from '@/components/swatches';
import { Text } from '@/components/text';
import { TextField } from '@/components/text-field';
import { db } from '@/db/client';
import { useAllDomains, useHabits, useTasks } from '@/db/hooks';
import { archiveDomain, createDomain, updateDomain } from '@/db/repos/domains';
import {
  NAME_MAX,
  archiveWarning,
  canArchive,
  domainUsage,
  suggestColor,
  validateDomainName,
} from '@/features/domains/logic';
import { haptic } from '@/lib/haptics';
import { domainColors } from '@/theme/domain-colors';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

/** Add or edit a life domain: name, icon and color, with a live preview. Archive lives here too. */
export default function DomainEditor() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const all = useAllDomains();
  const tasks = useTasks();
  const habits = useHabits();
  const params = useLocalSearchParams<{ id: string }>();
  const isNew = params.id === 'new';
  const existing = isNew ? undefined : all.find((d) => d.id === params.id);

  // Fields stay null until you change them, so an existing domain's values show without copying
  // them into state (the live query may not have loaded on the first render).
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [iconDraft, setIconDraft] = useState<string | null>(null);
  const [colorDraft, setColorDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const name = nameDraft ?? existing?.name ?? '';
  const icon = iconDraft ?? existing?.icon ?? 'Tag';
  const color = colorDraft ?? existing?.color ?? suggestColor(all);

  const check = validateDomainName(name, all, existing?.id);
  const canSave = check.ok && !saving && (isNew || !!existing);
  const nameError = !check.ok && name.trim() ? check.error : null;
  const dirty = nameDraft !== null || iconDraft !== null || colorDraft !== null;
  const colors = domainColors(t, color);

  const close = () => {
    Keyboard.dismiss();
    if (dirty) {
      Alert.alert('Discard your changes?', 'What you changed will be lost.', [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => router.back() },
      ]);
      return;
    }
    router.back();
  };

  const save = async () => {
    if (!check.ok || !canSave) return;
    setSaving(true);
    try {
      const input = { name: check.name, color, icon };
      if (isNew) await createDomain(db, input);
      else if (existing) await updateDomain(db, existing.id, input);
      haptic('success');
      Keyboard.dismiss();
      router.back();
    } catch {
      setSaving(false);
      Alert.alert("Couldn't save this domain", 'Your changes are still here. Try Save again.');
    }
  };

  const archivable = !!existing && canArchive(all, existing.id);
  const archive = () => {
    if (!existing) return;
    const warning = archiveWarning(domainUsage(existing.id, tasks, habits));
    Alert.alert(`Archive ${existing.name}?`, warning ?? 'It leaves your lists and pickers. Its history is kept.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive',
        style: 'destructive',
        onPress: () => {
          try {
            archiveDomain(db, existing.id);
            haptic('warning');
            router.back();
          } catch {
            Alert.alert("Couldn't archive this domain", 'Keep at least one active domain.');
          }
        },
      },
    ]);
  };

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
          {isNew ? 'New domain' : 'Edit domain'}
        </Text>
        <View style={{ minWidth: 64 }} />
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl }}>
        <View style={{ gap: spacing.sm }}>
          <TextField
            label="Name"
            value={name}
            onChangeText={setNameDraft}
            autoFocus={isNew}
            returnKeyType="done"
            maxLength={NAME_MAX}
          />
          {nameError ? (
            <Text variant="caption" accessibilityLiveRegion="polite" style={{ color: t.colors.danger }}>
              {nameError}
            </Text>
          ) : null}
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text variant="label">Preview</Text>
          <View style={{ flexDirection: 'row' }}>
            <Chip
              label={name.trim() || 'Domain name'}
              selected
              accent={colors.main}
              tint={colors.soft}
              icon={<DomainIcon name={icon} color={colors.main} />}
            />
          </View>
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text variant="label">Icon</Text>
          <IconGrid value={icon} onChange={setIconDraft} color={color} />
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text variant="label">Color</Text>
          <Swatches value={color} onChange={setColorDraft} />
        </View>

        {existing ? (
          <View style={{ gap: spacing.sm }}>
            <Button variant="danger" label="Archive domain" onPress={archive} disabled={!archivable} />
            {!archivable ? (
              <Text variant="caption" muted>
                Keep at least one active domain. Add another before archiving this one.
              </Text>
            ) : null}
          </View>
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
        <Button label={isNew ? 'Add domain' : 'Save changes'} onPress={save} disabled={!canSave} />
      </View>
    </KeyboardAvoidingView>
  );
}
