import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { Stack, router, useRootNavigationState, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_900Black,
} from '@expo-google-fonts/inter';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { colors } from '@/constants/jiggo-theme';
import { LanguageProvider } from '@/lib/i18n';
import { getNotificationPref, scheduleNudgeNotification } from '@/lib/notifications';
import { getSettings } from '@/lib/settings';
import { getJSON, setJSON } from '@/lib/storage';

SplashScreen.preventAutoHideAsync().catch(() => {});

const JiggoDarkTheme = {
  ...DarkTheme,
  dark: true,
  colors: {
    ...DarkTheme.colors,
    background: colors.ink,
    card: colors.ink,
    text: colors.textPrimary,
    primary: colors.bronze,
    border: colors.hairline,
    notification: colors.bronzeBright,
  },
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_900Black,
  });
  const [bootstrapped, setBootstrapped] = useState(false);
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const navState = useRootNavigationState();
  const segments = useSegments();

  useEffect(() => {
    (async () => {
      const s = await getSettings();
      setOnboarded(!!s.hasOnboarded);
      setBootstrapped(true);
    })();
  }, []);

  useEffect(() => {
    if (fontsLoaded && bootstrapped) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, bootstrapped]);

  useEffect(() => {
    if (!navState?.key || onboarded === null) return;
    const inOnboarding = segments[0] === 'onboarding';
    if (!onboarded && !inOnboarding) {
      router.replace('/onboarding' as any);
    }
  }, [navState?.key, onboarded, segments]);

  // Tap on the daily-nudge notification → land on Home. We catch both:
  // (a) the warm-launch case via `addNotificationResponseReceivedListener`,
  //     fired only while the listener is attached.
  // (b) the cold-launch case via `getLastNotificationResponseAsync`, which
  //     returns the tap that *launched* the app — without this, a user who
  //     tapped the nudge while the app was fully terminated would land on
  //     a default tab with the notification silently dropped.
  //
  // The cold-launch path is deduped by request identifier: that API returns
  // the most-recent cached response, NOT just the one for this session — so
  // without dedup the user gets re-routed to /(tabs) on *every* launch as
  // long as the last cached tap stays on the OS, even when they opened the
  // app from the icon, not the notification.
  useEffect(() => {
    if (!navState?.key) return;
    let cancelled = false;
    const HANDLED_KEY = 'notifications.lastHandledId';
    const handle = async (
      resp: Notifications.NotificationResponse,
      isCold: boolean,
    ) => {
      const data = resp.notification.request.content.data;
      if (data?.kind !== 'daily-nudge') return;
      const id = resp.notification.request.identifier;
      if (isCold) {
        const last = await getJSON<string | null>(HANDLED_KEY, null);
        if (last === id) return; // already routed for this tap
        await setJSON<string | null>(HANDLED_KEY, id);
      } else {
        // Warm tap: still record so a subsequent cold open of the same
        // notification (very rare) doesn't double-route.
        setJSON<string | null>(HANDLED_KEY, id).catch(() => {});
      }
      router.replace('/(tabs)' as any);
    };
    (async () => {
      const last = await Notifications.getLastNotificationResponseAsync();
      if (cancelled || !last) return;
      await handle(last, true);
    })();
    const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
      handle(resp, false);
    });
    return () => { cancelled = true; sub.remove(); };
  }, [navState?.key]);

  // Re-arm the daily nudge schedule after a cold start or reinstall. The
  // user's `notifPref.enabled=true` is persisted but the OS-level schedule
  // is not — without this re-arm a fresh-install (or any state where the
  // scheduled id was lost) silently never fires until the user toggles the
  // switch again. Also refreshes the title so it isn't frozen on whatever
  // day-of-year the user last toggled the switch.
  useEffect(() => {
    if (!bootstrapped) return;
    (async () => {
      try {
        const pref = await getNotificationPref();
        if (pref.enabled) {
          const lang = await getJSON<'en' | 'de'>('lang', 'en');
          await scheduleNudgeNotification(pref, lang);
        }
      } catch {}
    })();
  }, [bootstrapped]);

  if (!fontsLoaded || !bootstrapped) return null;

  return (
    <ErrorBoundary>
    <LanguageProvider>
      <ThemeProvider value={JiggoDarkTheme}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.ink },
            animation: 'fade',
          }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="onboarding" options={{ animation: 'none' }} />
          <Stack.Screen
            name="settings"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="journal-entry"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="closet-add"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="builder"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="scan-detail"
            options={{ presentation: 'card', animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="look-detail"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="why"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="plan-item-add"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="insights"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="rituals"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="upgrade"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="achievements"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
        </Stack>
        <StatusBar style="light" />
      </ThemeProvider>
    </LanguageProvider>
    </ErrorBoundary>
  );
}
