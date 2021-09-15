import { uniq } from './array.utils';

describe('uniq', () => {
  it('should make array unique', () => {
    expect(uniq([1, 2, 2, 3])).toEqual([1, 2, 3]);
  });

  it('should not change unique array', () => {
    expect(uniq([1, 2, 3])).toEqual([1, 2, 3]);
  });
});
