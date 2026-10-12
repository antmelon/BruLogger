import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, shadows } from '../lib/theme';
import { CoffeeIcon, StarIcon, SearchIcon } from './icons';
import { SignInButtons } from './SignInButtons';

// The app's first screen when signed out: what BruLogger does, and the sign-in buttons, on one
// screen. (The website's landing page in app/index.tsx is a longer marketing page with a separate
// sign-in page.) It scrolls only when it doesn't fit, at large text sizes.

const FEATURES = [
  { Icon: CoffeeIcon, title: 'Log every brew', description: 'Method, grind, dose, water and time' },
  { Icon: StarIcon, title: 'Rate and reflect', description: 'Stars, tasting notes and a flavor chart' },
  { Icon: SearchIcon, title: 'Find any brew', description: 'Search and filter by method, roast or rating' },
];

export function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.hero}>
            <View style={styles.iconWrapper}>
              <CoffeeIcon size={44} color={colors.primary} strokeWidth={1.5} />
            </View>
            <Text style={styles.appName} role="heading">BruLogger</Text>
            <Text style={styles.tagline}>Your personal coffee journal.</Text>
          </View>

          <View style={styles.features}>
            {FEATURES.map(({ Icon, title, description }) => (
              <View key={title} style={styles.feature}>
                <View style={styles.featureIcon} aria-hidden>
                  <Icon size={22} color={colors.primary} strokeWidth={1.5} />
                </View>
                <View style={styles.featureText}>
                  <Text style={styles.featureTitle}>{title}</Text>
                  <Text style={styles.featureDescription}>{description}</Text>
                </View>
              </View>
            ))}
          </View>

          <SignInButtons />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  content: { width: '100%', maxWidth: 400 },
  hero: { alignItems: 'center', marginBottom: 32 },
  iconWrapper: {
    backgroundColor: colors.surfaceIcon,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    ...shadows.icon,
  },
  appName: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.textDark,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  tagline: { fontSize: 18, fontWeight: '600', color: colors.primary, textAlign: 'center' },
  features: { gap: 16, marginBottom: 32 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  featureIcon: {
    backgroundColor: colors.surfaceIcon,
    borderRadius: 12,
    padding: 10,
  },
  featureText: { flex: 1 },
  featureTitle: { fontSize: 16, fontWeight: '700', color: colors.textDark },
  featureDescription: { fontSize: 14, color: colors.textMedium, marginTop: 2 },
});
