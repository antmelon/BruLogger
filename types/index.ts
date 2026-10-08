import type { Database as GeneratedDatabase } from './database';

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

// types/database.ts is generated from the live schema (`npm run db:types`). Postgres only knows
// brew_method and roast_level as text with a check constraint and flavor_profile as jsonb, so
// those three columns are narrowed here.
type BrewColumns = {
  brew_method: BrewMethod;
  roast_level: RoastLevel | null;
  flavor_profile: FlavorProfile | null;
};
type Override<T, U> = Omit<T, keyof U> & U;
type BrewsTable = GeneratedDatabase['public']['Tables']['brews'];

export type Database = Override<GeneratedDatabase, {
  public: Override<GeneratedDatabase['public'], {
    Tables: {
      brews: Override<BrewsTable, {
        Row: Override<BrewsTable['Row'], BrewColumns>;
        Insert: Override<BrewsTable['Insert'], Pick<BrewColumns, 'brew_method'> & Partial<BrewColumns>>;
        Update: Override<BrewsTable['Update'], Partial<BrewColumns>>;
      }>;
    };
  }>;
}>;

// Optional columns are null when unset. Send null (not undefined) to clear one on update.
export type Brew = Database['public']['Tables']['brews']['Row'];

export type BrewInsert = Omit<Database['public']['Tables']['brews']['Insert'], 'id' | 'user_id' | 'created_at'>;
