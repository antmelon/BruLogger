import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

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

    if (!session && !inAuth && !inCallback) {
      router.replace('/(auth)/login');
    } else if (session && inAuth) {
      router.replace('/(tabs)');
    }
  }, [session, segments]);

  if (session === undefined) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="brew/[id]" options={{ headerShown: true, title: 'Brew Details', headerTintColor: '#8B5A2B' }} />
      <Stack.Screen name="brew/new" options={{ headerShown: true, title: 'Log a Brew', headerTintColor: '#8B5A2B' }} />
      <Stack.Screen name="brew/edit/[id]" options={{ headerShown: true, title: 'Edit Brew', headerTintColor: '#8B5A2B' }} />
      <Stack.Screen name="auth/callback" />
    </Stack>
  );
}
