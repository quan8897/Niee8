export interface Product {
  id: string;
  name: string;
  price: string;
  images: string[];
  description: string;
  category: string;
  outfit_suggestions?: string[];
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
}
