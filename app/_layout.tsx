import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryClient, useAppStateFocus } from '../lib/brewQueries';
import { authRedirect } from '../lib/authGate';
import { initCrashReports, withCrashReports } from '../lib/sentry';
import { colors } from '../lib/theme';
import { ArrowLeftIcon } from '../components/icons';

// Before anything renders, so startup errors are caught too
initCrashReports();

function HomeButton() {
  const router = useRouter();
  return (
    <TouchableOpacity
      onPress={() => router.replace('/')}
      style={styles.homeButton}
      role="button"
      aria-label="Back to BruLogger"
    >
      <ArrowLeftIcon color={colors.primary} strokeWidth={2} />
    </TouchableOpacity>
  );
}

/**
 * Header options for the public pages (privacy, terms, support), which open over everything else.
 * One opened with nothing behind it (a reload, a link from the App Store listing) gets no back
 * button, and the installed web app has no browser back button either, so it gets one that goes to
 * the landing page, which sends signed-in users on to My Brews. (The brew and coffee screens live
 * in the tabs' stacks instead: app/(tabs)/(brews,coffees)/_layout.tsx.)
 */
function publicPage(title: string) {
  return ({ navigation }: { navigation: { canGoBack(): boolean } }) => ({
    headerShown: true,
    title,
    headerTintColor: colors.primary,
    headerBackButtonDisplayMode: 'minimal' as const,
    headerLeft: navigation.canGoBack() ? undefined : () => <HomeButton />,
  });
}

function RootLayout() {
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
    const target = authRedirect(segments, !!session);
    if (target) router.replace(target);
  }, [session, segments, router]);

  if (session === undefined) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(public)/privacy" options={publicPage('Privacy Policy')} />
        <Stack.Screen name="(public)/terms" options={publicPage('Terms of Service')} />
        <Stack.Screen name="(public)/support" options={publicPage('Support')} />
        <Stack.Screen name="auth/callback" />
      </Stack>
    </QueryClientProvider>
  );
}

export default withCrashReports(RootLayout);

const styles = StyleSheet.create({
  homeButton: { paddingHorizontal: 12, paddingVertical: 8 },
});
