import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import type { Profile } from './types';

// Local notifications don't run inside Expo Go on Android (SDK 53+) — they
// work in the standalone APK. Guard so dev testing never crashes.
const inExpoGo = Constants.appOwnership === 'expo';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const parseHM = (hm: string | null, fallback: [number, number]): [number, number] => {
  if (!hm) return fallback;
  const [h, m] = hm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return fallback;
  return [h, m];
};

const daily = (hour: number, minute: number): Notifications.NotificationTriggerInput => ({
  type: Notifications.SchedulableTriggerInputTypes.DAILY,
  hour: ((hour % 24) + 24) % 24,
  minute,
});

/**
 * (Re)schedule all of Aurora's gentle daily reminders from the user's
 * lifestyle settings + notification preferences.
 */
export async function syncNotifications(profile: Profile | null): Promise<void> {
  if (inExpoGo || !profile) return;
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (status !== 'granted' || !profile.onboarding_complete) return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('aurora-reminders', {
        name: 'Aurora reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 150],
      });
    }

    const prefs = profile.notification_prefs;
    const [wakeH, wakeM] = parseHM(profile.wake_time, [7, 0]);
    const [bedH, bedM] = parseHM(profile.bed_time, [23, 0]);
    const schedule: { title: string; body: string; trigger: Notifications.NotificationTriggerInput }[] = [];

    if (prefs.hydration) {
      schedule.push(
        {
          title: '💧 Time for a glass?',
          body: 'A quick sip now keeps you ahead of your hydration goal.',
          trigger: daily(wakeH + 3, wakeM),
        },
        {
          title: '💧 Hydration check-in',
          body: 'How is your water bottle looking? Aurora is rooting for you.',
          trigger: daily(wakeH + 8, wakeM),
        },
      );
    }
    if (prefs.sleep) {
      schedule.push({
        title: '🌙 Wind-down time',
        body: 'You usually start your bedtime routine around now. Tonight counts too.',
        trigger: daily(bedH - 1, bedM),
      });
    }
    if (prefs.habits) {
      schedule.push({
        title: '✅ Habit check',
        body: 'A few minutes is all it takes to keep your streak alive.',
        trigger: daily(bedH - 3, bedM),
      });
    }
    if (prefs.insights) {
      schedule.push({
        title: '✨ Your daily insight is ready',
        body: 'Aurora noticed something about your patterns today.',
        trigger: daily(wakeH, wakeM + 30),
      });
    }

    await Promise.all(
      schedule.map((n) =>
        Notifications.scheduleNotificationAsync({
          content: { title: n.title, body: n.body },
          trigger: n.trigger,
        }),
      ),
    );
    console.log('[notifications] scheduled', schedule.length, 'daily reminders');
  } catch (e) {
    console.log('[notifications] sync skipped:', (e as Error)?.message);
  }
}
