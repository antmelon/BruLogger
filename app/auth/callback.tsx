import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/theme';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) router.replace('/(tabs)');
    });

    // Web: supabase-js reads the OAuth result from the URL while it initializes; this resolves once
    // that's done, with the error if Google or Supabase rejected the sign-in. (Native finishes the
    // flow in login.tsx and lands here only via the redirect deep link, so it just waits.)
    if (Platform.OS === 'web') {
      supabase.auth.initialize().then(async ({ error: urlError }) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) setError(urlError?.message ?? 'Sign-in did not complete.');
      });
    }

    return () => subscription.unsubscribe();
  }, [router]);

  if (!error) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign-in failed</Text>
      <Text style={styles.message}>{error}</Text>
      <TouchableOpacity style={styles.button} onPress={() => router.replace('/(auth)/login')} activeOpacity={0.85}>
        <Text style={styles.buttonText}>Back to sign in</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.background,
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.textDark, marginBottom: 8 },
  message: { fontSize: 14, color: colors.textMedium, textAlign: 'center', marginBottom: 24 },
  button: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 28 },
  buttonText: { color: colors.surface, fontSize: 16, fontWeight: '600' },
});
