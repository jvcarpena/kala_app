import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, View } from 'react-native';

import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { Button } from './button';
import { Text } from './text';
import { TextField } from './text-field';

type Props = {
  visible: boolean;
  title: string;
  label: string;
  submitLabel: string;
  onSubmit: (value: string) => void;
  onClose: () => void;
};

/** Small dialog for typing one line of text, like an exercise name. */
export function TextPromptModal({ visible, title, label, submitLabel, onSubmit, onClose }: Props) {
  const t = useTheme();
  const [text, setText] = useState('');
  const valid = text.trim().length > 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} onShow={() => setText('')}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, justifyContent: 'center', padding: spacing.xl, backgroundColor: 'rgba(10, 15, 21, 0.55)' }}>
        <Pressable accessibilityLabel="Close" onPress={onClose} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
        <View style={{ backgroundColor: t.colors.surface, borderRadius: radius.sheet, padding: spacing.xl, gap: spacing.lg }}>
          <Text variant="title" accessibilityRole="header">
            {title}
          </Text>
          <TextField
            label={label}
            value={text}
            onChangeText={setText}
            autoFocus
            returnKeyType="done"
            maxLength={80}
            onSubmitEditing={() => valid && onSubmit(text.trim())}
          />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Button grow variant="secondary" label="Cancel" onPress={onClose} />
            <Button grow label={submitLabel} disabled={!valid} onPress={() => onSubmit(text.trim())} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
