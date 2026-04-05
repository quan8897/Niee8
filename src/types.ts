export interface Product {
  id: string;
  name: string;
  price: string;
  images: string[];
  description: string;
  category: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Feedback {
  id: string;
  user: string;
  text: string;
  avatar: string;
}
