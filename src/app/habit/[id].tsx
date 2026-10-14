import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { DomainIcon } from '@/components/domain-icon';
import { Text } from '@/components/text';
import { TextField } from '@/components/text-field';
import { db } from '@/db/client';
import { useDomains, useSettings } from '@/db/hooks';
import { archiveHabit, createHabit, getHabit, updateHabit } from '@/db/repos/habits';
import type { Habit } from '@/db/schema';
import {
  ALL_DAYS,
  DAY_LETTERS,
  DAY_NAMES,
  REMINDER_TIMES,
  WEEKDAYS,
  describeSchedule,
  parseSchedule,
  trimNumber,
} from '@/features/habits/logic';
import { cancelHabitReminders, remindersSupported, syncHabitReminders } from '@/features/habits/reminders';
import { haptic } from '@/lib/haptics';
import { domainColors } from '@/theme/domain-colors';
import { fonts, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export default function HabitEditor() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const domains = useDomains();
  const settings = useSettings();
  const params = useLocalSearchParams<{ id: string }>();
  const isNew = params.id === 'new';

  const [name, setName] = useState('');
  const [domainId, setDomainId] = useState<string | null>(null);
  const [type, setType] = useState<Habit['type']>('check');
  const [target, setTarget] = useState('8');
  const [unit, setUnit] = useState('');
  const [schedule, setSchedule] = useState<number[]>(ALL_DAYS);
  const [reminderTime, setReminderTime] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(isNew);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isNew) return;
    let cancelled = false;
    getHabit(db, params.id).then((h) => {
      if (cancelled) return;
      if (h) {
        setName(h.name);
        setDomainId(h.domainId);
        setType(h.type);
        setTarget(trimNumber(h.target));
        setUnit(h.unit ?? '');
        setSchedule(parseSchedule(h.schedule));
        setReminderTime(h.reminderTime);
      }
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [isNew, params.id]);

  const defaultDomainId = (domains.find((d) => !settings.hiddenDomainIds.includes(d.id)) ?? domains[0])?.id ?? null;
  const activeDomainId = domainId ?? defaultDomainId;

  const targetNumber = Number(target.replace(',', '.'));
  const targetOk = type === 'check' || (Number.isFinite(targetNumber) && targetNumber >= 1);
  const canSave = loaded && name.trim().length > 0 && activeDomainId !== null && schedule.length > 0 && targetOk && !saving;
  const dirtyNew = isNew && name.trim().length > 0;

  const toggleDay = (i: number) => {
    haptic('select');
    setSchedule((s) => (s.includes(i) ? s.filter((d) => d !== i) : [...s, i].sort()));
  };

  const close = () => {
    if (dirtyNew) {
      Alert.alert('Discard this habit?', 'What you typed will be lost.', [
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
      const input = {
        name,
        domainId: activeDomainId,
        type,
        target: type === 'check' ? 1 : targetNumber,
        unit,
        schedule,
        reminderTime,
      };
      const id = isNew ? await createHabit(db, input) : params.id;
      if (!isNew) await updateHabit(db, id, input);

      // The habit is saved either way; a reminder problem shouldn't lose it.
      let reminder: Awaited<ReturnType<typeof syncHabitReminders>> = 'cleared';
      try {
        reminder = await syncHabitReminders(
          { id, name: name.trim(), schedule, reminderTime },
          { language: settings.language, mode: settings.companion },
        );
      } catch {
        reminder = 'denied';
      }
      haptic('success');
      router.back();
      if (reminder === 'denied' && reminderTime) {
        Alert.alert(
          "Reminder isn't set",
          'Notifications are off for Kala. Turn them on in your phone settings, then edit this habit and save again.',
        );
      }
    } catch {
      setSaving(false);
      Alert.alert("Couldn't save this habit", 'Your changes are still here. Try Save again.');
    }
  };

  const remove = () =>
    Alert.alert('Delete this habit?', 'It leaves your lists. Your past activity stays in Insights.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          haptic('warning');
          await archiveHabit(db, params.id);
          await cancelHabitReminders(params.id).catch(() => {});
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
          {isNew ? 'New habit' : 'Edit habit'}
        </Text>
        <View style={{ minWidth: 64 }} />
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl }}>
        <TextField label="Habit name" value={name} onChangeText={setName} autoFocus={isNew} returnKeyType="done" maxLength={80} />

        <View style={{ gap: spacing.sm }}>
          <Text variant="label">Life domain</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {domains.map((d) => {
              const c = domainColors(t, d.color);
              return (
                <Chip
                  key={d.id}
                  label={d.name}
                  selected={activeDomainId === d.id}
                  accent={c.main}
                  tint={c.soft}
                  icon={<DomainIcon name={d.icon} color={c.main} />}
                  onPress={() => setDomainId(d.id)}
                />
              );
            })}
          </View>
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text variant="label">How do you track it?</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            <Chip label="Done or not" selected={type === 'check'} onPress={() => setType('check')} />
            <Chip label="Count" selected={type === 'count'} onPress={() => setType('count')} />
          </View>
          {type === 'count' ? (
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                <TextField label="Daily goal" value={target} onChangeText={setTarget} keyboardType="decimal-pad" selectTextOnFocus />
              </View>
              <View style={{ flex: 1 }}>
                <TextField label="Unit (optional)" value={unit} onChangeText={setUnit} maxLength={20} />
              </View>
            </View>
          ) : null}
          {type === 'count' && !targetOk ? (
            <Text variant="caption" style={{ color: t.colors.danger }}>
              Enter a goal of 1 or more.
            </Text>
          ) : (
            <Text variant="caption" muted>
              {type === 'count' ? 'Tap the counter to add one. Long-press to type an amount.' : 'Tap the checkbox when you do it.'}
            </Text>
          )}
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text variant="label">Which days?</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {ALL_DAYS.map((i) => {
              const on = schedule.includes(i);
              return (
                <Pressable
                  key={i}
                  accessibilityRole="checkbox"
                  accessibilityLabel={DAY_NAMES[i]}
                  accessibilityState={{ checked: on }}
                  onPress={() => toggleDay(i)}
                  hitSlop={2}
                  style={{
                    flex: 1,
                    maxWidth: 48,
                    aspectRatio: 1,
                    minHeight: 40,
                    borderRadius: 999,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: on ? t.colors.ink : t.colors.surface,
                    borderWidth: on ? 0 : 1,
                    borderColor: t.colors.line,
                  }}>
                  <Text style={{ fontFamily: fonts.bold, color: on ? t.colors.onInk : t.colors.ink }}>{DAY_LETTERS[i]}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            <Chip label="Every day" selected={schedule.length === 7} onPress={() => setSchedule(ALL_DAYS)} />
            <Chip label="Weekdays" selected={schedule.join() === WEEKDAYS.join()} onPress={() => setSchedule(WEEKDAYS)} />
          </View>
          {schedule.length === 0 ? (
            <Text variant="caption" style={{ color: t.colors.danger }}>
              Pick at least one day.
            </Text>
          ) : (
            <Text variant="caption" muted>
              {`${describeSchedule(schedule)}. Rest days never break your streak.`}
            </Text>
          )}
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text variant="label">Reminder</Text>
          {remindersSupported ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              <Chip label="No reminder" selected={reminderTime === null} onPress={() => setReminderTime(null)} />
              {REMINDER_TIMES.map((r) => (
                <Chip key={r.value} label={r.label} selected={reminderTime === r.value} onPress={() => setReminderTime(r.value)} />
              ))}
            </View>
          ) : (
            <Text variant="caption" muted>
              Reminders can&apos;t run inside Expo Go on Android. They work in the installed app.
            </Text>
          )}
        </View>

        {!isNew ? <Button variant="danger" label="Delete habit" onPress={remove} /> : null}
      </ScrollView>

      <View
        style={{
          padding: spacing.lg,
          paddingBottom: Math.max(insets.bottom, spacing.lg),
          backgroundColor: t.colors.surface,
          borderTopWidth: 1,
          borderTopColor: t.colors.line,
        }}>
        <Button label={isNew ? 'Add habit' : 'Save changes'} onPress={save} disabled={!canSave} />
      </View>
    </KeyboardAvoidingView>
  );
}
