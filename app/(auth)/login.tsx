import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../../lib/supabase';
import { colors, shadows } from '../../lib/theme';
import { CoffeeIcon } from '../../components/icons';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [error, setError] = useState<string | null>(null);

  async function signInWithGoogle() {
    setError(null);
    const redirectTo = Platform.OS === 'web'
      ? window.location.origin + '/auth/callback'
      : Linking.createURL('auth/callback');

    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: Platform.OS !== 'web',
      },
    });
    if (oauthError) {
      setError(oauthError.message);
      return;
    }

    // Web leaves for Google here and comes back to /auth/callback. Native opens an in-app browser
    // and gets the redirect URL back, carrying a one-time code (PKCE) or an error.
    if (Platform.OS === 'web' || !data.url) return;
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success') return; // cancelled or dismissed

    const { queryParams } = Linking.parse(result.url);
    const code = typeof queryParams?.code === 'string' ? queryParams.code : null;
    if (!code) {
      const description = queryParams?.error_description ?? queryParams?.error;
      setError(typeof description === 'string' ? description : 'Sign-in did not complete.');
      return;
    }
    const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
    if (sessionError) setError(sessionError.message);
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconWrapper}>
          <CoffeeIcon size={48} color={colors.textMedium} strokeWidth={1.5} />
        </View>
        <Text style={styles.title}>BruLogger</Text>
        <Text style={styles.title}>Coffee Journal</Text>
        <Text style={styles.subtitle}>Track, rate, and remember every brew.</Text>

        <TouchableOpacity style={styles.button} onPress={signInWithGoogle} activeOpacity={0.85}>
          <Text style={styles.buttonText}>Continue with Google</Text>
        </TouchableOpacity>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    ...shadows.raised,
  },
  iconWrapper: { marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '700', color: colors.textDark, marginBottom: 8 },
  subtitle: { fontSize: 15, color: colors.textMedium, marginBottom: 32, textAlign: 'center' },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: { color: colors.surface, fontSize: 16, fontWeight: '600' },
  error: { color: colors.error, fontSize: 14, marginTop: 16, textAlign: 'center' },
});
