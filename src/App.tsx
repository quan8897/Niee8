/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Header from './components/Header';
import Hero from './components/Hero';
import ProductGrid from './components/ProductGrid';
import AIStylist from './components/AIStylist';
import Footer from './components/Footer';
import AdminDashboard from './components/AdminDashboard';
import Cart from './components/Cart';
import { motion, useScroll, useSpring, AnimatePresence } from 'motion/react';
import { useState, useEffect } from 'react';
import { Product, CartItem } from './types';

const INITIAL_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Áo Khoác Cardigan Len Mềm',
    price: '$55.00',
    images: [
      'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?q=80&w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?q=80&w=600&auto=format&fit=crop'
    ],
    description: 'Chiếc cardigan len mềm mại như một cái ôm nhẹ nhàng cho những buổi sáng se lạnh. Thiết kế tối giản, dễ dàng khoác ngoài mọi bộ trang phục hàng ngày.',
    category: 'Áo khoác'
  },
  {
    id: '2',
    name: 'Quần Jean Ống Đứng Daily',
    price: '$68.00',
    images: [
      'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1542272604-787c3835535d?q=80&w=600&auto=format&fit=crop'
    ],
    description: 'Dáng quần ống đứng kinh điển, tôn vinh đôi chân và mang lại sự thoải mái tuyệt đối từ sáng đến tối. Một món đồ không thể thiếu trong tủ đồ của mọi cô gái.',
    category: 'Quần'
  },
  {
    id: '3',
    name: 'Áo Blouse Trắng Ruffled',
    price: '$48.00',
    images: [
      'input_file_0.png',
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=600&auto=format&fit=crop'
    ],
    description: 'Chiếc blouse trắng tinh khôi với chi tiết bèo nhún điệu đà và dây nơ thắt nhẹ nhàng. Chất liệu vải xô mềm mại, mang lại vẻ ngoài lãng mạn và nữ tính cho những buổi hẹn hò hay dạo phố.',
    category: 'Áo'
  },
  {
    id: '4',
    name: 'Váy Suông Cotton Basic',
    price: '$52.00',
    images: [
      'https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1539008835657-9e8e62f85a6d?q=80&w=600&auto=format&fit=crop'
    ],
    description: 'Vẻ đẹp đến từ sự đơn giản nhất. Chiếc váy suông cotton mềm mại, là người bạn đồng hành lý tưởng cho những ngày bạn chỉ muốn tận hưởng sự tự do.',
    category: 'Váy'
  },
  {
    id: '5',
    name: 'Áo Thun Cotton Dày Dặn',
    price: '$25.00',
    images: [
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?q=80&w=600&auto=format&fit=crop'
    ],
    description: 'Chất cotton cao cấp với độ dày vừa vặn, giữ form dáng hoàn hảo qua thời gian. Đơn giản nhưng đầy tinh tế trong từng đường kim mũi chỉ.',
    category: 'Áo'
  },
  {
    id: '6',
    name: 'Áo Blazer Form Rộng',
    price: '$89.00',
    images: [
      'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1548624313-0396c75e4b1a?q=80&w=600&auto=format&fit=crop'
    ],
    description: 'Sự kết hợp hoàn hảo giữa vẻ thanh lịch và nét phóng khoáng hiện đại. Form áo rộng rãi tạo nên phong cách thời thượng mà vẫn vô cùng gần gũi.',
    category: 'Áo khoác'
  }
];

export default function App() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('niee8_products');
      if (!saved) return INITIAL_PRODUCTS;
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : INITIAL_PRODUCTS;
    } catch (error) {
      console.error('Error loading products from localStorage:', error);
      return INITIAL_PRODUCTS;
    }
  });

  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('niee8_cart');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Error loading cart from localStorage:', error);
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('niee8_products', JSON.stringify(products));
    } catch (error) {
      console.error('Error saving products to localStorage:', error);
    }
  }, [products]);

  useEffect(() => {
    try {
      localStorage.setItem('niee8_cart', JSON.stringify(cartItems));
    } catch (error) {
      console.error('Error saving cart to localStorage:', error);
    }
  }, [cartItems]);

  const handleAddProduct = (newProduct: Product) => {
    setProducts([...products, newProduct]);
  };

  const handleUpdateProduct = (updatedProduct: Product) => {
    setProducts(products.map(p => p.id === updatedProduct.id ? updatedProduct : p));
  };

  const handleDeleteProduct = (id: string) => {
    setProducts(products.filter(p => p.id !== id));
  };

  const addToCart = (product: Product) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const updateCartQuantity = (id: string, delta: number) => {
    setCartItems(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeCartItem = (id: string) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div 
        key="page"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 1.2, ease: "easeInOut" }}
        className="min-h-screen flex flex-col bg-nie8-bg"
      >
        <motion.div
          className="fixed top-0 left-0 right-0 h-[2px] bg-nie8-primary origin-left z-[60]"
          style={{ scaleX }}
        />
        
        <Header onCartClick={() => setIsCartOpen(true)} cartCount={cartItems.reduce((sum, item) => sum + item.quantity, 0)} />
        
        <main className="flex-grow">
          <Hero />
          
          <section className="py-32 bg-nie8-bg">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-20">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                  viewport={{ once: true }}
                  className="text-center"
                >
                  <div className="w-20 h-20 bg-nie8-primary/10 rounded-full flex items-center justify-center mx-auto mb-10">
                    <span className="text-2xl font-serif italic text-nie8-primary">01</span>
                  </div>
                  <h3 className="text-2xl font-serif italic text-nie8-text mb-6">Nguồn cung Đạo đức</h3>
                  <p className="text-nie8-text/60 leading-relaxed text-sm">Chúng tôi hợp tác với các nghệ nhân chia sẻ cam kết về tính bền vững và thực hành lao động công bằng.</p>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  viewport={{ once: true }}
                  className="text-center"
                >
                  <div className="w-20 h-20 bg-nie8-primary/10 rounded-full flex items-center justify-center mx-auto mb-10">
                    <span className="text-2xl font-serif italic text-nie8-primary">02</span>
                  </div>
                  <h3 className="text-2xl font-serif italic text-nie8-text mb-6">Thiết kế Vượt thời gian</h3>
                  <p className="text-nie8-text/60 leading-relaxed text-sm">Các thiết kế của niee8 vượt qua mọi mùa mốt, trở thành những món đồ quý giá trong tủ đồ của bạn.</p>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  viewport={{ once: true }}
                  className="text-center"
                >
                  <div className="w-20 h-20 bg-nie8-primary/10 rounded-full flex items-center justify-center mx-auto mb-10">
                    <span className="text-2xl font-serif italic text-nie8-primary">03</span>
                  </div>
                  <h3 className="text-2xl font-serif italic text-nie8-text mb-6">Chất lượng Thủ công</h3>
                  <p className="text-nie8-text/60 leading-relaxed text-sm">Mỗi đường kim mũi chỉ là minh chứng cho sự tận tâm với nghề thủ công và sự tỉ mỉ đến từng chi tiết.</p>
                </motion.div>
              </div>
            </div>
          </section>

          <ProductGrid products={products} onAddToCart={addToCart} />
          
          <section className="py-32 bg-nie8-text relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1 }}
                viewport={{ once: true }}
                className="max-w-4xl mx-auto"
              >
                <h2 className="text-5xl md:text-7xl font-serif italic text-white mb-10 leading-tight">
                  Gia nhập <br />
                  <span className="text-nie8-primary">niee8 Circle.</span>
                </h2>
                <p className="text-white/60 text-lg mb-12 leading-relaxed max-w-2xl mx-auto">
                  Đăng ký để nhận quyền truy cập sớm vào các bộ sưu tập mới, 
                  mẹo phối đồ độc quyền và lời mời tham gia các sự kiện riêng tư.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                  <input 
                    type="email" 
                    placeholder="Địa chỉ email của bạn" 
                    className="flex-grow bg-white/10 border border-white/20 rounded-full px-8 py-4 text-white focus:outline-none focus:border-nie8-primary transition-colors"
                  />
                  <button className="px-10 py-4 bg-nie8-primary text-white rounded-full font-medium hover:bg-nie8-secondary transition-all">
                    Đăng ký
                  </button>
                </div>
              </motion.div>
            </div>
          </section>
        </main>
        
        <Footer onAdminClick={() => setIsAdminOpen(true)} />
        <AIStylist />

        <AnimatePresence>
          {isAdminOpen && (
            <AdminDashboard 
              products={products}
              onAddProduct={handleAddProduct}
              onUpdateProduct={handleUpdateProduct}
              onDeleteProduct={handleDeleteProduct}
              onClose={() => setIsAdminOpen(false)}
            />
          )}
        </AnimatePresence>

        <Cart 
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          items={cartItems}
          onUpdateQuantity={updateCartQuantity}
          onRemoveItem={removeCartItem}
        />
      </motion.div>
    </AnimatePresence>
  );
}


