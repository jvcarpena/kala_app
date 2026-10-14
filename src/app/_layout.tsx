import { AtkinsonHyperlegibleNext_400Regular } from '@expo-google-fonts/atkinson-hyperlegible-next/400Regular';
import { AtkinsonHyperlegibleNext_500Medium } from '@expo-google-fonts/atkinson-hyperlegible-next/500Medium';
import { AtkinsonHyperlegibleNext_700Bold } from '@expo-google-fonts/atkinson-hyperlegible-next/700Bold';
import { BricolageGrotesque_600SemiBold } from '@expo-google-fonts/bricolage-grotesque/600SemiBold';
import { BricolageGrotesque_700Bold } from '@expo-google-fonts/bricolage-grotesque/700Bold';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform, StatusBar as RNStatusBar, View } from 'react-native';

import { StartupError } from '@/components/startup-error';
import { TimerEngine } from '@/components/timer-engine';
import { WorkoutEngine } from '@/components/workout-engine';
import { db } from '@/db/client';
import { seedIfEmpty } from '@/db/seed';
import { configureNotifications, onNotificationOpened } from '@/features/habits/reminders';
import { useTheme } from '@/theme/use-theme';

import migrations from '../../drizzle/migrations';

SplashScreen.preventAutoHideAsync();
configureNotifications().catch(() => {});

export default function RootLayout() {
  const t = useTheme();
  const router = useRouter();
  const [fontsLoaded, fontError] = useFonts({
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    AtkinsonHyperlegibleNext_400Regular,
    AtkinsonHyperlegibleNext_500Medium,
    AtkinsonHyperlegibleNext_700Bold,
  });
  const { success: migrated, error: migrationError } = useMigrations(db, migrations);
  const [seeded, setSeeded] = useState(false);
  const [seedError, setSeedError] = useState<Error | null>(null);

  useEffect(() => {
    if (!migrated) return;
    seedIfEmpty(db)
      .then(() => setSeeded(true))
      .catch((e: unknown) => setSeedError(e instanceof Error ? e : new Error(String(e))));
  }, [migrated]);

  // Tapping a habit reminder opens the Habits tab; tapping a timer alert opens the timer.
  useEffect(() => {
    let stop = () => {};
    let cancelled = false;
    onNotificationOpened((screen) =>
      screen === 'focus'
        ? router.push({ pathname: '/focus/[taskId]', params: { taskId: 'active' } })
        : router.navigate('/habits'),
    )
      .then((off) => {
        if (cancelled) off();
        else stop = off;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      stop();
    };
  }, [router]);

  const error = migrationError ?? seedError;
  // A font failure shouldn't block the app: the system font is a fine fallback.
  const ready = (fontsLoaded || !!fontError) && seeded;

  useEffect(() => {
    if (ready || error) SplashScreen.hideAsync();
  }, [ready, error]);

  if (error) return <StartupError error={error} />;
  if (!ready) return null;

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <TimerEngine />
      <WorkoutEngine />
      <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
      {/* Android without edge-to-edge (e.g. Expo Go) paints the bar black unless told otherwise. */}
      {Platform.OS === 'android' ? <RNStatusBar backgroundColor={t.colors.bg} /> : null}
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.colors.bg } }}>
        {/* Declared first so the app opens on Today. The first screen listed is the default route. */}
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        {/* The sheet draws its own backdrop and rounded top (the native formSheet didn't render in Expo Go). */}
        <Stack.Screen
          name="capture"
          options={{ presentation: 'transparentModal', animation: 'slide_from_bottom', contentStyle: { backgroundColor: 'transparent' } }}
        />
        <Stack.Screen name="inbox" options={{ presentation: 'modal' }} />
        <Stack.Screen name="task/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="habit/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="focus-mode" options={{ presentation: 'modal' }} />
        <Stack.Screen name="focus/[taskId]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="workout/template/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="workout/session/[id]" options={{ presentation: 'modal' }} />
      </Stack>
    </View>
  );
}
