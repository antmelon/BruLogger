import { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { User } from '@supabase/supabase-js';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { getBrews } from '../../lib/brews';
import { Brew } from '../../types';

interface Stats {
  total: number;
  avgRating: number | null;
  topMethod: string | null;
  topOrigin: string | null;
}

function computeStats(brews: Brew[]): Stats {
  if (brews.length === 0) return { total: 0, avgRating: null, topMethod: null, topOrigin: null };

  const rated = brews.filter((b) => b.rating);
  const avgRating = rated.length
    ? rated.reduce((sum, b) => sum + b.rating!, 0) / rated.length
    : null;

  const methodCounts: Record<string, number> = {};
  for (const b of brews) methodCounts[b.brew_method] = (methodCounts[b.brew_method] ?? 0) + 1;
  const topMethod = Object.entries(methodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const originCounts: Record<string, number> = {};
  for (const b of brews) {
    if (b.origin) originCounts[b.origin] = (originCounts[b.origin] ?? 0) + 1;
  }
  const topOrigin = Object.entries(originCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return { total: brews.length, avgRating, topMethod, topOrigin };
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  useFocusEffect(useCallback(() => {
    getBrews()
      .then((brews) => setStats(computeStats(brews)))
      .finally(() => setLoading(false));
  }, []));

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#8B5A2B" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Identity card */}
      <View style={styles.card}>
        <Text style={styles.avatar}>
          {user?.user_metadata?.name?.charAt(0)?.toUpperCase() ?? '?'}
        </Text>
        <Text style={styles.name}>{user?.user_metadata?.name ?? 'Coffee Lover'}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      {/* Stats */}
      {stats && (
        <View style={styles.statsCard}>
          <Text style={styles.sectionTitle}>Your Stats</Text>
          <View style={styles.statsGrid}>
            <StatTile label="Brews Logged" value={String(stats.total)} />
            <StatTile
              label="Avg Rating"
              value={stats.avgRating ? `${'★'.repeat(Math.round(stats.avgRating))} ${stats.avgRating.toFixed(1)}` : '—'}
            />
            <StatTile label="Fav Method" value={stats.topMethod ?? '—'} />
            <StatTile label="Top Origin" value={stats.topOrigin ?? '—'} />
          </View>
        </View>
      )}

      <TouchableOpacity style={styles.signOut} onPress={() => supabase.auth.signOut()} activeOpacity={0.85}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5EFE6' },
  content: { padding: 24 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5EFE6' },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    marginBottom: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#8B5A2B',
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 72,
    marginBottom: 16,
    overflow: 'hidden',
  },
  name: { fontSize: 20, fontWeight: '700', color: '#4A3728', marginBottom: 4 },
  email: { fontSize: 14, color: '#8C7B6E' },

  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8B5A2B',
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
    backgroundColor: '#F5EFE6',
    borderRadius: 12,
    padding: 14,
  },
  statValue: { fontSize: 18, fontWeight: '800', color: '#4A3728', marginBottom: 4 },
  statLabel: { fontSize: 12, color: '#8C7B6E', fontWeight: '500' },

  signOut: {
    borderWidth: 1.5,
    borderColor: '#8B5A2B',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  signOutText: { color: '#8B5A2B', fontSize: 15, fontWeight: '600' },
});
