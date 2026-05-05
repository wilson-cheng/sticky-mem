import { useSettingsStore } from '../store/settings';

/**
 * Cross-platform notification utilities.
 * On web: uses the Notification API.
 * On native (Expo): would use expo-notifications.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
    const result = await Notification.requestPermission();
    return result === 'granted';
  }
  return typeof Notification !== 'undefined' && Notification.permission === 'granted';
}

export function scheduleReviewReminder(dueCount: number): void {
  const enabled = useSettingsStore.getState().remindersEnabled;

  if (!enabled) return;

  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    // Schedule notification for the next day at the configured time
    const reminderTime = useSettingsStore.getState().reminderTime;
    const [hours, minutes] = reminderTime.split(':').map(Number);

    const now = new Date();
    const target = new Date(now);
    target.setHours(hours, minutes, 0, 0);

    if (target <= now) {
      target.setDate(target.getDate() + 1);
    }

    const msUntilTarget = target.getTime() - now.getTime();

    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      // Use a setTimeout as fallback — service worker registration is complex
      setTimeout(() => {
        if (dueCount > 0) {
          new Notification('StickyMem Review Reminder', {
            body: `You have ${dueCount} question${dueCount !== 1 ? 's' : ''} due for review.`,
            icon: '/favicon.ico',
          });
        }
      }, msUntilTarget);
    }
  }
}

export function sendTestNotification(): void {
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    new Notification('StickyMem', {
      body: 'Notifications are working! You will be reminded to review your cards daily.',
      icon: '/favicon.ico',
    });
  }
}
