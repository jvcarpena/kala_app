import { useRouter } from 'expo-router';
import { ArrowDown, ArrowUp, ArrowCounterClockwise, CaretRight } from 'phosphor-react-native';
import { useMemo } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { DomainIcon } from '@/components/domain-icon';
import { Kala } from '@/components/kala/kala';
import { Segmented } from '@/components/segmented';
import { Text } from '@/components/text';
import { db } from '@/db/client';
import { useAllDomains, useSettings } from '@/db/hooks';
import { moveDomain, restoreDomain } from '@/db/repos/domains';
import { setSetting, type CompanionMode, type Language } from '@/db/settings';
import { greeting } from '@/features/companion/copy';
import { COLOR_LABEL, activeDomains, type COLOR_OPTIONS } from '@/features/domains/logic';
import { haptic } from '@/lib/haptics';
import { domainColors } from '@/theme/domain-colors';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const COMPANION: { value: CompanionMode; label: string }[] = [
  { value: 'chatty', label: 'Chatty' },
  { value: 'quiet', label: 'Quiet' },
  { value: 'off', label: 'Off' },
];
const LANGUAGE: { value: Language; label: string }[] = [
  { value: 'taglish', label: 'Taglish' },
  { value: 'english', label: 'English' },
];
const COMPANION_NOTE: Record<CompanionMode, string> = {
  chatty: 'Kala shows up with a line and a joke now and then.',
  quiet: 'Kala shows up, with plain words and no jokes.',
  off: 'Kala is hidden everywhere.',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="headline" accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

/** Settings: how Kala talks, and the life domains. Opened from the gear on Today. */
export default function SettingsScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const settings = useSettings();
  const all = useAllDomains();
  const voice = { language: settings.language, mode: settings.companion };

  const active = useMemo(() => activeDomains(all), [all]);
  const archived = useMemo(() => all.filter((d) => d.archived), [all]);

  const edit = (id: string) => router.push({ pathname: '/domain/[id]', params: { id } });

  const restore = (id: string, name: string) => {
    haptic('select');
    try {
      restoreDomain(db, id);
    } catch {
      Alert.alert(`Couldn't restore ${name}`, 'Try again.');
    }
  };

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
          Settings
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
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.xl,
          gap: spacing.xl,
        }}>
        <Section title="Companion">
          <Segmented
            label="How chatty Kala is"
            value={settings.companion}
            onChange={(v) => setSetting(db, 'companion', v)}
            options={COMPANION}
          />
          <Text variant="caption" muted>
            {COMPANION_NOTE[settings.companion]}
          </Text>

          <Text variant="label" style={{ marginTop: spacing.sm }}>
            Language
          </Text>
          <Segmented
            label="Language"
            value={settings.language}
            onChange={(v) => setSetting(db, 'language', v)}
            options={LANGUAGE}
          />

          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md }}>
            {settings.companion === 'off' ? null : <Kala pose="hello" size={56} />}
            <View style={{ flex: 1 }}>
              <Text variant="caption" muted>
                Preview
              </Text>
              <Text accessibilityLiveRegion="polite">
                {settings.companion === 'off' ? 'Kala is hidden.' : greeting(voice, new Date().getHours())}
              </Text>
            </View>
          </Card>
        </Section>

        <Section title="Life domains">
          <Text variant="caption" muted>
            Color and icon show which part of your life something belongs to. The order here is the order everywhere.
          </Text>
          <Card>
            {active.map((d, i) => {
              const c = domainColors(t, d.color);
              const colorName = COLOR_LABEL[d.color as (typeof COLOR_OPTIONS)[number]] ?? 'Custom color';
              return (
                <View
                  key={d.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderTopWidth: i === 0 ? 0 : 1,
                    borderTopColor: t.colors.line,
                  }}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${d.name}. ${colorName}.`}
                    onPress={() => edit(d.id)}
                    style={{ flex: 1, minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingLeft: spacing.lg }}>
                    <View
                      style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.soft, alignItems: 'center', justifyContent: 'center' }}>
                      <DomainIcon name={d.icon} size={22} color={c.main} />
                    </View>
                    <Text style={{ flex: 1 }}>{d.name}</Text>
                    <CaretRight size={18} color={t.colors.inkMuted} />
                  </Pressable>
                  <MoveButton
                    direction="up"
                    name={d.name}
                    disabled={i === 0}
                    onPress={() => {
                      haptic('select');
                      moveDomain(db, d.id, 'up');
                    }}
                  />
                  <MoveButton
                    direction="down"
                    name={d.name}
                    disabled={i === active.length - 1}
                    onPress={() => {
                      haptic('select');
                      moveDomain(db, d.id, 'down');
                    }}
                  />
                </View>
              );
            })}
          </Card>
          <Button variant="secondary" label="Add domain" onPress={() => edit('new')} />
        </Section>

        {archived.length > 0 ? (
          <Section title={`Archived · ${archived.length}`}>
            <Text variant="caption" muted>
              Hidden from your lists. Their history is kept, and restoring one brings its tasks and habits back.
            </Text>
            <Card>
              {archived.map((d, i) => {
                const c = domainColors(t, d.color);
                return (
                  <View
                    key={d.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.md,
                      paddingLeft: spacing.lg,
                      minHeight: 64,
                      borderTopWidth: i === 0 ? 0 : 1,
                      borderTopColor: t.colors.line,
                    }}>
                    <DomainIcon name={d.icon} size={22} color={c.main} />
                    <Text muted style={{ flex: 1 }}>
                      {d.name}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Restore ${d.name}`}
                      onPress={() => restore(d.id, d.name)}
                      style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.lg }}>
                      <ArrowCounterClockwise size={18} color={t.colors.ink} />
                      <Text variant="label">Restore</Text>
                    </Pressable>
                  </View>
                );
              })}
            </Card>
          </Section>
        ) : null}
      </ScrollView>
    </View>
  );
}

function MoveButton({
  direction,
  name,
  disabled,
  onPress,
}: {
  direction: 'up' | 'down';
  name: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  const Glyph = direction === 'up' ? ArrowUp : ArrowDown;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Move ${name} ${direction}`}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{ width: 48, minHeight: 64, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.3 : 1 }}>
      <Glyph size={20} color={t.colors.ink} />
    </Pressable>
  );
}
