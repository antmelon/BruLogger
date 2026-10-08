import { Brew } from '../types';

// A brew with every optional column unset; spread it and override what a test needs.
export const BASE_BREW: Brew = {
  id: '1',
  user_id: 'u1',
  created_at: '2024-01-01T00:00:00Z',
  coffee_name: 'Test Coffee',
  brew_method: 'Pour Over',
  roaster: null,
  origin: null,
  roast_level: null,
  varietal: null,
  processing_method: null,
  grind_size: null,
  water_temp_c: null,
  dose_g: null,
  yield_g: null,
  brew_time_s: null,
  flavor_notes: null,
  general_notes: null,
  rating: null,
  flavor_profile: null,
  photo_url: null,
};
