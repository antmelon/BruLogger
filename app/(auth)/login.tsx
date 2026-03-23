import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../../lib/supabase';
import { Platform } from 'react-native';
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
        const url = new URL(result.url);
        const code = url.searchParams.get('code');
        if (code) {
          await supabase.auth.exchangeCodeForSession(code);
        }
      }
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconWrapper}>
          <CoffeeIcon size={48} color="#9E8E7E" strokeWidth={1.5} />
        </View>
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
    backgroundColor: '#F5EFE6',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  iconWrapper: { marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '700', color: '#4A3728', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#8C7B6E', marginBottom: 32, textAlign: 'center' },
  button: {
    backgroundColor: '#8B5A2B',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
