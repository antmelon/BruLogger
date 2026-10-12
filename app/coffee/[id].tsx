import { useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Brew } from '../../types';
import { useBrews, useCoffees, useDeleteCoffee, useUpdateCoffee } from '../../lib/brewQueries';
import { coffeeStats, daysAgo, daysSinceRoast, formatRoastDate } from '../../lib/coffeeStats';
import { ratingLabel } from '../../lib/a11y';
import { colors, shadows } from '../../lib/theme';
import StarRating from '../../components/StarRating';

const NO_BREWS: Brew[] = [];

/** A label and value, read together. */
function InfoRow({ label, value, spoken }: { label: string; value: string; spoken?: string }) {
  return (
    <View style={styles.infoRow} accessible aria-label={`${label}: ${spoken ?? value}`}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function Tile({ value, label, spoken }: { value: string; label: string; spoken: string }) {
  return (
    <View style={styles.tile} accessible aria-label={spoken}>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

function showMessage(title: string, message: string) {
  if (Platform.OS === 'web') window.alert(message);
  else Alert.alert(title, message);
}

export default function CoffeeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: coffees, isPending, isError } = useCoffees();
  const { data: brews = NO_BREWS } = useBrews();
  const updateMutation = useUpdateCoffee();
  const deleteMutation = useDeleteCoffee();
  const coffee = coffees?.find((c) => c.id === id);
  const ownBrews = useMemo(
    () => brews
      .filter((b) => b.coffee_id === id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [brews, id],
  );

  if (isPending) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!coffee) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{isError ? 'Failed to load coffee.' : 'Coffee not found.'}</Text>
      </View>
    );
  }

  const stats = coffeeStats(coffee, brews);
  const days = daysSinceRoast(coffee.roast_date);
  const finishedOn = coffee.finished_at
    ? new Date(coffee.finished_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  async function setFinished(finished: boolean) {
    try {
      await updateMutation.mutateAsync({ id, coffee: { finished_at: finished ? new Date().toISOString() : null } });
    } catch {
      showMessage('Not saved', 'Could not update this coffee. Please try again.');
    }
  }

  async function performDelete() {
    try {
      await deleteMutation.mutateAsync(id);
    } catch (e: unknown) {
      showMessage('Not deleted', e instanceof Error ? e.message : 'Could not delete this coffee. Please try again.');
      return;
    }
    router.replace('/(tabs)/coffees');
  }

  function confirmDelete() {
    if (Platform.OS === 'web') {
      if (window.confirm('Delete this coffee?')) performDelete();
    } else {
      Alert.alert('Delete Coffee', 'Delete this coffee?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: performDelete },
      ]);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.coffeeName} role="heading">{coffee.name}</Text>
        {coffee.roaster ? <Text style={styles.roaster}>{coffee.roaster}</Text> : null}
        <View style={styles.statusRow}>
          {finishedOn ? (
            <Text style={styles.status}>Finished {finishedOn}</Text>
          ) : stats.runningLow ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Running low</Text>
            </View>
          ) : (
            <Text style={styles.status}>In use</Text>
          )}
        </View>
      </View>

      {/* Numbers */}
      <View style={styles.tilesRow}>
        <Tile
          value={String(stats.brewCount)}
          label={stats.brewCount === 1 ? 'Brew' : 'Brews'}
          spoken={`${stats.brewCount} ${stats.brewCount === 1 ? 'brew' : 'brews'}`}
        />
        <Tile
          value={stats.avgRating ? stats.avgRating.toFixed(1) : '—'}
          label="Avg Rating"
          spoken={`Average rating: ${stats.avgRating ? ratingLabel(Math.round(stats.avgRating * 10) / 10) : 'none yet'}`}
        />
        <Tile
          value={stats.gramsLeft !== null ? `${Math.round(stats.gramsLeft)} g` : '—'}
          label="Left"
          spoken={stats.gramsLeft !== null
            ? `${Math.round(stats.gramsLeft)} grams left of ${coffee.bag_size_g}`
            : 'Grams left: add a bag size to see it'}
        />
      </View>

      {/* Actions, above the details and brews so a long history doesn't push them away */}
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => router.push(`/brew/new?coffee=${id}`)}
        activeOpacity={0.85}
        role="button"
        aria-label={`Log a brew of ${coffee.name}`}
      >
        <Text style={styles.primaryButtonText}>Log a Brew</Text>
      </TouchableOpacity>
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push(`/coffee/edit/${id}`)}
          activeOpacity={0.85}
          role="button"
          aria-label="Edit coffee"
        >
          <Text style={styles.secondaryButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => setFinished(!coffee.finished_at)}
          disabled={updateMutation.isPending}
          activeOpacity={0.85}
          role="button"
          aria-busy={updateMutation.isPending}
        >
          <Text style={styles.secondaryButtonText}>{coffee.finished_at ? 'Still Using It' : 'Mark as Finished'}</Text>
        </TouchableOpacity>
      </View>
      {/* Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle} role="heading">Details</Text>
        {coffee.origin ? <InfoRow label="Origin" value={coffee.origin} /> : null}
        {coffee.roast_level ? <InfoRow label="Roast" value={coffee.roast_level} /> : null}
        {coffee.varietal ? <InfoRow label="Varietal" value={coffee.varietal} /> : null}
        {coffee.processing_method ? <InfoRow label="Processing" value={coffee.processing_method} /> : null}
        {coffee.roast_date && days !== null ? (
          <InfoRow label="Roasted" value={`${formatRoastDate(coffee.roast_date)} (${daysAgo(days)})`} />
        ) : null}
        {coffee.bag_size_g ? (
          <InfoRow label="Bag Size" value={`${coffee.bag_size_g}g`} spoken={`${coffee.bag_size_g} grams`} />
        ) : null}
        {!coffee.origin && !coffee.roast_level && !coffee.varietal && !coffee.processing_method
          && !coffee.roast_date && !coffee.bag_size_g ? (
            <Text style={styles.hint}>Add the roast date and bag size to see how fresh it is and how much is left.</Text>
          ) : null}
      </View>

      {coffee.roaster_notes ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle} role="heading">Roaster&apos;s Tasting Notes</Text>
          <Text style={styles.notes}>{coffee.roaster_notes}</Text>
        </View>
      ) : null}

      {/* Its brews */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle} role="heading">Brews</Text>
        {ownBrews.length === 0 ? (
          <Text style={styles.hint}>No brews of this coffee yet.</Text>
        ) : ownBrews.map((b) => {
          const date = new Date(b.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          return (
            <TouchableOpacity
              key={b.id}
              style={styles.brewRow}
              onPress={() => router.push(`/brew/${b.id}`)}
              activeOpacity={0.7}
              role="button"
              aria-label={[date, b.brew_method, b.rating && ratingLabel(b.rating)].filter(Boolean).join(', ')}
            >
              <View style={styles.flex1}>
                <Text style={styles.brewMethod}>{b.brew_method}</Text>
                <Text style={styles.brewDate}>{date}</Text>
              </View>
              {b.rating ? <StarRating value={b.rating} readonly size={14} /> : null}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* The database keeps a coffee that has brews; finishing it is the way to put it away */}
      {stats.brewCount === 0 ? (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={confirmDelete}
          activeOpacity={0.85}
          role="button"
          aria-label="Delete coffee"
        >
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 48, gap: 16 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  errorText: { color: colors.textMedium, fontSize: 16 },
  flex1: { flex: 1 },

  header: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    ...shadows.card,
  },
  coffeeName: { fontSize: 22, fontWeight: '800', color: colors.textDark },
  roaster: { fontSize: 14, color: colors.textMedium, marginTop: 4 },
  statusRow: { flexDirection: 'row', marginTop: 10 },
  status: { fontSize: 13, color: colors.textLight },
  badge: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 12, color: colors.surface, fontWeight: '700' },

  tilesRow: { flexDirection: 'row', gap: 10 },
  tile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    ...shadows.card,
  },
  tileValue: { fontSize: 22, fontWeight: '800', color: colors.textDark, marginBottom: 4 },
  tileLabel: { fontSize: 11, color: colors.textMedium, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, textAlign: 'center' },

  section: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    ...shadows.card,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.background },
  infoLabel: { fontSize: 14, color: colors.textMedium },
  infoValue: { flexShrink: 1, fontSize: 14, color: colors.textDark, fontWeight: '600', textAlign: 'right' },
  hint: { fontSize: 14, color: colors.textLight },
  notes: { fontSize: 15, color: colors.textDark, lineHeight: 22 },

  brewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  brewMethod: { fontSize: 15, fontWeight: '600', color: colors.textDark },
  brewDate: { fontSize: 13, color: colors.textLight, marginTop: 2 },

  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    ...shadows.button,
  },
  primaryButtonText: { color: colors.surface, fontSize: 15, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 12 },
  secondaryButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: { color: colors.primary, fontSize: 15, fontWeight: '700' },
  deleteButton: {
    borderWidth: 1.5,
    borderColor: colors.error,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteButtonText: { color: colors.error, fontSize: 15, fontWeight: '600' },
});
