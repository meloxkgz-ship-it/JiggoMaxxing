/**
 * Local daily-nudge notifications.
 *
 * Schedules a calendar-trigger notification that fires every day at the
 * user's chosen hour:minute. The body shows the day's nudge title; the
 * full Edge prompt is in the app. Pure local (no push server) — fits the
 * JIGGO privacy contract.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getJSON, setJSON } from './storage';
import { getTodayNudge } from './nudge';
import { tFor, Lang } from './i18n';

const PREF_KEY = 'notifications.pref';
const SCHEDULED_KEY = 'notifications.scheduledId';

export type NotificationPref = {
  enabled: boolean;
  hour: number;   // 0-23
  minute: number; // 0-59
};

const DEFAULT: NotificationPref = { enabled: false, hour: 9, minute: 0 };

// Foreground display defaults — show banner so the nudge is visible
// even when the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function getNotificationPref(): Promise<NotificationPref> {
  return getJSON<NotificationPref>(PREF_KEY, DEFAULT);
}

export async function setNotificationPref(p: NotificationPref): Promise<void> {
  await setJSON(PREF_KEY, p);
}

export async function requestPermission(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  if (!existing.canAskAgain) return false;
  const next = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: false },
  });
  return next.granted;
}

export async function cancelNudgeNotification(): Promise<void> {
  const id = await getJSON<string | null>(SCHEDULED_KEY, null);
  if (id) {
    try { await Notifications.cancelScheduledNotificationAsync(id); } catch {}
  }
  await setJSON<string | null>(SCHEDULED_KEY, null);
}

export async function scheduleNudgeNotification(
  pref: NotificationPref,
  lang: Lang,
): Promise<string | null> {
  await cancelNudgeNotification();
  if (!pref.enabled) return null;

  const nudge = getTodayNudge(lang);
  const title = tFor(lang, 'home.nudge');
  const body = nudge.title;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: false,
      data: { kind: 'daily-nudge', date: nudge.date },
    },
    trigger:
      Platform.OS === 'ios'
        ? ({
            type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
            hour: pref.hour,
            minute: pref.minute,
            repeats: true,
          } as Notifications.CalendarTriggerInput)
        : ({
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: pref.hour,
            minute: pref.minute,
          } as Notifications.DailyTriggerInput),
  });

  await setJSON<string | null>(SCHEDULED_KEY, id);
  return id;
}
