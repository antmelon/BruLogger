import { Brew, FlavorProfile } from '../types';

// What screen readers say for things that are only drawn: star ratings and the flavor radar.

/** A rating as spoken, e.g. "4.5 out of 5 stars". 0 and null both mean unrated. */
export function ratingLabel(rating: number | null): string {
  return rating ? `${rating} out of 5 stars` : 'Not rated';
}

/**
 * The rating after one swipe up/down (VoiceOver, TalkBack) or arrow key: half a star at a time,
 * from 1 to 5, and below 1 it's cleared (0). Unrated starts at 1, the lowest rating a tap gives.
 */
export function stepRating(rating: number, direction: 'increment' | 'decrement'): number {
  if (direction === 'increment') return rating < 1 ? 1 : Math.min(5, rating + 0.5);
  return rating <= 1 ? 0 : rating - 0.5;
}

const AXES: (keyof FlavorProfile)[] = ['aromatics', 'acidity', 'sweetness', 'aftertaste', 'body'];

/** The radar chart in words, axes in the chart's order. Averages are rounded to one decimal. */
export function flavorProfileLabel(profile: FlavorProfile): string {
  const scores = AXES.map((axis) => `${axis} ${Math.round(profile[axis] * 10) / 10}`);
  return `Flavor profile, out of 5: ${scores.join(', ')}`;
}

/** A brew card in My Brews, read as one item: what's on the card, the date last. */
export function brewCardLabel(brew: Brew, date: string): string {
  return [
    brew.coffee_name,
    brew.roaster,
    brew.brew_method,
    brew.roast_level && `${brew.roast_level} roast`,
    brew.rating && ratingLabel(brew.rating),
    brew.flavor_notes,
    date,
  ]
    .filter(Boolean)
    .join(', ');
}

/** The Analytics rating trend line in words: the ratings it plots, oldest first. */
export function ratingTrendLabel(ratings: number[]): string {
  return `Your last ${ratings.length} ratings, oldest first: ${ratings.join(', ')}`;
}
