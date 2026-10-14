import * as Haptics from 'expo-haptics';

type Kind = 'light' | 'select' | 'success' | 'warning';

/** Fire-and-forget haptic. Never throws: unsupported devices simply do nothing. */
export function haptic(kind: Kind): void {
  const run = () => {
    switch (kind) {
      case 'light':
        return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      case 'select':
        return Haptics.selectionAsync();
      case 'success':
        return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      case 'warning':
        return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  };
  run().catch(() => {});
}
