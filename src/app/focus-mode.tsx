import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/card';
import { DomainIcon } from '@/components/domain-icon';
import { Text } from '@/components/text';
import { db } from '@/db/client';
import { useDomains, useSettings } from '@/db/hooks';
import { FOCUS_PRESETS } from '@/features/focus/presets';
import { applyFocusPreset, setCustomFocus, turnOffFocusMode } from '@/features/focus/store';
import { haptic } from '@/lib/haptics';
import { domainColors } from '@/theme/domain-colors';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

function Radio({ selected }: { selected: boolean }) {
  const t = useTheme();
  return (
    <View
      style={{
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: selected ? t.colors.ink : t.colors.inkMuted,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      {selected ? <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: t.colors.ink }} /> : null}
    </View>
  );
}

export default function FocusModeScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const domains = useDomains();
  const { focusPreset, hiddenDomainIds } = useSettings();

  const rows: { key: string; name: string; description: string; selected: boolean; onPress: () => void }[] = [
    {
      key: 'off',
      name: 'Off',
      description: 'Show everything',
      selected: focusPreset === null,
      onPress: () => turnOffFocusMode(db),
    },
    ...FOCUS_PRESETS.map((p) => ({
      key: p.name,
      name: p.name,
      description: p.description,
      selected: focusPreset === p.name,
      onPress: () => applyFocusPreset(db, p, domains),
    })),
  ];

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
          Focus Mode
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Done"
          onPress={() => router.back()}
          style={{ minHeight: 48, minWidth: 64, justifyContent: 'center', alignItems: 'flex-end', paddingHorizontal: spacing.sm }}>
          <Text variant="headline">Done</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl, paddingBottom: insets.bottom + spacing.xl }}>
        <Text muted>Hide whole life domains so Today and Tasks only show what fits right now.</Text>

        <Card>
          {rows.map((r, i) => (
            <Pressable
              key={r.key}
              accessibilityRole="radio"
              accessibilityLabel={`${r.name}. ${r.description}`}
              accessibilityState={{ selected: r.selected }}
              onPress={() => {
                haptic('select');
                r.onPress();
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                minHeight: 64,
                paddingHorizontal: spacing.lg,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: t.colors.line,
              }}>
              <Radio selected={r.selected} />
              <View style={{ flex: 1 }}>
                <Text variant="headline">{r.name}</Text>
                <Text variant="caption" muted>
                  {r.description}
                </Text>
              </View>
            </Pressable>
          ))}
        </Card>

        <View style={{ gap: spacing.sm }}>
          <Text variant="headline" accessibilityRole="header">
            Or hide specific domains
          </Text>
          <Card>
            {domains.map((d, i) => {
              const c = domainColors(t, d.color);
              const hidden = hiddenDomainIds.includes(d.id);
              return (
                <View
                  key={d.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.md,
                    minHeight: 56,
                    paddingHorizontal: spacing.lg,
                    borderTopWidth: i === 0 ? 0 : 1,
                    borderTopColor: t.colors.line,
                  }}>
                  <DomainIcon name={d.icon} size={20} color={c.main} />
                  <Text style={{ flex: 1 }}>{`Hide ${d.name}`}</Text>
                  <Switch
                    accessibilityLabel={`Hide ${d.name}`}
                    value={hidden}
                    trackColor={{ true: t.colors.ink, false: t.colors.line }}
                    thumbColor={hidden ? t.colors.onInk : t.colors.surface}
                    onValueChange={(on) => {
                      haptic('select');
                      const next = on ? [...hiddenDomainIds, d.id] : hiddenDomainIds.filter((x) => x !== d.id);
                      setCustomFocus(db, next);
                    }}
                  />
                </View>
              );
            })}
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}
