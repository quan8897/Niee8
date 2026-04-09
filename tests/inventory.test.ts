import { describe, it, expect } from 'vitest';

// Logic to test: Total stock = sum of all sizes
export const calculateTotalStock = (stockBySize: Record<string, number>): number => {
  return Object.values(stockBySize).reduce((sum, qty) => sum + qty, 0);
};

describe('calculateTotalStock', () => {
  it('should calculate total stock correctly', () => {
    const stockBySize = { S: 10, M: 5, L: 0, XL: 2 };
    expect(calculateTotalStock(stockBySize)).toBe(17);
  });

  it('should return 0 for empty stock', () => {
    const stockBySize = { S: 0, M: 0, L: 0, XL: 0 };
    expect(calculateTotalStock(stockBySize)).toBe(0);
  });
});
