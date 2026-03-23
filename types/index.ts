export type BrewMethod =
  | 'Pour Over'
  | 'French Press'
  | 'Espresso'
  | 'AeroPress'
  | 'Cold Brew'
  | 'Other';

export type RoastLevel = 'Light' | 'Medium-Light' | 'Medium' | 'Medium-Dark' | 'Dark';

export interface FlavorProfile {
  aromatics: number;   // 1–5
  acidity: number;     // 1–5
  sweetness: number;   // 1–5
  aftertaste: number;  // 1–5
  body: number;        // 1–5
}

export interface Brew {
  id: string;
  user_id: string;
  created_at: string;
  coffee_name: string;
  roaster?: string;
  origin?: string;
  roast_level?: RoastLevel;
  varietal?: string;
  processing_method?: string;
  brew_method: BrewMethod;
  grind_size?: string;
  water_temp_c?: number;
  dose_g?: number;
  yield_g?: number;
  brew_time_s?: number;
  flavor_notes?: string;
  general_notes?: string;
  rating?: number; // 1–5
  flavor_profile?: FlavorProfile;
  photo_url?: string;
}

export type BrewInsert = Omit<Brew, 'id' | 'user_id' | 'created_at'>;
