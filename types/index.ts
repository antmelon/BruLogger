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
// those columns are narrowed here.
type BrewColumns = {
  brew_method: BrewMethod;
  roast_level: RoastLevel | null;
  flavor_profile: FlavorProfile | null;
};
type CoffeeColumns = { roast_level: RoastLevel | null };
type Override<T, U> = Omit<T, keyof U> & U;
type Tables = GeneratedDatabase['public']['Tables'];
type Narrow<Table extends { Row: unknown; Insert: unknown; Update: unknown }, Columns, Required extends keyof Columns = never> =
  Override<Table, {
    Row: Override<Table['Row'], Columns>;
    Insert: Override<Table['Insert'], Pick<Columns, Required> & Partial<Columns>>;
    Update: Override<Table['Update'], Partial<Columns>>;
  }>;

export type Database = Override<GeneratedDatabase, {
  public: Override<GeneratedDatabase['public'], {
    Tables: Override<Tables, {
      // Until step 2 of the coffees migration, the database copies coffee_name from the coffee
      brews: Override<Narrow<Tables['brews'], BrewColumns, 'brew_method'>, {
        Insert: Override<Narrow<Tables['brews'], BrewColumns, 'brew_method'>['Insert'], { coffee_name?: string }>;
      }>;
      coffees: Narrow<Tables['coffees'], CoffeeColumns>;
    }>;
  }>;
}>;

type BrewRow = Database['public']['Tables']['brews']['Row'];

/** A bag of coffee. Optional columns are null when unset. */
export type Coffee = Database['public']['Tables']['coffees']['Row'];

export type CoffeeInsert = Omit<Database['public']['Tables']['coffees']['Insert'], 'id' | 'user_id' | 'created_at'>;

/**
 * Brew columns that only copy the brew's coffee, kept in step by the database for app 1.0.0
 * until step 2 of the coffees migration drops them. The app reads `brew.coffee` instead.
 */
export type CopiedCoffeeColumn =
  'coffee_name' | 'roaster' | 'origin' | 'roast_level' | 'varietal' | 'processing_method';

/**
 * A brew as the app reads it, with its coffee. Optional columns are null when unset. Send null
 * (not undefined) to clear one on update.
 */
export type Brew = Omit<BrewRow, CopiedCoffeeColumn | 'coffee_id'> & { coffee_id: string; coffee: Coffee };

export type BrewInsert = Omit<
  Database['public']['Tables']['brews']['Insert'],
  'id' | 'user_id' | 'created_at' | CopiedCoffeeColumn | 'coffee_id' | 'idempotency_key'
> & { coffee_id: string };
