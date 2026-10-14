import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import { CaretRight } from 'phosphor-react-native';
import { useMemo } from 'react';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Kala } from '@/components/kala/kala';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { db } from '@/db/client';
import { useActiveWorkout, useDomains, useSettings, useTemplates, useWorkoutHistory, useWorkoutSessions } from '@/db/hooks';
import { addStarterTemplates, startSession } from '@/db/repos/workouts';
import { fitnessEmpty } from '@/features/companion/copy';
import { resolveWorkoutDomainId } from '@/features/domains/logic';
import { type TemplateExercise, formatDuration, formatElapsed, formatVolume } from '@/features/fitness/logic';
import { daysAgoLabel } from '@/lib/dates';
import { useNow } from '@/lib/use-now';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export default function FitnessScreen() {
  const t = useTheme();
  const router = useRouter();
  const templates = useTemplates();
  const sessions = useWorkoutSessions();
  const active = useActiveWorkout();
  const history = useWorkoutHistory();
  const domains = useDomains();
  const settings = useSettings();
  const now = useNow(active !== null);
  const voice = { language: settings.language, mode: settings.companion };

  // Workouts count toward the remembered domain (Health to begin with), or the first active one if it was archived.
  const healthId = resolveWorkoutDomainId(domains, settings.workoutDomainId) ?? undefined;

  const { finished, lastDone, volumeBySession, thisWeek } = useMemo(() => {
    const done = sessions.filter((s) => s.endedAt !== null);
    const last = new Map<string, number>();
    for (const s of done) {
      if (s.templateId && s.endedAt !== null && s.endedAt > (last.get(s.templateId) ?? 0)) last.set(s.templateId, s.endedAt);
    }
    const volumes = new Map<string, number>();
    for (const h of history) {
      if (h.weight !== null) volumes.set(h.sessionId, (volumes.get(h.sessionId) ?? 0) + h.reps * h.weight);
    }
    const cutoff = now - WEEK_MS;
    return {
      finished: done.slice(0, 5),
      lastDone: last,
      volumeBySession: volumes,
      thisWeek: done.filter((s) => (s.endedAt ?? 0) > cutoff).length,
    };
  }, [sessions, history, now]);

  const open = (sessionId: string) => router.push({ pathname: '/workout/session/[id]', params: { id: sessionId } });

  const start = async (templateId: string | null, name: string, exercises: TemplateExercise[]) => {
    if (!healthId) return;
    open(await startSession(db, { templateId, name, domainId: healthId, exercises }));
  };

  const empty = templates.length === 0 && sessions.length === 0;
  const emptyCopy = fitnessEmpty(voice);

  return (
    <Screen
      title="Fitness"
      subtitle={thisWeek > 0 ? `${thisWeek} ${thisWeek === 1 ? 'workout' : 'workouts'} this week` : 'Lift, log, repeat'}
      onAdd={() => router.push({ pathname: '/workout/template/[id]', params: { id: 'new' } })}
      addLabel="New workout template">
      {active ? (
        <Card style={{ padding: spacing.lg, gap: spacing.md }}>
          <View style={{ gap: 2 }}>
            <Text variant="caption" muted>
              Workout in progress
            </Text>
            <Text variant="title">{active.name}</Text>
            <Text muted style={{ fontVariant: ['tabular-nums'] }}>
              {formatElapsed(now - active.startedAt)}
            </Text>
          </View>
          <Button label="Resume workout" onPress={() => open(active.id)} />
        </Card>
      ) : null}

      {empty ? (
        <View style={{ alignItems: 'center', gap: spacing.sm, paddingTop: spacing.md }}>
          {settings.companion === 'off' ? null : <Kala pose="gym" size={170} />}
          <Text variant="title" style={{ textAlign: 'center' }}>
            {emptyCopy.title}
          </Text>
          <Text muted style={{ textAlign: 'center', maxWidth: 300 }}>
            {emptyCopy.body}
          </Text>
          <View style={{ alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.md }}>
            <Button label="Add push, pull and legs" onPress={() => addStarterTemplates(db)} />
            <Button
              variant="secondary"
              label="Create your own"
              onPress={() => router.push({ pathname: '/workout/template/[id]', params: { id: 'new' } })}
            />
          </View>
        </View>
      ) : null}

      {templates.length > 0 ? (
        <View style={{ gap: spacing.sm }}>
          <Text variant="headline" accessibilityRole="header">
            Your workouts
          </Text>
          {templates.map(({ template, exercises }) => {
            const last = lastDone.get(template.id);
            const names = exercises.map((e) => e.name);
            return (
              <Card key={template.id} style={{ padding: spacing.lg, gap: spacing.md }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${template.name}`}
                  onPress={() => router.push({ pathname: '/workout/template/[id]', params: { id: template.id } })}
                  style={{ gap: 2 }}>
                  <Text variant="headline">{template.name}</Text>
                  <Text variant="caption" muted>
                    {`${exercises.length} ${exercises.length === 1 ? 'exercise' : 'exercises'} · ${last ? `last done ${daysAgoLabel(last)}` : 'not done yet'}`}
                  </Text>
                  <Text variant="caption" muted numberOfLines={1}>
                    {names.join(', ')}
                  </Text>
                </Pressable>
                <Button
                  label={active ? 'Finish your current workout first' : 'Start workout'}
                  disabled={!!active}
                  onPress={() => start(template.id, template.name, exercises)}
                />
              </Card>
            );
          })}
        </View>
      ) : null}

      {!active ? (
        <Button variant="secondary" label="Start an empty workout" onPress={() => start(null, 'Workout', [])} />
      ) : null}

      {finished.length > 0 ? (
        <View style={{ gap: spacing.sm }}>
          <Text variant="headline" accessibilityRole="header">
            Recent
          </Text>
          <Card>
            {finished.map((s, i) => {
              const ended = s.endedAt ?? s.startedAt;
              return (
                <Pressable
                  key={s.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${s.name}, ${format(ended, 'EEEE d MMMM')}. Open summary`}
                  onPress={() => open(s.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.md,
                    minHeight: 64,
                    paddingHorizontal: spacing.lg,
                    borderTopWidth: i === 0 ? 0 : 1,
                    borderTopColor: t.colors.line,
                  }}>
                  <View style={{ flex: 1 }}>
                    <Text>{s.name}</Text>
                    <Text variant="caption" muted>
                      {`${format(ended, 'EEE d MMM')} · ${formatDuration(ended - s.startedAt)}${
                        volumeBySession.get(s.id) ? ` · ${formatVolume(volumeBySession.get(s.id) ?? 0)}` : ''
                      }`}
                    </Text>
                  </View>
                  <CaretRight size={18} color={t.colors.inkMuted} />
                </Pressable>
              );
            })}
          </Card>
        </View>
      ) : null}
    </Screen>
  );
}
