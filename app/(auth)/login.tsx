import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Image } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../../lib/supabase';
import { signInWithApple } from '../../lib/appleSignIn';
import { colors, shadows } from '../../lib/theme';
import { AppleIcon, CoffeeIcon } from '../../components/icons';
import { SignInConsent } from '../../components/LegalLinks';

WebBrowser.maybeCompleteAuthSession();

// Google's "G", cut from its sign-in button kit (developers.google.com/identity/branding-guidelines)
const GOOGLE_G = require('../../assets/google-g.png');

type Provider = 'apple' | 'google';

/**
 * Signs in through the provider's web page. Web leaves for it here and comes back to
 * /auth/callback. Native opens an in-app browser and gets the redirect URL back, carrying a
 * one-time code (PKCE) or an error.
 */
async function signInWithOAuth(provider: Provider): Promise<void> {
  const redirectTo = Platform.OS === 'web'
    ? window.location.origin + '/auth/callback'
    : Linking.createURL('auth/callback');

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: Platform.OS !== 'web',
    },
  });
  if (error) throw error;

  if (Platform.OS === 'web' || !data.url) return;
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return; // cancelled or dismissed

  const { queryParams } = Linking.parse(result.url);
  const code = typeof queryParams?.code === 'string' ? queryParams.code : null;
  if (!code) {
    const description = queryParams?.error_description ?? queryParams?.error;
    throw new Error(typeof description === 'string' ? description : 'Sign-in did not complete.');
  }
  const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
  if (sessionError) throw sessionError;
}

export default function LoginScreen() {
  const [error, setError] = useState<string | null>(null);

  // Apple: on iPhone the system's Apple sheet, on the website Apple's sign-in page. Not on
  // Android, which has no native build yet (Android users use the website).
  async function signIn(provider: Provider) {
    setError(null);
    try {
      if (provider === 'apple' && Platform.OS === 'ios') await signInWithApple();
      else await signInWithOAuth(provider);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in did not complete.');
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

        {/* Apple's guidelines: its button comes first, at least as prominent as the others */}
        {Platform.OS === 'ios' ? (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={12}
            // The system button sizes its own text, but needs an explicit height
            style={styles.appleButton}
            onPress={() => signIn('apple')}
          />
        ) : Platform.OS === 'web' ? (
          <TouchableOpacity
            style={[styles.button, styles.webAppleButton]}
            onPress={() => signIn('apple')}
            activeOpacity={0.85}
            role="button"
          >
            <AppleIcon size={18} color={colors.surface} />
            <Text style={styles.buttonText}>Continue with Apple</Text>
          </TouchableOpacity>
        ) : null}
        {/* Google's guidelines: its own "G" on white, gray, or dark, never on a brand color */}
        <TouchableOpacity
          style={[styles.button, styles.googleButton]}
          onPress={() => signIn('google')}
          activeOpacity={0.85}
          role="button"
        >
          <Image source={GOOGLE_G} style={styles.googleLogo} aria-hidden />
          <Text style={[styles.buttonText, styles.googleButtonText]}>Continue with Google</Text>
        </TouchableOpacity>
        {error ? <Text style={styles.error} role="alert">{error}</Text> : null}
        <SignInConsent />
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
  appleButton: { width: '100%', height: 50, marginBottom: 12 },
  webAppleButton: {
    backgroundColor: colors.apple,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  googleButton: {
    backgroundColor: colors.surface,
    paddingVertical: 12, // the border and the 20pt logo make up the difference to the Apple button
    borderWidth: 1,
    borderColor: colors.googleBorder,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  googleLogo: { width: 20, height: 20 },
  googleButtonText: { color: colors.googleText },
  buttonText: { color: colors.surface, fontSize: 16, fontWeight: '600' },
  error: { color: colors.error, fontSize: 14, marginTop: 16, textAlign: 'center' },
});
