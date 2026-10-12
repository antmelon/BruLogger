import { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Brew, Coffee } from '../../types';
import { useBrews, useCoffees } from '../../lib/brewQueries';
import { coffeeStats, daysAgo, daysSinceRoast, groupCoffees } from '../../lib/coffeeStats';
import { coffeeCardLabel } from '../../lib/a11y';
import { colors, shadows } from '../../lib/theme';
import { BagIcon } from '../../components/icons';

const NO_BREWS: Brew[] = [];
const NO_COFFEES: Coffee[] = [];

function CoffeeCard({ coffee, brews, onPress }: { coffee: Coffee; brews: Brew[]; onPress: () => void }) {
  const stats = coffeeStats(coffee, brews);
  const days = daysSinceRoast(coffee.roast_date);
  const finishedOn = coffee.finished_at
    ? new Date(coffee.finished_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;
  const facts = [
    days !== null && `Roasted ${daysAgo(days)}`,
    stats.brewCount ? `${stats.brewCount} ${stats.brewCount === 1 ? 'brew' : 'brews'}` : 'No brews yet',
    stats.avgRating && `★ ${stats.avgRating.toFixed(1)}`,
    finishedOn ? `Finished ${finishedOn}` : stats.gramsLeft !== null && `${Math.round(stats.gramsLeft)} g left`,
  ].filter(Boolean).join(' · ');

  return (
    <TouchableOpacity
      style={[styles.card, coffee.finished_at && styles.cardFinished]}
      onPress={onPress}
      activeOpacity={0.8}
      role="button"
      aria-label={coffeeCardLabel(coffee, stats, days)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitles}>
          <Text style={styles.coffeeName}>{coffee.name}</Text>
          {coffee.roaster ? <Text style={styles.roaster}>{coffee.roaster}</Text> : null}
        </View>
        {!coffee.finished_at && stats.runningLow ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Running low</Text>
          </View>
        ) : null}
      </View>
      {coffee.roast_level || coffee.origin ? (
        <View style={styles.tags}>
          {[coffee.roast_level, coffee.origin].filter(Boolean).map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      ) : null}
      <Text style={styles.facts}>{facts}</Text>
    </TouchableOpacity>
  );
}

export default function CoffeesScreen() {
  const router = useRouter();
  const coffeesQuery = useCoffees();
  const brewsQuery = useBrews();
  const coffees = coffeesQuery.data ?? NO_COFFEES;
  const brews = brewsQuery.data ?? NO_BREWS;
  const { open, finished } = useMemo(() => groupCoffees(coffees, brews), [coffees, brews]);
  const [showFinished, setShowFinished] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    setRefreshing(true);
    await Promise.all([coffeesQuery.refetch(), brewsQuery.refetch()]);
    setRefreshing(false);
  }

  if (coffeesQuery.isPending) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const loadError = coffeesQuery.isError && !coffeesQuery.data;
  const openCoffee = (c: Coffee) => router.push(`/coffee/${c.id}`);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      >
        {coffees.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              {loadError ? null : <BagIcon size={48} color={colors.iconFaint} strokeWidth={1.25} />}
            </View>
            <Text style={styles.emptyTitle}>{loadError ? 'Could not load coffees' : 'No coffees yet'}</Text>
            <Text style={styles.emptyText}>
              {loadError
                ? 'Pull down to retry.'
                : 'Add the bag you’re brewing now. Coffees you log brews of show up here too.'}
            </Text>
          </View>
        ) : (
          <>
            {open.length > 0 ? (
              <Text style={styles.sectionTitle} role="heading">In Use</Text>
            ) : null}
            {open.map((c) => <CoffeeCard key={c.id} coffee={c} brews={brews} onPress={() => openCoffee(c)} />)}

            {finished.length > 0 ? (
              <TouchableOpacity
                style={styles.finishedToggle}
                onPress={() => setShowFinished((v) => !v)}
                activeOpacity={0.7}
                role="button"
                aria-expanded={showFinished}
              >
                <Text style={styles.finishedToggleText}>
                  {showFinished ? 'Hide' : 'Show'} finished coffees ({finished.length})
                </Text>
              </TouchableOpacity>
            ) : null}
            {showFinished
              ? finished.map((c) => <CoffeeCard key={c.id} coffee={c} brews={brews} onPress={() => openCoffee(c)} />)
              : null}
          </>
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/coffee/new')}
        activeOpacity={0.85}
        role="button"
        aria-label="Add a coffee"
      >
        <Text style={styles.fabText}>+ Add Coffee</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  list: { padding: 16, paddingBottom: 100 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    ...shadows.card,
  },
  cardFinished: { backgroundColor: colors.surfaceWarm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  cardTitles: { flex: 1 },
  coffeeName: { fontSize: 16, fontWeight: '700', color: colors.textDark },
  roaster: { fontSize: 13, color: colors.textMedium, marginTop: 2 },
  badge: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 12, color: colors.surface, fontWeight: '700' },
  tags: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 8 },
  tag: { backgroundColor: colors.background, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontSize: 12, color: colors.primary, fontWeight: '600' },
  facts: { fontSize: 13, color: colors.textMedium },
  finishedToggle: { paddingVertical: 12, alignSelf: 'center' },
  finishedToggleText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 16 },
  emptyIcon: { marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.textDark, marginBottom: 8 },
  emptyText: { fontSize: 14, color: colors.textMedium, textAlign: 'center' },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    left: 24,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    ...shadows.button,
  },
  fabText: { color: colors.surface, fontSize: 16, fontWeight: '700' },
});
