import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../lib/theme';

function LegalLink({ to, children }: { to: '/privacy' | '/terms'; children: string }) {
  const router = useRouter();
  return (
    <Text style={styles.link} role="link" onPress={() => router.push(to)} suppressHighlighting>
      {children}
    </Text>
  );
}

/** "Privacy Policy · Terms of Service", for page footers. */
export function LegalLinks() {
  return (
    <View style={styles.row}>
      <LegalLink to="/privacy">Privacy Policy</LegalLink>
      <Text style={styles.text} aria-hidden>·</Text>
      <LegalLink to="/terms">Terms of Service</LegalLink>
    </View>
  );
}

/** The agreement line under the sign-in button. */
export function SignInConsent() {
  return (
    <Text style={[styles.text, styles.consent]}>
      By continuing, you agree to the <LegalLink to="/terms">Terms of Service</LegalLink> and{' '}
      <LegalLink to="/privacy">Privacy Policy</LegalLink>.
    </Text>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  text: { fontSize: 12, color: colors.textLight },
  consent: { textAlign: 'center', lineHeight: 18, marginTop: 16 },
  link: { fontSize: 12, color: colors.textLight, textDecorationLine: 'underline' },
});
