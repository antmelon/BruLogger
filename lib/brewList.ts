import { Brew, BrewMethod, RoastLevel } from '../types';

// Search, filter and sort for the My Brews list. All client-side: the list holds every brew.

export type SortBy = 'newest' | 'oldest' | 'top_rated' | 'name';

export interface BrewFilters {
  query: string;
  method: BrewMethod | null;
  roast: RoastLevel | null;
  minRating: number | null;
  sortBy: SortBy;
}

export const DEFAULT_FILTERS: BrewFilters = {
  query: '', method: null, roast: null, minRating: null, sortBy: 'newest',
};

export function filterBrews(brews: Brew[], filters: BrewFilters): Brew[] {
  const q = filters.query.trim().toLowerCase();
  const result = brews.filter((b) => {
    if (q) {
      const searchable = [b.coffee_name, b.roaster, b.origin, b.flavor_notes]
        .filter(Boolean).join(' ').toLowerCase();
      if (!searchable.includes(q)) return false;
    }
    if (filters.method && b.brew_method !== filters.method) return false;
    if (filters.roast && b.roast_level !== filters.roast) return false;
    if (filters.minRating && (b.rating ?? 0) < filters.minRating) return false;
    return true;
  });

  const time = (b: Brew) => new Date(b.created_at).getTime();
  return result.sort((a, b) => {
    switch (filters.sortBy) {
      case 'oldest': return time(a) - time(b);
      case 'top_rated': return (b.rating ?? 0) - (a.rating ?? 0);
      case 'name': return a.coffee_name.localeCompare(b.coffee_name);
      default: return time(b) - time(a);
    }
  });
}

/** Filters set in the filter panel (search text excluded), counting a non-default sort as one. */
export function activeFilterCount(filters: BrewFilters): number {
  return [filters.method, filters.roast, filters.minRating, filters.sortBy !== 'newest']
    .filter(Boolean).length;
}
