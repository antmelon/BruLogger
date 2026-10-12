import { Brew, Coffee } from '../types';

// A coffee with every optional column unset; spread it and override what a test needs.
export const BASE_COFFEE: Coffee = {
  id: 'c1',
  user_id: 'u1',
  created_at: '2024-01-01T00:00:00Z',
  name: 'Test Coffee',
  roaster: null,
  origin: null,
  roast_level: null,
  varietal: null,
  processing_method: null,
  roaster_notes: null,
  roast_date: null,
  bag_size_g: null,
  finished_at: null,
};

// A brew of BASE_COFFEE with every optional column unset; spread it and override what a test
// needs (`coffee: { ...BASE_COFFEE, origin: 'Kenya' }` for coffee details).
export const BASE_BREW: Brew = {
  id: '1',
  user_id: 'u1',
  created_at: '2024-01-01T00:00:00Z',
  coffee_id: 'c1',
  coffee: BASE_COFFEE,
  brew_method: 'Pour Over',
  grind_size: null,
  water_temp_c: null,
  dose_g: null,
  yield_g: null,
  brew_time_s: null,
  flavor_notes: null,
  general_notes: null,
  rating: null,
  flavor_profile: null,
  photo_path: null,
  idempotency_key: null,
};
