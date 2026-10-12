import { View, Text, StyleSheet } from 'react-native';
import { colors, shadows } from '../../lib/theme';
import { CoffeeIcon } from '../../components/icons';
import { SignInButtons } from '../../components/SignInButtons';

// The website's sign-in page (the landing page's "Get Started"), and where the auth gate sends a
// signed-out visitor who opens a page that needs an account, in the app too. The app's first
// screen has the same buttons (components/WelcomeScreen.tsx).

export default function LoginScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconWrapper}>
          <CoffeeIcon size={48} color={colors.textMedium} strokeWidth={1.5} />
        </View>
        <Text style={styles.title}>BruLogger</Text>
        <Text style={styles.title}>Coffee Journal</Text>
        <Text style={styles.subtitle}>Track, rate, and remember every brew.</Text>

        <SignInButtons />
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
});
