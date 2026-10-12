import { activeFilterCount, DEFAULT_FILTERS, filterBrews, SortBy } from '../lib/brewList';
import { Brew, Coffee } from '../types';
import { BASE_BREW, BASE_COFFEE } from './fixtures';

const coffee = (details: Partial<Coffee>): Coffee => ({ ...BASE_COFFEE, ...details });

describe('filterBrews', () => {
  it('searches the coffee name, roaster and origin and the flavor notes, ignoring case', () => {
    const brews: Brew[] = [
      { ...BASE_BREW, id: '1', coffee: coffee({ name: 'Guji Hambela' }) },
      { ...BASE_BREW, id: '2', coffee: coffee({ roaster: 'Onyx' }) },
      { ...BASE_BREW, id: '3', coffee: coffee({ origin: 'Kenya' }) },
      { ...BASE_BREW, id: '4', flavor_notes: 'blueberry, jasmine' },
      { ...BASE_BREW, id: '5', general_notes: 'blueberry guji kenya onyx' },
    ];
    const ids = (query: string) => filterBrews(brews, { ...DEFAULT_FILTERS, query }).map((b) => b.id);
    expect(ids('guji')).toEqual(['1']);
    expect(ids('ONYX')).toEqual(['2']);
    expect(ids('  kenya ')).toEqual(['3']);
    expect(ids('Jasmine')).toEqual(['4']);
  });

  it('filters by method, roast and minimum rating, treating unrated brews as below any minimum', () => {
    const brews: Brew[] = [
      { ...BASE_BREW, id: '1', brew_method: 'Espresso', coffee: coffee({ roast_level: 'Dark' }), rating: 4 },
      { ...BASE_BREW, id: '2', brew_method: 'Espresso', coffee: coffee({ roast_level: 'Light' }), rating: 4.5 },
      { ...BASE_BREW, id: '3', brew_method: 'Pour Over', coffee: coffee({ roast_level: 'Light' }), rating: 5 },
      { ...BASE_BREW, id: '4', brew_method: 'Espresso', coffee: coffee({ roast_level: 'Light' }), rating: null },
      { ...BASE_BREW, id: '5', brew_method: 'Espresso', coffee: coffee({ roast_level: 'Light' }), rating: 3.5 },
    ];
    const result = filterBrews(brews, {
      ...DEFAULT_FILTERS, method: 'Espresso', roast: 'Light', minRating: 4,
    });
    expect(result.map((b) => b.id)).toEqual(['2']);
  });

  it('sorts newest first by default, or oldest, top rated (unrated last) or by name', () => {
    const brews: Brew[] = [
      { ...BASE_BREW, id: 'a', coffee: coffee({ name: 'Bonga' }), created_at: '2026-01-02T00:00:00Z', rating: 3 },
      { ...BASE_BREW, id: 'b', coffee: coffee({ name: 'Aricha' }), created_at: '2026-01-03T00:00:00Z', rating: null },
      { ...BASE_BREW, id: 'c', coffee: coffee({ name: 'Chelbesa' }), created_at: '2026-01-01T00:00:00Z', rating: 4.5 },
    ];
    const ids = (sortBy: SortBy) => filterBrews(brews, { ...DEFAULT_FILTERS, sortBy }).map((b) => b.id);
    expect(ids('newest')).toEqual(['b', 'a', 'c']);
    expect(ids('oldest')).toEqual(['c', 'a', 'b']);
    expect(ids('top_rated')).toEqual(['c', 'a', 'b']);
    expect(ids('name')).toEqual(['b', 'a', 'c']);
  });
});

describe('activeFilterCount', () => {
  it('counts each filter and a non-default sort, but not the search text', () => {
    expect(activeFilterCount(DEFAULT_FILTERS)).toBe(0);
    expect(activeFilterCount({ ...DEFAULT_FILTERS, query: 'guji' })).toBe(0);
    expect(activeFilterCount({ ...DEFAULT_FILTERS, sortBy: 'name' })).toBe(1);
    expect(activeFilterCount({
      ...DEFAULT_FILTERS, method: 'Espresso', roast: 'Dark', minRating: 4, sortBy: 'oldest',
    })).toBe(4);
  });
});
