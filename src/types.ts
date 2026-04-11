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
  supplier_code?: string;
  supplier_link?: string;
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
  product_name?: string; // For UI convenience
}

// CartItem giờ có trường size để phân biệt cùng sản phẩm khác size
export interface CartItem extends Product {
  quantity: number;
  size: string; // 'S' | 'M' | 'L' | 'XL'
}

export interface Feedback {
  id: string;
  user: string;
  text: string;
  avatar: string;
}

export interface SiteSettings {
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
