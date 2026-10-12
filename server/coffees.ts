import type { Coffee } from '../types';
import type { CoffeeDetails, CoffeeRef } from '../lib/brewInput';
import { matchCoffee, missingDetails } from '../lib/coffeeMatch';
import { Context, error, reportError } from './api';

// The coffee side of the brews API (api/brews/). The bot names a brew's coffee by its details,
// so these find the user's matching coffee or save a new one.

/** How brews are read: with their coffee, as in the app. */
export const WITH_COFFEE = '*, coffee:coffees(*)';

/** An existing coffee, or the details of one that saving would create. */
export type FoundCoffee = { coffee: Coffee; details?: CoffeeDetails } | { coffee: null; details: CoffeeDetails };

const failed = () => error(500, 'Failed to save the coffee.');
const norm = (s: string | null | undefined) => (s ?? '').trim().toLowerCase();

/** The coffee a brew refers to, without writing anything. A 400 Response for an unknown coffee_id. */
export async function findCoffee(ctx: Context, ref: CoffeeRef): Promise<FoundCoffee | Response> {
  if ('id' in ref) {
    const { data, error: dbError } = await ctx.db
      .from('coffees').select('*').eq('id', ref.id).eq('user_id', ctx.userId).maybeSingle();
    if (dbError) {
      await reportError('api coffee lookup', dbError);
      return error(500, 'Failed to load the coffee.');
    }
    return data ? { coffee: data } : error(400, 'Invalid brew.', ['No coffee with that coffee_id.']);
  }

  const { data, error: dbError } = await ctx.db.from('coffees').select('*').eq('user_id', ctx.userId);
  if (dbError) {
    await reportError('api coffees lookup', dbError);
    return error(500, 'Failed to load coffees.');
  }
  const coffee = matchCoffee(data ?? [], ref.details);
  return coffee ? { coffee, details: ref.details } : { coffee: null, details: ref.details };
}

/**
 * Saves what findCoffee found: fills in the details a matched coffee was missing (never changing
 * one it has), or creates the new coffee. `created` says whether to discard it if the brew fails.
 */
export async function saveCoffee(ctx: Context, found: FoundCoffee): Promise<{ id: string; created: boolean } | Response> {
  if (found.coffee) {
    const fill = found.details ? missingDetails(found.coffee, found.details) : {};
    if (Object.keys(fill).length) {
      const { error: dbError } = await ctx.db
        .from('coffees').update(fill).eq('id', found.coffee.id).eq('user_id', ctx.userId);
      if (dbError) {
        await reportError('api coffee fill', dbError);
        return failed();
      }
    }
    return { id: found.coffee.id, created: false };
  }

  const { data, error: dbError } = await ctx.db
    .from('coffees')
    .insert({ ...found.details, name: found.details.name!, user_id: ctx.userId })
    .select()
    .single();
  if (dbError || !data) {
    await reportError('api coffee insert', dbError);
    return failed();
  }
  return { id: data.id, created: true };
}

/** Deletes a coffee saveCoffee just created, when the brew it was for couldn't be saved. */
export async function discardCoffee(ctx: Context, saved: { id: string; created: boolean }): Promise<void> {
  if (!saved.created) return;
  const { error: dbError } = await ctx.db.from('coffees').delete().eq('id', saved.id).eq('user_id', ctx.userId);
  if (dbError) await reportError('api coffee discard', dbError);
}

/**
 * A PATCH's coffee fields, for a brew of `current`. coffee_id, or a new name or roaster, moves the
 * brew to that coffee (found or created): returns its id. Any other detail edits `current`
 * itself, so every brew of it changes.
 */
export async function patchCoffee(
  ctx: Context, current: Coffee, ref: CoffeeRef,
): Promise<{ coffeeId?: string } | Response> {
  if ('id' in ref) {
    const found = await findCoffee(ctx, ref);
    return found instanceof Response ? found : { coffeeId: ref.id };
  }

  const { details } = ref;
  const name = details.name ?? current.name;
  const roaster = 'roaster' in details ? details.roaster ?? null : current.roaster;
  if (norm(name) === norm(current.name) && norm(roaster) === norm(current.roaster)) {
    const { error: dbError } = await ctx.db
      .from('coffees').update(details).eq('id', current.id).eq('user_id', ctx.userId);
    if (dbError) {
      await reportError('api coffee update', dbError);
      return failed();
    }
    return {};
  }

  const found = await findCoffee(ctx, { details: { ...details, name, roaster } });
  if (found instanceof Response) return found;
  const saved = await saveCoffee(ctx, found);
  return saved instanceof Response ? saved : { coffeeId: saved.id };
}
