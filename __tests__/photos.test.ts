import { resizeAction } from '../lib/photos';

describe('resizeAction', () => {
  it('limits the width of a landscape photo that is too large', () => {
    expect(resizeAction(4032, 3024, 1600)).toEqual({ width: 1600 });
  });

  it('limits the height of a portrait photo that is too large', () => {
    expect(resizeAction(3024, 4032, 1600)).toEqual({ height: 1600 });
  });

  it('leaves a photo that already fits alone instead of scaling it up', () => {
    expect(resizeAction(1280, 960, 1600)).toBeNull();
    expect(resizeAction(1600, 1600, 1600)).toBeNull();
  });
});
