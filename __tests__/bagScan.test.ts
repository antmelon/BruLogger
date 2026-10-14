/**
 * @jest-environment node
 */
import { BagScan, parseBagSize, scanToCoffeeFields } from '../lib/bagScan';
import { BagScanSchema } from '../server/bagScan';
import { ROAST_LEVELS } from '../types';

describe('parseBagSize', () => {
  it('reads grams and kilograms', () => {
    expect(parseBagSize('250 g')).toBe(250);
    expect(parseBagSize('250g')).toBe(250);
    expect(parseBagSize('340 grams')).toBe(340);
    expect(parseBagSize('1 kg')).toBe(1000);
    expect(parseBagSize('0,5 kg')).toBe(500);
  });

  it('converts ounces and pounds to whole grams', () => {
    expect(parseBagSize('12 oz')).toBe(340);
    expect(parseBagSize('12oz')).toBe(340);
    expect(parseBagSize('NET WT 10 OZ')).toBe(283);
    expect(parseBagSize('1 lb')).toBe(454);
    expect(parseBagSize('2 lbs')).toBe(907);
  });

  it('takes the first weight when a bag prints two', () => {
    expect(parseBagSize('12 oz (340 g)')).toBe(340);
    expect(parseBagSize('250g / 8.8oz')).toBe(250);
  });

  it('is null without a believable weight', () => {
    expect(parseBagSize(null)).toBeNull();
    expect(parseBagSize('')).toBeNull();
    expect(parseBagSize('large')).toBeNull();
    expect(parseBagSize('2 g')).toBeNull();
    expect(parseBagSize('40 kg')).toBeNull();
  });
});

const EMPTY: BagScan = {
  is_coffee_bag: true, name: null, roaster: null, origin: null, roast_level: null, varietal: null,
  process: null, tasting_notes: null, roast_date: null, bag_size: null,
};
const TODAY = new Date(2026, 9, 14);

describe('scanToCoffeeFields', () => {
  it('turns what was read into the coffee form\'s fields', () => {
    expect(scanToCoffeeFields({
      ...EMPTY,
      name: ' Guji  Hambela ',
      roaster: 'Onyx Coffee Lab',
      origin: 'Ethiopia, Guji',
      roast_level: 'Light',
      varietal: 'Heirloom',
      process: 'Natural',
      tasting_notes: 'blueberry, jasmine, cocoa',
      roast_date: '2026-10-03',
      bag_size: '10 oz',
    }, TODAY)).toEqual({
      name: 'Guji Hambela',
      roaster: 'Onyx Coffee Lab',
      origin: 'Ethiopia, Guji',
      roastLevel: 'Light',
      varietal: 'Heirloom',
      processingMethod: 'Natural',
      roasterNotes: 'blueberry, jasmine, cocoa',
      roastDate: 'Oct 3, 2026',
      bagSize: '283',
    });
  });

  it('leaves out what the bag didn\'t show, so typed fields stay', () => {
    expect(scanToCoffeeFields({ ...EMPTY, name: 'House Blend', roaster: '  ' }, TODAY)).toEqual({ name: 'House Blend' });
    expect(scanToCoffeeFields(EMPTY, TODAY)).toEqual({});
  });

  it('drops a roast date that isn\'t a real past date', () => {
    for (const roast_date of ['2026-10-20', '2026-02-30', 'Oct 3', '2023-01-01']) {
      expect(scanToCoffeeFields({ ...EMPTY, roast_date }, TODAY)).toEqual({});
    }
    expect(scanToCoffeeFields({ ...EMPTY, roast_date: '2026-10-14' }, TODAY)).toEqual({ roastDate: 'Oct 14, 2026' });
  });

  it('drops a roast level the app doesn\'t have', () => {
    expect(scanToCoffeeFields({ ...EMPTY, roast_level: 'Espresso' as BagScan['roast_level'] }, TODAY)).toEqual({});
  });
});

describe('BagScanSchema', () => {
  it('offers the model exactly the app\'s roast levels', () => {
    expect(BagScanSchema.shape.roast_level.unwrap().options).toEqual([...ROAST_LEVELS]);
  });
});
