import { useChangeArr,calculateAverage,calculateDiscount} from "./complex-function";
import { expect, test ,describe, it} from 'vitest'


describe('数组旋转', () => {
  test('useChangeArr with normal k', () => {
    const arr = [1, 2, 3, 4, 5];
    const k = 2;
    const result = useChangeArr(arr, k);
    expect(result).toEqual([4, 5, 1, 2, 3]);
  });
  
  it('旋转数组', () => {
    const arr = [1,2,3,4,5,6,7,8];
    const k=3;
    const res=useChangeArr(arr,k);
    //useChangeArr 函数的意图是将数组向右旋转 k 次，那么对于输入 [1,2,3,4,5,6,7,8] 和 k=3，正确的输出应该是 [6,7,8,1,2,3,4,5] 而不是 [5,6,7,8,1,2,3,4]。
    // expect(res).toEqual([5,6,7,8,1,2,3,4]);  //错误
    expect(res).toEqual([6,7,8,1,2,3,4,5]);  //正确
  });
});

describe('计算一组数字的平均数', () => {
  it('数字的平均数', () => {
    const numbers = [1, 2, 3, 4, 5];
    const result = calculateAverage(numbers);
    expect(result).toBe(3); // 因为 (1 + 2 + 3 + 4 + 5) / 5 = 3
  });
});

describe('计算折扣后的价格', () => {
  it('应正确计算折扣价', () => {
    expect(calculateDiscount(100, 0.2)).toBe(80);
    expect(calculateDiscount(50, 0.5)).toBe(25);
    expect(calculateDiscount(75, 0.1)).toBe(67.5);
  });

  it('应将结果四舍五入到小数点后两位', () => {
    expect(calculateDiscount(99.99, 0.05)).toBe(94.99);
  });

  it('应为无效输入抛出错误', () => {
    expect(() => calculateDiscount(-1, 0.2)).toThrow('Invalid input parameters');
    expect(() => calculateDiscount(100, -0.1)).toThrow('Invalid input parameters');
    expect(() => calculateDiscount(100, 1.1)).toThrow('Invalid input parameters');
  });
});