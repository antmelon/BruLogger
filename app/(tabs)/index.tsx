import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, TextInput, ScrollView,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Brew, BREW_METHODS, ROAST_LEVELS } from '../../types';
import { colors, shadows } from '../../lib/theme';
import { getBrews } from '../../lib/brews';
import { activeFilterCount, BrewFilters, DEFAULT_FILTERS, filterBrews } from '../../lib/brewList';
import StarRating from '../../components/StarRating';
import { CoffeeIcon, SearchIcon } from '../../components/icons';

function BrewCard({ brew, onPress }: { brew: Brew; onPress: () => void }) {
  const date = new Date(brew.created_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitles}>
          <Text style={styles.coffeeName}>{brew.coffee_name}</Text>
          {brew.roaster ? <Text style={styles.roaster}>{brew.roaster}</Text> : null}
        </View>
        <Text style={styles.date}>{date}</Text>
      </View>

      <View style={styles.tags}>
        <View style={styles.tag}>
          <Text style={styles.tagText}>{brew.brew_method}</Text>
        </View>
        {brew.roast_level ? (
          <View style={styles.tag}>
            <Text style={styles.tagText}>{brew.roast_level}</Text>
          </View>
        ) : null}
      </View>

      {brew.flavor_notes ? (
        <Text style={styles.flavorNotes} numberOfLines={2}>{brew.flavor_notes}</Text>
      ) : null}

      {brew.rating ? (
        <View style={{ marginTop: 8 }}>
          <StarRating value={brew.rating} readonly size={16} />
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

function FilterPill({
  label, active, onPress,
}: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.filterPill, active && styles.filterPillActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function BrewsScreen() {
  const router = useRouter();
  const [brews, setBrews] = useState<Brew[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [filters, setFilters] = useState<BrewFilters>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const { query, method, roast, minRating, sortBy } = filters;

  function updateFilters(patch: Partial<BrewFilters>) {
    setFilters((f) => ({ ...f, ...patch }));
  }

  async function loadBrews() {
    try {
      const data = await getBrews();
      setBrews(data);
      setLoadError(null);
    } catch {
      setLoadError('Failed to load brews. Pull down to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { loadBrews(); }, []));

  const filtered = useMemo(() => filterBrews(brews, filters), [brews, filters]);
  const filterCount = activeFilterCount(filters);

  function clearFilters() {
    setFilters((f) => ({ ...DEFAULT_FILTERS, query: f.query }));
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <SearchIcon size={16} color={colors.textLight} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={(text) => updateFilters({ query: text })}
            placeholder="Search brews..."
            placeholderTextColor={colors.textLight}
            clearButtonMode="while-editing"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => updateFilters({ query: '' })} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.clearText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.filterToggle, filterCount > 0 && styles.filterToggleActive]}
          onPress={() => setShowFilters((v) => !v)}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterToggleText, filterCount > 0 && styles.filterToggleTextActive]}>
            {filterCount > 0 ? `Filters (${filterCount})` : 'Filter'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filter panel */}
      {showFilters && (
        <View style={styles.filterPanel}>
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Sort By</Text>
            <View style={styles.pillRow}>
              {([['newest', 'Newest'], ['oldest', 'Oldest'], ['top_rated', 'Top Rated'], ['name', 'Name A–Z']] as const).map(([val, label]) => (
                <FilterPill
                  key={val}
                  label={label}
                  active={sortBy === val}
                  onPress={() => updateFilters({ sortBy: val })}
                />
              ))}
            </View>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Brew Method</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
              {BREW_METHODS.map((m) => (
                <FilterPill
                  key={m}
                  label={m}
                  active={method === m}
                  onPress={() => updateFilters({ method: method === m ? null : m })}
                />
              ))}
            </ScrollView>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Roast Level</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
              {ROAST_LEVELS.map((r) => (
                <FilterPill
                  key={r}
                  label={r}
                  active={roast === r}
                  onPress={() => updateFilters({ roast: roast === r ? null : r })}
                />
              ))}
            </ScrollView>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Minimum Rating</Text>
            <View style={styles.pillRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <FilterPill
                  key={n}
                  label={'★'.repeat(n)}
                  active={minRating === n}
                  onPress={() => updateFilters({ minRating: minRating === n ? null : n })}
                />
              ))}
            </View>
          </View>

          {filterCount > 0 && (
            <TouchableOpacity onPress={clearFilters} style={styles.clearFilters}>
              <Text style={styles.clearFiltersText}>Clear all filters</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(b) => b.id}
        contentContainerStyle={styles.list}
        removeClippedSubviews
        initialNumToRender={10}
        maxToRenderPerBatch={20}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadBrews(); }} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              {loadError ? null : brews.length === 0
                ? <CoffeeIcon size={48} color={colors.textFaint} strokeWidth={1.25} />
                : <SearchIcon size={48} color={colors.textFaint} strokeWidth={1.25} />}
            </View>
            <Text style={styles.emptyTitle}>
              {loadError ? 'Could not load brews' : brews.length === 0 ? 'No brews yet' : 'No results'}
            </Text>
            <Text style={styles.emptyText}>
              {loadError ?? (brews.length === 0
                ? 'Tap the button below to log your first brew.'
                : 'Try adjusting your search or filters.')}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <BrewCard brew={item} onPress={() => router.push(`/brew/${item.id}`)} />
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/brew/new')} activeOpacity={0.85}>
        <Text style={styles.fabText}>+ Log Brew</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
    shadowColor: colors.shadow,
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.textDark },
  clearText: { fontSize: 13, color: colors.textLight },
  filterToggle: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  filterToggleActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterToggleText: { fontSize: 14, fontWeight: '600', color: colors.textMedium },
  filterToggleTextActive: { color: colors.surface },

  filterPanel: {
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    ...shadows.card,
  },
  filterSection: { marginBottom: 12 },
  filterLabel: { fontSize: 11, fontWeight: '700', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  pillRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  filterPill: {
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  filterPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterPillText: { fontSize: 13, color: colors.textMedium, fontWeight: '500' },
  filterPillTextActive: { color: colors.surface, fontWeight: '700' },
  clearFilters: { alignSelf: 'flex-end', paddingTop: 4 },
  clearFiltersText: { fontSize: 13, color: colors.error, fontWeight: '600' },

  list: { padding: 16, paddingBottom: 100 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    ...shadows.card,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardTitles: { flex: 1 },
  coffeeName: { fontSize: 16, fontWeight: '700', color: colors.textDark },
  roaster: { fontSize: 13, color: colors.textMedium, marginTop: 2 },
  date: { fontSize: 12, color: colors.textLight, marginLeft: 8 },
  tags: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 6 },
  tag: { backgroundColor: colors.background, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontSize: 12, color: colors.primary, fontWeight: '600' },
  flavorNotes: { fontSize: 13, color: colors.textMuted, fontStyle: 'italic', marginTop: 4 },
  empty: { alignItems: 'center', paddingTop: 80 },
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
