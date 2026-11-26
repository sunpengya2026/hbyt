import { expect, test ,describe, it} from 'vitest'
import { sum } from './sum'
test('adds 1 + 2 to equal 3', () => {
  expect(sum(1, 2)).toBe(3)
})

describe('sum', () => {
  test('should return 0 when num is 0', () => {
      expect(sum(1, 1)).toEqual(2);
  });

  it('should return 1 when num is 1', () => {
      expect(sum(1, 4)).toEqual(5);
  });

  it('should return 1 when num is 2', () => {
      expect(sum(3, 3)).toBe(6);
  });
});



