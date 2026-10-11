import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryClient, useAppStateFocus } from '../lib/brewQueries';
import { colors } from '../lib/theme';
import { ArrowLeftIcon } from '../components/icons';

function HomeButton() {
  const router = useRouter();
  return (
    <TouchableOpacity
      onPress={() => router.replace('/(tabs)')}
      style={styles.homeButton}
      accessibilityRole="button"
      accessibilityLabel="Back to My Brews"
    >
      <ArrowLeftIcon color={colors.primary} strokeWidth={2} />
    </TouchableOpacity>
  );
}

/**
 * Header options for the screens stacked over the tabs. A screen opened with nothing behind it
 * (a reload, a shared link, Android reopening the installed web app) gets no back button, and the
 * installed web app has no browser back button either, so it gets one that goes to My Brews.
 */
function stackedScreen(title: string) {
  return ({ navigation }: { navigation: { canGoBack(): boolean } }) => ({
    headerShown: true,
    title,
    headerTintColor: colors.primary,
    headerBackButtonDisplayMode: 'minimal' as const,
    headerLeft: navigation.canGoBack() ? undefined : () => <HomeButton />,
  });
}

export default function RootLayout() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const router = useRouter();
  const segments = useSegments();
  useAppStateFocus();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) queryClient.clear(); // don't show one account's brews to the next
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session === undefined) return; // still loading

    const inAuth = segments[0] === '(auth)';
    const inCallback = segments[0] === 'auth'; // /auth/callback
    const inLanding = (segments as string[]).length === 0; // root index (landing page)

    if (!session && !inAuth && !inCallback && !inLanding) {
      router.replace('/(auth)/login');
    } else if (session && (inAuth || inLanding)) {
      router.replace('/(tabs)');
    }
  }, [session, segments, router]);

  if (session === undefined) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="brew/[id]" options={stackedScreen('Brew Details')} />
        <Stack.Screen name="brew/new" options={stackedScreen('Log a Brew')} />
        <Stack.Screen name="brew/edit/[id]" options={stackedScreen('Edit Brew')} />
        <Stack.Screen name="auth/callback" />
      </Stack>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  homeButton: { paddingHorizontal: 12, paddingVertical: 8 },
});
