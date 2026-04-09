import { describe, it, expect } from 'vitest';
import { calculateTotal } from '../src/lib/orderUtils';
import { CartItem } from '../src/types';

describe('calculateTotal', () => {
  it('should calculate total correctly', () => {
    const items: CartItem[] = [
      { id: '1', name: 'Product 1', price: '100.000', images: [], description: '', category: '', stock_quantity: 10, quantity: 2, size: 'M' },
      { id: '2', name: 'Product 2', price: '50.000', images: [], description: '', category: '', stock_quantity: 5, quantity: 1, size: 'L' },
    ];
    // Assuming price is in VND format like '100.000'
    // My regex: /[^0-9.-]+/g replaces '.' with ''
    // So '100.000' -> 100000
    expect(calculateTotal(items)).toBe(250000);
  });
});
