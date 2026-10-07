export type BrewMethod =
  | 'Pour Over'
  | 'French Press'
  | 'Espresso'
  | 'AeroPress'
  | 'Cold Brew'
  | 'Other';

export type RoastLevel = 'Light' | 'Medium-Light' | 'Medium' | 'Medium-Dark' | 'Dark';

export const BREW_METHODS: BrewMethod[] = [
  'Pour Over', 'French Press', 'Espresso', 'AeroPress', 'Cold Brew', 'Other',
];

export const ROAST_LEVELS: RoastLevel[] = ['Light', 'Medium-Light', 'Medium', 'Medium-Dark', 'Dark'];

export interface FlavorProfile {
  aromatics: number;   // 1–5
  acidity: number;     // 1–5
  sweetness: number;   // 1–5
  aftertaste: number;  // 1–5
  body: number;        // 1–5
}

// Optional columns are null when unset. Send null (not undefined) to clear one on update.
export interface Brew {
  id: string;
  user_id: string;
  created_at: string;
  coffee_name: string;
  roaster?: string | null;
  origin?: string | null;
  roast_level?: RoastLevel | null;
  varietal?: string | null;
  processing_method?: string | null;
  brew_method: BrewMethod;
  grind_size?: string | null;
  water_temp_c?: number | null;
  dose_g?: number | null;
  yield_g?: number | null;
  brew_time_s?: number | null;
  flavor_notes?: string | null;
  general_notes?: string | null;
  rating?: number | null; // 1–5
  flavor_profile?: FlavorProfile | null;
  photo_url?: string | null;
}

export type BrewInsert = Omit<Brew, 'id' | 'user_id' | 'created_at'>;
