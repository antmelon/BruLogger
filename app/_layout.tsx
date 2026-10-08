import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { colors } from '../lib/theme';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
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
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="brew/[id]" options={{ headerShown: true, title: 'Brew Details', headerTintColor: colors.primary, headerBackButtonDisplayMode: 'minimal' }} />
      <Stack.Screen name="brew/new" options={{ headerShown: true, title: 'Log a Brew', headerTintColor: colors.primary, headerBackButtonDisplayMode: 'minimal' }} />
      <Stack.Screen name="brew/edit/[id]" options={{ headerShown: true, title: 'Edit Brew', headerTintColor: colors.primary, headerBackButtonDisplayMode: 'minimal' }} />
      <Stack.Screen name="auth/callback" />
    </Stack>
  );
}
