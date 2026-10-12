import { supabase } from './supabase';
import { Coffee, CoffeeInsert } from '../types';

// Data access for coffees (bags), alongside lib/brews.ts. Screens use the hooks in
// lib/brewQueries.ts instead of calling these directly.

export async function getCoffees(): Promise<Coffee[]> {
  const { data, error } = await supabase
    .from('coffees')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createCoffee(coffee: CoffeeInsert): Promise<Coffee> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('coffees')
    .insert({ ...coffee, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCoffee(id: string, coffee: Partial<CoffeeInsert>): Promise<Coffee> {
  const { data, error } = await supabase
    .from('coffees')
    .update(coffee)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

const FOREIGN_KEY_VIOLATION = '23503';

/** Fails for a coffee that still has brews (the database refuses); screens offer it only without. */
export async function deleteCoffee(id: string): Promise<void> {
  const { error } = await supabase
    .from('coffees')
    .delete()
    .eq('id', id);

  if (error?.code === FOREIGN_KEY_VIOLATION) {
    throw new Error('This coffee has brews, so it can’t be deleted. Mark it as finished instead.');
  }
  if (error) throw error;
}
