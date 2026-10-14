import { format } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CaretDown, Trash, Trophy } from 'phosphor-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmountModal } from '@/components/amount-modal';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Kala } from '@/components/kala/kala';
import { RestDock } from '@/components/rest-dock';
import { SetRow } from '@/components/set-row';
import { Text } from '@/components/text';
import { TextPromptModal } from '@/components/text-prompt-modal';
import { db } from '@/db/client';
import { useDomains, useSettings, useWorkoutHistory, useWorkoutSessions, useWorkoutSets } from '@/db/hooks';
import {
  addExercise,
  addSet,
  discardSession,
  finishSession,
  removeExercise,
  removeSet,
  setSetValues,
  toggleSet,
} from '@/db/repos/workouts';
import { setSetting } from '@/db/settings';
import { recordLine, workoutDoneLine } from '@/features/companion/copy';
import {
  describePerformance,
  doneCount,
  extendRest,
  findPersonalRecords,
  formatDuration,
  formatElapsed,
  formatVolume,
  formatWeight,
  groupByExercise,
  lastPerformance,
  startRest,
  trimNumber,
  volume,
  REPS_STEP,
  WEIGHT_STEP,
} from '@/features/fitness/logic';
import { haptic } from '@/lib/haptics';
import { currentTime, useNow } from '@/lib/use-now';
import { domainColors } from '@/theme/domain-colors';
import { fonts, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

type Editing = { setId: string; field: 'weight' | 'reps'; initial: number } | null;

export default function WorkoutSessionScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const sessions = useWorkoutSessions();
  const session = sessions.find((s) => s.id === id);
  const sets = useWorkoutSets(id);
  const history = useWorkoutHistory();
  const settings = useSettings();
  const domains = useDomains();
  const voice = { language: settings.language, mode: settings.companion };

  const { restTimer } = settings;
  const finished = session?.endedAt != null;
  // Tick while a workout is running or a rest is counting down.
  const now = useNow((!!session && !finished) || !!restTimer);
  const colors = domainColors(t, domains.find((d) => d.id === session?.domainId)?.color ?? 'health');

  const [editing, setEditing] = useState<Editing>(null);
  const [addingExercise, setAddingExercise] = useState(false);
  const [waited, setWaited] = useState(false);

  // If the workout never shows up (an old link), say so instead of staying blank.
  useEffect(() => {
    const timer = setTimeout(() => setWaited(true), 800);
    return () => clearTimeout(timer);
  }, []);

  const groups = useMemo(() => groupByExercise(sets), [sets]);

  if (!session) {
    return (
      <View style={{ flex: 1, backgroundColor: t.colors.bg, padding: spacing.xl, paddingTop: insets.top + spacing.xxl, gap: spacing.lg }}>
        {waited ? (
          <>
            <Text variant="title">Workout not found</Text>
            <Text muted>It may have been discarded.</Text>
            <Button label="Close" onPress={() => router.back()} />
          </>
        ) : null}
      </View>
    );
  }

  const endedAt = session.endedAt;
  const elapsedMs = (endedAt ?? now) - session.startedAt;

  const toggle = async (setId: string) => {
    const s = sets.find((x) => x.id === setId);
    if (!s) return;
    const next = !s.done;
    await toggleSet(db, s.id, next);
    if (!next) return;
    // Rest after a set, except after the very last one.
    const moreToDo = sets.some((x) => !x.done && x.id !== s.id);
    await setSetting(db, 'restTimer', moreToDo && s.restSec > 0 ? startRest(s.restSec, currentTime()) : null);
  };

  const submitEdit = (value: number) => {
    if (!editing) return;
    if (editing.field === 'weight') setSetValues(db, editing.setId, { weight: value > 0 ? value : null });
    else setSetValues(db, editing.setId, { reps: Math.max(1, Math.round(value)) });
    setEditing(null);
  };

  const discard = () =>
    Alert.alert('Discard this workout?', 'Everything you logged in it will be lost.', [
      { text: 'Keep going', style: 'cancel' },
      {
        text: 'Discard workout',
        style: 'destructive',
        onPress: async () => {
          haptic('warning');
          await setSetting(db, 'restTimer', null);
          await discardSession(db, session.id);
          router.back();
        },
      },
    ]);

  const finish = async () => {
    const undone = sets.length - doneCount(sets);
    const run = async () => {
      const ok = await finishSession(db, session.id);
      if (!ok) {
        Alert.alert('No sets completed', 'Check off at least one set to save this workout.', [
          { text: 'Keep going', style: 'cancel' },
          { text: 'Discard workout', style: 'destructive', onPress: discard },
        ]);
        return;
      }
      await setSetting(db, 'restTimer', null);
      haptic('success');
    };
    if (undone > 0 && doneCount(sets) > 0) {
      Alert.alert('Finish this workout?', `${undone} ${undone === 1 ? 'set' : 'sets'} you didn't check off won't be saved.`, [
        { text: 'Keep going', style: 'cancel' },
        { text: 'Finish', onPress: run },
      ]);
      return;
    }
    run();
  };

  // ---- Finished: the summary ----------------------------------------------------------------
  if (finished && endedAt !== null) {
    const before = history.filter((h) => h.sessionId !== session.id && h.endedAt <= endedAt);
    const records = findPersonalRecords(sets, before);
    const minutes = Math.max(1, Math.round((endedAt - session.startedAt) / 60_000));

    return (
      <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.sm }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={() => router.back()}
            style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
            <CaretDown size={24} color={t.colors.ink} />
          </Pressable>
          <Text variant="headline" accessibilityRole="header" style={{ flex: 1, textAlign: 'center', marginRight: 48 }}>
            {session.name}
          </Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
          <Text variant="caption" muted style={{ textAlign: 'center' }}>
            {format(session.startedAt, 'EEEE d MMMM · h:mm a')}
          </Text>

          {settings.companion !== 'off' ? (
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md }}>
              <Kala pose="yay" size={84} />
              <View style={{ flex: 1, backgroundColor: t.colors.surface, borderRadius: radius.card, borderBottomLeftRadius: 4, padding: spacing.md }}>
                <Text>{workoutDoneLine(voice, minutes, doneCount(sets))}</Text>
              </View>
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Stat label="Duration" value={formatDuration(endedAt - session.startedAt)} />
            <Stat label="Volume" value={formatVolume(volume(sets))} />
            <Stat label="Sets" value={String(doneCount(sets))} />
          </View>

          {records.length > 0 ? (
            <Card style={{ padding: spacing.lg, gap: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Trophy size={22} weight="fill" color={t.colors.streak} />
                <Text variant="headline" accessibilityRole="header">
                  {recordLine(voice, records.length)}
                </Text>
              </View>
              {records.map((r) => (
                <Text key={r.exerciseName}>
                  {r.kind === 'weight'
                    ? `${r.exerciseName}: ${formatWeight(r.value)} (was ${formatWeight(r.previous)})`
                    : `${r.exerciseName}: ${r.value} reps (was ${r.previous})`}
                </Text>
              ))}
            </Card>
          ) : null}

          <Card style={{ padding: spacing.lg, gap: spacing.md }}>
            <Text variant="headline" accessibilityRole="header">
              What you did
            </Text>
            {groups.map((g) => (
              <View key={g.order} style={{ gap: 2 }}>
                <Text style={{ fontFamily: fonts.bold }}>{g.name}</Text>
                <Text variant="caption" muted>
                  {g.sets.map((s) => `${s.reps}${s.weight === null ? '' : ` × ${trimNumber(s.weight)}`}`).join(', ')}
                </Text>
              </View>
            ))}
          </Card>
        </ScrollView>

        <View style={{ padding: spacing.lg, paddingBottom: Math.max(insets.bottom, spacing.lg) }}>
          <Button label="Done" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  // ---- Running workout -------------------------------------------------------------------------
  const total = sets.length;
  const done = doneCount(sets);

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.sm }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Minimise workout. It keeps running"
          onPress={() => router.back()}
          style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
          <CaretDown size={24} color={t.colors.ink} />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text variant="headline" accessibilityRole="header">
            {session.name}
          </Text>
          <Text variant="caption" muted style={{ fontVariant: ['tabular-nums'] }}>
            {`${formatElapsed(elapsedMs)} · ${done} of ${total} sets`}
          </Text>
        </View>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xl }}>
        {groups.length === 0 ? (
          <View style={{ alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl }}>
            {settings.companion !== 'off' ? <Kala pose="gym" size={150} /> : null}
            <Text variant="title" style={{ textAlign: 'center' }}>
              Empty workout
            </Text>
            <Text muted style={{ textAlign: 'center', maxWidth: 280 }}>
              Add your first exercise to start logging sets.
            </Text>
          </View>
        ) : null}

        {groups.map((g) => {
          const last = lastPerformance(g.name, history);
          return (
            <Card key={g.order} style={{ paddingVertical: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: spacing.lg, paddingRight: spacing.xs }}>
                <View style={{ flex: 1, paddingVertical: spacing.sm }}>
                  <Text variant="headline">{g.name}</Text>
                  {last ? (
                    <Text variant="caption" muted>
                      {`Last time: ${describePerformance(last)}`}
                    </Text>
                  ) : null}
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${g.name} from this workout`}
                  onPress={() =>
                    Alert.alert(`Remove ${g.name}?`, 'Its sets are removed from this workout.', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Remove', style: 'destructive', onPress: () => removeExercise(db, session.id, g.order) },
                    ])
                  }
                  style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
                  <Trash size={20} color={t.colors.inkMuted} />
                </Pressable>
              </View>

              {g.sets.map((s, i) => (
                <SetRow
                  key={s.id}
                  number={i + 1}
                  reps={s.reps}
                  weight={s.weight}
                  done={s.done}
                  colors={colors}
                  exerciseName={g.name}
                  onToggle={() => toggle(s.id)}
                  onEditWeight={() => setEditing({ setId: s.id, field: 'weight', initial: s.weight ?? 0 })}
                  onEditReps={() => setEditing({ setId: s.id, field: 'reps', initial: s.reps })}
                  onRemove={() =>
                    Alert.alert(`Remove set ${i + 1}?`, undefined, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Remove', style: 'destructive', onPress: () => removeSet(db, s.id) },
                    ])
                  }
                />
              ))}

              <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.xs }}>
                <Button variant="secondary" label="Add set" onPress={() => addSet(db, session.id, g.order)} />
              </View>
            </Card>
          );
        })}

        <Button variant="secondary" label="Add exercise" onPress={() => setAddingExercise(true)} />
        <Button variant="danger" label="Discard workout" onPress={discard} />
      </ScrollView>

      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: Math.max(insets.bottom, spacing.lg), gap: spacing.sm }}>
        {restTimer ? (
          <RestDock
            rest={restTimer}
            now={now}
            color={colors.main}
            onExtend={() => setSetting(db, 'restTimer', extendRest(restTimer, 30))}
            onSkip={() => setSetting(db, 'restTimer', null)}
          />
        ) : null}
        <Button label="Finish workout" onPress={finish} />
      </View>

      <AmountModal
        visible={editing !== null}
        title={editing?.field === 'weight' ? 'Weight (kg)' : 'Reps'}
        initial={editing?.initial ?? 0}
        step={editing?.field === 'weight' ? WEIGHT_STEP : REPS_STEP}
        submitLabel="Set"
        onClose={() => setEditing(null)}
        onSubmit={submitEdit}
      />
      <TextPromptModal
        visible={addingExercise}
        title="Add exercise"
        label="Exercise name"
        submitLabel="Add"
        onClose={() => setAddingExercise(false)}
        onSubmit={(name) => {
          setAddingExercise(false);
          addExercise(db, session.id, name);
        }}
      />
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const t = useTheme();
  return (
    <View accessible accessibilityLabel={`${label}: ${value}`} style={{ flex: 1, backgroundColor: t.colors.surface, borderRadius: radius.card, padding: spacing.md }}>
      <Text style={{ fontFamily: fonts.display, fontSize: 20, lineHeight: 26 }}>{value}</Text>
      <Text variant="caption" muted>
        {label}
      </Text>
    </View>
  );
}
