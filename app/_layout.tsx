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
import { colors } from '@/constants/jiggo-theme';
import { LanguageProvider } from '@/lib/i18n';
import { getSettings } from '@/lib/settings';

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

  // Tap on the daily-nudge notification → land on Home
  useEffect(() => {
    if (!navState?.key) return;
    const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
      const data = resp.notification.request.content.data;
      if (data?.kind === 'daily-nudge') {
        router.replace('/(tabs)' as any);
      }
    });
    return () => sub.remove();
  }, [navState?.key]);

  if (!fontsLoaded || !bootstrapped) return null;

  return (
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
        </Stack>
        <StatusBar style="light" />
      </ThemeProvider>
    </LanguageProvider>
  );
}
