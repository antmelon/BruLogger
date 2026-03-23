import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, TextInput, ScrollView,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Brew, BrewMethod, RoastLevel } from '../../types';
import { getBrews } from '../../lib/brews';
import StarRating from '../../components/StarRating';
import { CoffeeIcon, SearchIcon } from '../../components/icons';

const BREW_METHODS: BrewMethod[] = ['Pour Over', 'French Press', 'Espresso', 'AeroPress', 'Cold Brew', 'Other'];
const ROAST_LEVELS: RoastLevel[] = ['Light', 'Medium-Light', 'Medium', 'Medium-Dark', 'Dark'];

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

function FilterPill<T extends string>({
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

  const [query, setQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<BrewMethod | null>(null);
  const [roastFilter, setRoastFilter] = useState<RoastLevel | null>(null);
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'top_rated' | 'name'>('newest');
  const [showFilters, setShowFilters] = useState(false);

  async function loadBrews() {
    try {
      const data = await getBrews();
      setBrews(data);
    } catch (e) {
      // silently fail — user will see empty state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { loadBrews(); }, []));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result = brews.filter((b) => {
      if (q) {
        const searchable = [b.coffee_name, b.roaster, b.origin, b.flavor_notes]
          .filter(Boolean).join(' ').toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      if (methodFilter && b.brew_method !== methodFilter) return false;
      if (roastFilter && b.roast_level !== roastFilter) return false;
      if (ratingFilter && (b.rating ?? 0) < ratingFilter) return false;
      return true;
    });

    return result.sort((a, b) => {
      switch (sortBy) {
        case 'oldest': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'top_rated': return (b.rating ?? 0) - (a.rating ?? 0);
        case 'name': return a.coffee_name.localeCompare(b.coffee_name);
        default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
  }, [brews, query, methodFilter, roastFilter, ratingFilter, sortBy]);

  const hasActiveFilters = methodFilter || roastFilter || ratingFilter || sortBy !== 'newest';

  function clearFilters() {
    setMethodFilter(null);
    setRoastFilter(null);
    setRatingFilter(null);
    setSortBy('newest');
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#8B5A2B" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <SearchIcon size={16} color="#B0A090" />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search brews..."
            placeholderTextColor="#B0A090"
            clearButtonMode="while-editing"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.clearText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.filterToggle, hasActiveFilters && styles.filterToggleActive]}
          onPress={() => setShowFilters((v) => !v)}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterToggleText, hasActiveFilters && styles.filterToggleTextActive]}>
            {hasActiveFilters ? `Filters (${[methodFilter, roastFilter, ratingFilter].filter(Boolean).length})` : 'Filter'}
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
                  onPress={() => setSortBy(val)}
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
                  active={methodFilter === m}
                  onPress={() => setMethodFilter(methodFilter === m ? null : m)}
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
                  active={roastFilter === r}
                  onPress={() => setRoastFilter(roastFilter === r ? null : r)}
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
                  active={ratingFilter === n}
                  onPress={() => setRatingFilter(ratingFilter === n ? null : n)}
                />
              ))}
            </View>
          </View>

          {hasActiveFilters && (
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadBrews(); }} tintColor="#8B5A2B" />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              {brews.length === 0
                ? <CoffeeIcon size={48} color="#C4B8A8" strokeWidth={1.25} />
                : <SearchIcon size={48} color="#C4B8A8" strokeWidth={1.25} />}
            </View>
            <Text style={styles.emptyTitle}>
              {brews.length === 0 ? 'No brews yet' : 'No results'}
            </Text>
            <Text style={styles.emptyText}>
              {brews.length === 0
                ? 'Tap the button below to log your first brew.'
                : 'Try adjusting your search or filters.'}
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
  container: { flex: 1, backgroundColor: '#F5EFE6' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5EFE6' },

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
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
searchInput: { flex: 1, fontSize: 15, color: '#4A3728' },
  clearText: { fontSize: 13, color: '#B0A090' },
  filterToggle: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: '#E8DFCF',
  },
  filterToggleActive: { backgroundColor: '#8B5A2B', borderColor: '#8B5A2B' },
  filterToggleText: { fontSize: 14, fontWeight: '600', color: '#8C7B6E' },
  filterToggleTextActive: { color: '#FFFFFF' },

  filterPanel: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  filterSection: { marginBottom: 12 },
  filterLabel: { fontSize: 11, fontWeight: '700', color: '#8B5A2B', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  pillRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  filterPill: {
    borderWidth: 1.5,
    borderColor: '#D4C5A9',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  filterPillActive: { backgroundColor: '#8B5A2B', borderColor: '#8B5A2B' },
  filterPillText: { fontSize: 13, color: '#8C7B6E', fontWeight: '500' },
  filterPillTextActive: { color: '#FFFFFF', fontWeight: '700' },
  clearFilters: { alignSelf: 'flex-end', paddingTop: 4 },
  clearFiltersText: { fontSize: 13, color: '#CC4444', fontWeight: '600' },

  list: { padding: 16, paddingBottom: 100 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardTitles: { flex: 1 },
  coffeeName: { fontSize: 16, fontWeight: '700', color: '#4A3728' },
  roaster: { fontSize: 13, color: '#8C7B6E', marginTop: 2 },
  date: { fontSize: 12, color: '#B0A090', marginLeft: 8 },
  tags: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 6 },
  tag: { backgroundColor: '#F5EFE6', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontSize: 12, color: '#8B5A2B', fontWeight: '600' },
  flavorNotes: { fontSize: 13, color: '#6B5B4E', fontStyle: 'italic', marginTop: 4 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#4A3728', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#8C7B6E', textAlign: 'center' },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    left: 24,
    backgroundColor: '#8B5A2B',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#8B5A2B',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
