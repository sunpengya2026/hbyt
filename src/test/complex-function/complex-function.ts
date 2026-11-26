
/**
 * 将数组中的元素循环移动k次
 *
 * @param arr 任意类型的数组
 * @param k 循环移动的次数
 * @returns 循环移动后的数组
 */
export const useChangeArr=(arr: any[], k: number)=> {
  for (let i = 0; i < k; i++) {
    const num=arr.pop()
    arr.unshift(num)
  }
  return arr
}

// 复杂一点的函数，比如计算一组数字的平均数
export const calculateAverage=(numbers:any)=> {
  if (!Array.isArray(numbers) || numbers.length === 0) {
    return 0;
  }
  const sum = numbers.reduce((acc, cur) => acc + cur, 0);
  return sum / numbers.length;
}

// 假设这是一个复杂的方法，用于计算折扣后的价格
export const calculateDiscount=(price: number, discountRate: number): number=> {
  if (price <= 0 || discountRate < 0 || discountRate > 1) {
    throw new Error('Invalid input parameters');
  }
  // 复杂的业务逻辑
  const discountedPrice = price * (1 - discountRate);
  return parseFloat(discountedPrice.toFixed(2));
}