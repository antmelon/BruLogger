import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, shadows } from '../lib/theme';
import { CoffeeIcon, StarIcon, SearchIcon } from '../components/icons';

const FEATURES = [
  {
    Icon: CoffeeIcon,
    title: 'Log Every Brew',
    description: 'Record brew method, grind size, dose, water temp, and timing for every cup.',
  },
  {
    Icon: StarIcon,
    title: 'Rate & Reflect',
    description: 'Score each brew and capture tasting notes with a visual flavor radar chart.',
  },
  {
    Icon: SearchIcon,
    title: 'Search & Filter',
    description: 'Browse your entire brew history filtered by method, roast, rating, and more.',
  },
];

export default function LandingScreen() {
  const router = useRouter();

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.iconWrapper}>
          <CoffeeIcon size={56} color={colors.primary} strokeWidth={1.5} />
        </View>
        <Text style={styles.appName}>BruLogger</Text>
        <Text style={styles.tagline}>Your personal coffee journal.</Text>
        <Text style={styles.subTagline}>
          Track, rate, and remember every brew — from your morning pour over to an afternoon espresso.
        </Text>
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={() => router.push('/(auth)/login')}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaText}>Get Started — it&apos;s free</Text>
        </TouchableOpacity>
      </View>

      {/* Features */}
      <View style={styles.features}>
        {FEATURES.map((f) => (
          <View key={f.title} style={styles.featureCard}>
            <View style={styles.featureIconWrapper}>
              <f.Icon size={28} color={colors.primary} strokeWidth={1.5} />
            </View>
            <Text style={styles.featureTitle}>{f.title}</Text>
            <Text style={styles.featureDescription}>{f.description}</Text>
          </View>
        ))}
      </View>

      {/* Bottom CTA */}
      <View style={styles.bottomCta}>
        <Text style={styles.bottomCtaText}>Ready to start logging?</Text>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push('/(auth)/login')}
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryButtonText}>Sign in with Google</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>BruLogger — Coffee Journal</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  container: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 48,
  },

  hero: {
    alignItems: 'center',
    maxWidth: 560,
    width: '100%',
    marginBottom: 48,
  },
  iconWrapper: {
    backgroundColor: colors.surfaceIcon,
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    shadowColor: colors.primary,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  appName: {
    fontSize: 42,
    fontWeight: '800',
    color: colors.textDark,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 16,
  },
  subTagline: {
    fontSize: 16,
    color: colors.textMedium,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 36,
  },
  ctaButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 40,
    ...shadows.button,
  },
  ctaText: {
    color: colors.surface,
    fontSize: 17,
    fontWeight: '700',
  },

  features: {
    width: '100%',
    maxWidth: 700,
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
    marginBottom: 56,
  },
  featureCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    flex: Platform.OS === 'web' ? 1 : undefined,
    minWidth: Platform.OS === 'web' ? 180 : undefined,
    width: Platform.OS === 'web' ? undefined : '100%',
    alignItems: 'center',
    ...shadows.card,
  },
  featureIconWrapper: {
    backgroundColor: colors.surfaceIcon,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textDark,
    marginBottom: 8,
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: 14,
    color: colors.textMedium,
    textAlign: 'center',
    lineHeight: 20,
  },

  bottomCta: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingVertical: 40,
    paddingHorizontal: 32,
    maxWidth: 480,
    width: '100%',
    marginBottom: 40,
    ...shadows.raised,
  },
  bottomCtaText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textDark,
    marginBottom: 20,
  },
  secondaryButton: {
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 32,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },

  footer: {
    fontSize: 12,
    color: colors.textFaint,
  },
});
