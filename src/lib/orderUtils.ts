import { CartItem } from '../types';

export const calculateTotal = (items: CartItem[]): number => {
  return items.reduce((total, item) => {
    // Remove dots (thousands separator) and parse
    const price = parseFloat(item.price.replace(/\./g, "").replace(/[^0-9.-]+/g, ""));
    return total + (price * item.quantity);
  }, 0);
};
