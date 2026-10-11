import { brewCardLabel, flavorProfileLabel, ratingLabel, ratingTrendLabel, stepRating } from '../lib/a11y';
import { BASE_BREW } from './fixtures';

describe('ratingLabel', () => {
  it('says the rating out of five stars', () => {
    expect(ratingLabel(4.5)).toBe('4.5 out of 5 stars');
    expect(ratingLabel(3)).toBe('3 out of 5 stars');
  });

  it('says when a brew is not rated', () => {
    expect(ratingLabel(0)).toBe('Not rated');
    expect(ratingLabel(null)).toBe('Not rated');
  });
});

describe('stepRating', () => {
  it('moves by half a star', () => {
    expect(stepRating(3, 'increment')).toBe(3.5);
    expect(stepRating(3, 'decrement')).toBe(2.5);
  });

  it('starts an unrated brew at one star', () => {
    expect(stepRating(0, 'increment')).toBe(1);
  });

  it('clears the rating when stepping down from one star', () => {
    expect(stepRating(1, 'decrement')).toBe(0);
    expect(stepRating(0, 'decrement')).toBe(0);
  });

  it('stops at five stars', () => {
    expect(stepRating(5, 'increment')).toBe(5);
  });
});

describe('flavorProfileLabel', () => {
  it('reads out every axis of the radar chart', () => {
    expect(
      flavorProfileLabel({ aromatics: 4, acidity: 3.5, sweetness: 4, aftertaste: 3, body: 2.5 }),
    ).toBe('Flavor profile, out of 5: aromatics 4, acidity 3.5, sweetness 4, aftertaste 3, body 2.5');
  });

  it('rounds averaged scores to one decimal', () => {
    expect(
      flavorProfileLabel({ aromatics: 11 / 3, acidity: 3.25, sweetness: 4, aftertaste: 3, body: 2.5 }),
    ).toBe('Flavor profile, out of 5: aromatics 3.7, acidity 3.3, sweetness 4, aftertaste 3, body 2.5');
  });
});

describe('brewCardLabel', () => {
  it('reads a brew card as one sentence', () => {
    const brew = {
      ...BASE_BREW,
      coffee_name: 'Kenya AA Nyeri',
      roaster: 'Onyx',
      brew_method: 'AeroPress' as const,
      roast_level: 'Light' as const,
      flavor_notes: 'blackcurrant, tomato',
      rating: 4,
    };
    expect(brewCardLabel(brew, 'Oct 11, 2026')).toBe(
      'Kenya AA Nyeri, Onyx, AeroPress, Light roast, 4 out of 5 stars, blackcurrant, tomato, Oct 11, 2026',
    );
  });

  it('leaves out what the brew does not have', () => {
    const brew = { ...BASE_BREW, coffee_name: 'House Blend', brew_method: 'Espresso' as const };
    expect(brewCardLabel(brew, 'Oct 11, 2026')).toBe('House Blend, Espresso, Oct 11, 2026');
  });
});

describe('ratingTrendLabel', () => {
  it('reads the trend line as the ratings in order', () => {
    expect(ratingTrendLabel([4.5, 3.5, 4])).toBe('Your last 3 ratings, oldest first: 4.5, 3.5, 4');
  });
});
