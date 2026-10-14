import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, View } from 'react-native';

import { nudge, trimNumber } from '@/features/fitness/logic';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { Button } from './button';
import { Text } from './text';
import { TextField } from './text-field';

type Props = {
  visible: boolean;
  title: string;
  /** Current value, shown selected so typing replaces it. */
  initial: number;
  unit?: string | null;
  /** When set, shows quick -/+ buttons that change the value by this much. */
  step?: number;
  /** Label for the confirm button. */
  submitLabel?: string;
  onSubmit: (value: number) => void;
  onClose: () => void;
};

/** Small dialog for typing an exact amount (long-press on a count habit). */
export function AmountModal({ visible, title, initial, unit, step, submitLabel = 'Set amount', onSubmit, onClose }: Props) {
  const t = useTheme();
  const [text, setText] = useState(String(initial));
  const value = Number(text.replace(',', '.'));
  const valid = text.trim() !== '' && Number.isFinite(value) && value >= 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} onShow={() => setText(String(initial))}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, justifyContent: 'center', padding: spacing.xl, backgroundColor: 'rgba(10, 15, 21, 0.55)' }}>
        {/* Tapping the scrim dismisses; the card itself swallows taps. */}
        <Pressable accessibilityLabel="Close" onPress={onClose} style={{ ...absoluteFill }} />
        <View style={{ backgroundColor: t.colors.surface, borderRadius: radius.sheet, padding: spacing.xl, gap: spacing.lg }}>
          <Text variant="title" accessibilityRole="header">
            {title}
          </Text>
          <TextField
            label={unit ? `Amount (${unit})` : 'Amount'}
            value={text}
            onChangeText={setText}
            keyboardType="decimal-pad"
            autoFocus
            selectTextOnFocus
          />
          {step ? (
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button
                grow
                variant="secondary"
                label={`− ${trimNumber(step)}`}
                onPress={() => setText(trimNumber(nudge(Number.isFinite(value) ? value : 0, -step)))}
              />
              <Button
                grow
                variant="secondary"
                label={`+ ${trimNumber(step)}`}
                onPress={() => setText(trimNumber(nudge(Number.isFinite(value) ? value : 0, step)))}
              />
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Button grow variant="secondary" label="Cancel" onPress={onClose} />
            <Button grow label={submitLabel} disabled={!valid} onPress={() => onSubmit(value)} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const absoluteFill = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;
