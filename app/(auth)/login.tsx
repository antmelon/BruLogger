import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../../lib/supabase';
import { colors, shadows } from '../../lib/theme';
import { CoffeeIcon } from '../../components/icons';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  async function signInWithGoogle() {
    const redirectTo = Platform.OS === 'web'
      ? window.location.origin + '/auth/callback'
      : Linking.createURL('auth/callback');

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: Platform.OS !== 'web',
      },
    });

    if (error) {
      console.error(error);
      return;
    }

    if (Platform.OS !== 'web' && data.url) {
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (result.type === 'success' && result.url) {
        const hash = result.url.split('#')[1] ?? '';
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) console.error('setSession error:', sessionError);
        } else {
          // PKCE flow fallback
          const { error: sessionError } = await supabase.auth.exchangeCodeForSession(result.url);
          if (sessionError) console.error('exchangeCodeForSession error:', sessionError);
        }
      } else {
        console.warn('OAuth did not succeed:', result.type);
      }
    }
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
});
