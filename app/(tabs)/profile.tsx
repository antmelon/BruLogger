import { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Alert, Platform,
} from 'react-native';
import { User } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { deleteAccount } from '../../lib/account';
import { useInstallPrompt } from '../../lib/install';
import { ratingLabel } from '../../lib/a11y';
import { brewStats } from '../../lib/analytics';
import { useBrews } from '../../lib/brewQueries';
import { colors, shadows } from '../../lib/theme';

function StatTile({ label, value, spoken }: { label: string; value: string; spoken?: string }) {
  return (
    <View style={styles.statTile} accessible aria-label={`${label}: ${spoken ?? (value === '—' ? 'none yet' : value)}`}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const [user, setUser] = useState<User | null>(null);
  const { data: brews, isPending } = useBrews();
  const stats = useMemo(() => (brews ? brewStats(brews) : null), [brews]);
  const [deleting, setDeleting] = useState(false);
  const { canInstall, install } = useInstallPrompt();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  // On success the session ends and the auth gate takes the user back to the landing page
  async function performDeleteAccount() {
    setDeleting(true);
    try {
      await deleteAccount();
    } catch {
      setDeleting(false);
      const message = 'Could not delete your account. Please try again.';
      if (Platform.OS === 'web') window.alert(message);
      else Alert.alert('Delete failed', message);
    }
  }

  function confirmDeleteAccount() {
    const count = brews?.length ?? 0;
    const message =
      `This permanently deletes your account, your ${count} ${count === 1 ? 'brew' : 'brews'} and their ` +
      "photos. It can't be undone.";
    if (Platform.OS === 'web') {
      if (window.confirm(`Delete your account?\n\n${message}`)) performDeleteAccount();
    } else {
      Alert.alert('Delete your account?', message, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete Account', style: 'destructive', onPress: performDeleteAccount },
      ]);
    }
  }

  if (isPending) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Identity card */}
      <View style={styles.card}>
        {/* Decorative, and sized to its circle, so it doesn't grow with the system text size */}
        <Text style={styles.avatar} aria-hidden allowFontScaling={false}>
          {user?.user_metadata?.name?.charAt(0)?.toUpperCase() ?? '?'}
        </Text>
        <Text style={styles.name} role="heading">{user?.user_metadata?.name ?? 'Coffee Lover'}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      {/* Stats */}
      {stats && (
        <View style={styles.statsCard}>
          <Text style={styles.sectionTitle} role="heading">Your Stats</Text>
          <View style={styles.statsGrid}>
            <StatTile label="Brews Logged" value={String(stats.total)} />
            <StatTile
              label="Avg Rating"
              value={stats.avgRating ? `${'★'.repeat(Math.round(stats.avgRating))} ${stats.avgRating.toFixed(1)}` : '—'}
              spoken={ratingLabel(stats.avgRating ? Number(stats.avgRating.toFixed(1)) : null)}
            />
            <StatTile label="Fav Method" value={stats.topMethod ?? '—'} />
            <StatTile label="Top Origin" value={stats.topOrigin ?? '—'} />
          </View>
        </View>
      )}

      {canInstall && (
        <TouchableOpacity style={styles.install} onPress={install} activeOpacity={0.85} role="button">
          <Text style={styles.installText}>Install the App</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.signOut} onPress={() => supabase.auth.signOut()} activeOpacity={0.85} role="button">
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.deleteAccount}
        onPress={confirmDeleteAccount}
        disabled={deleting}
        activeOpacity={0.85}
        role="button"
        aria-label="Delete account"
        aria-busy={deleting}
      >
        {deleting
          ? <ActivityIndicator color={colors.error} />
          : <Text style={styles.deleteAccountText}>Delete Account</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    ...shadows.card,
    marginBottom: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    color: colors.surface,
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 72,
    marginBottom: 16,
    overflow: 'hidden',
  },
  name: { fontSize: 20, fontWeight: '700', color: colors.textDark, marginBottom: 4 },
  email: { fontSize: 14, color: colors.textMedium },

  statsCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    ...shadows.card,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statTile: {
    flex: 1,
    minWidth: '40%',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 14,
  },
  statValue: { fontSize: 18, fontWeight: '800', color: colors.textDark, marginBottom: 4 },
  statLabel: { fontSize: 12, color: colors.textMedium, fontWeight: '500' },

  install: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
    ...shadows.button,
  },
  installText: { color: colors.surface, fontSize: 15, fontWeight: '600' },

  signOut: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  signOutText: { color: colors.primary, fontSize: 15, fontWeight: '600' },

  deleteAccount: {
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: colors.error,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteAccountText: { color: colors.error, fontSize: 15, fontWeight: '600' },
});
