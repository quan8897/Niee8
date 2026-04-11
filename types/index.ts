export interface Product {
  id: string;
  name: string;
  price: string;
  images: string[];
  description: string;
  category: string;
  outfit_suggestions?: string[];
  stock_quantity: number;
  stock_by_size?: Record<string, number>;
  is_set?: boolean;
  story_content?: string;
  created_at?: string;
}

export interface StockMovement {
  id: string;
  product_id: string;
  size: string;
  quantity: number;
  type: 'import' | 'sale' | 'return' | 'adjustment';
  reference_id?: string;
  note?: string;
  created_at: string;
}

export interface StockNotification {
  id: string;
  product_id: string;
  user_id?: string;
  email: string;
  size?: string;
  status: 'pending' | 'notified';
  created_at: string;
  product_name?: string;
}

export interface CartItem extends Product {
  quantity: number;
  size: string;
}

export interface SavedCartItem {
  id: string;
  size: string;
  quantity: number;
}

export interface SiteSettings {
  hero_image?: string;
  hero_title?: string;
  hero_subtitle?: string;
  hero_description?: string;
  // Legacy camelCase support
  heroImage: string;
  heroTitle: string;
  heroSubtitle: string;
  heroDescription: string;
  theme_mode?: 'warm' | 'slate';
  grid_mode?: 'full-lookbook' | 'mixed';
  show_story?: boolean;
}

export interface Order {
  id: string;
  user_id?: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_city: string;
  items: CartItem[];
  total_amount: number;
  status: 'pending' | 'processing' | 'shipping' | 'completed' | 'cancelled';
  payment_method: string;
  created_at: string;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export type UserRole = 'admin' | 'client';

export interface UserProfile {
  id: string;
  email: string;
  display_name?: string;
  photo_url?: string;
  role: UserRole;
}
