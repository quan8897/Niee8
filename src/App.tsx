/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Các tối ưu so với bản cũ:
 * 1. Thêm cache layer (appCache) cho products + site_settings + user role
 *    → Giảm Firebase reads đáng kể khi user reload hoặc navigate
 * 2. Debounce ghi localStorage cart (500ms) → tránh ghi liên tục khi update qty
 * 3. Fix thiếu import `getDoc` trong auth listener
 * 4. Fix model name Gemini: "gemini-2.0-flash" (model hợp lệ)
 * 5. Tách fetchProducts ra hook riêng, tránh re-fetch khi state khác thay đổi
 */

import Header from './components/Header';
import Hero from './components/Hero';
import ProductGrid from './components/ProductGrid';
import AIStylist from './components/AIStylist';
import Footer from './components/Footer';
import AdminDashboard from './components/AdminDashboard';
import AuthModal from './components/AuthModal';
import Cart from './components/Cart';
import Checkout from './components/Checkout';
import OrderTracking from './components/OrderTracking';
import FloatingActions from './components/FloatingActions';
import { motion, useScroll, useSpring, AnimatePresence } from 'motion/react';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Product, CartItem, SiteSettings } from './types';
import { LogOut, ShieldCheck, User as UserIcon, CheckCircle, AlertCircle } from 'lucide-react';
import { appCache, CACHE_KEYS, CACHE_TTL } from './lib/cache';
import { useDebounce } from './lib/useDebounce';
import { supabase } from './lib/supabase';
import { generateOutfitSuggestions as getAISuggestions } from './services/geminiService';

// ===== TOAST NOTIFICATION COMPONENT =====
interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[500] flex flex-col gap-2 w-full max-w-xs px-4 pointer-events-none">
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl text-sm font-medium pointer-events-auto ${
              toast.type === 'success' ? 'bg-green-500 text-white' :
              toast.type === 'error' ? 'bg-red-500 text-white' :
              'bg-nie8-primary text-white'
            }`}
          >
            {toast.type === 'success' && <CheckCircle size={16} />}
            {toast.type === 'error' && <AlertCircle size={16} />}
            {toast.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  const [currentView, setCurrentView] = useState<'home' | 'checkout' | 'admin' | 'track-order'>('home');
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAIStylistOpen, setIsAIStylistOpen] = useState(false);
  const [aiContextProduct, setAiContextProduct] = useState<Product | null>(null);
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<'admin' | 'client' | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [asyncError, setAsyncError] = useState<Error | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [lastOrderInfo, setLastOrderInfo] = useState<{id: string, phone: string} | null>(null);

  if (asyncError) throw asyncError;

  // Toast helper
  const lastToastRef = useRef<{message: string, time: number} | null>(null);
  const showToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    // Chống lặp popup cùng nội dung trong 1 giây
    const now = Date.now();
    if (lastToastRef.current && lastToastRef.current.message === message && now - lastToastRef.current.time < 1000) {
      return;
    }
    lastToastRef.current = { message, time: now };

    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  // ===== CART STATE =====
  // Đọc từ localStorage lúc khởi tạo (chỉ một lần)
  const [savedCartItems, setSavedCartItems] = useState<{id: string, size: string, quantity: number}[]>(() => {
    try {
      const saved = localStorage.getItem('niee8_cart');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return parsed.map((item: unknown) => {
        const i = item as {id: string, size: string, quantity: number};
        return { id: i.id, size: i.size, quantity: i.quantity };
      });
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment');
    const orderId = params.get('orderId');

    if (paymentStatus === 'success') {
      setSavedCartItems([]); // Xoá giỏ hàng
      showToast('Thanh toán thành công! Cảm ơn bạn đã mua sắm.', 'success');
      
      // Nếu có orderId, lấy phone từ localStorage (đã lưu tạm lúc checkout)
      if (orderId) {
        const tempPhone = localStorage.getItem('niee8_temp_phone');
        if (tempPhone) {
          setLastOrderInfo({ id: orderId, phone: tempPhone });
          setCurrentView('track-order');
          localStorage.removeItem('niee8_temp_phone');
        }
      }

      // Xoá param trên URL để tránh lặp lại khi reload
      const newUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    } else if (paymentStatus === 'cancel') {
      showToast('Thanh toán đã bị hủy.', 'error');
      const newUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [showToast]);

  // Debounce ghi localStorage 500ms — tránh ghi mỗi lần bấm +/- qty
  const persistCart = useDebounce((items: typeof savedCartItems) => {
    try {
      localStorage.setItem('niee8_cart', JSON.stringify(items));
    } catch (error) {
      console.error('Error saving cart:', error);
    }
  }, 500);

  useEffect(() => {
    persistCart(savedCartItems);
  }, [savedCartItems, persistCart]);

  // Derive cartItems từ products (memo để tránh re-compute)
  const cartItems: CartItem[] = React.useMemo(() => {
    return savedCartItems.map(savedItem => {
      const product = products.find(p => p.id === savedItem.id);
      if (!product) return null;
      return { ...product, quantity: savedItem.quantity, size: savedItem.size };
    }).filter(Boolean) as CartItem[];
  }, [savedCartItems, products]);

  // ===== AUTH LISTENER =====
  useEffect(() => {
    let isMounted = true;

    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user || null;
      
      if (!isMounted) return;
      setUser(currentUser);

      if (currentUser) {
        // Kiểm tra cache role trước khi gọi DB
        const cachedRole = appCache.get<'admin' | 'client'>(CACHE_KEYS.USER_ROLE(currentUser.id));
        if (cachedRole) {
          setUserRole(cachedRole);
          setIsAuthReady(true);
          return;
        }

        // Fetch role from profiles table
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', currentUser.id)
          .single();

        const role = profile?.role || 'client';
        
        appCache.set(CACHE_KEYS.USER_ROLE(currentUser.id), role, CACHE_TTL.USER_ROLE);
        setUserRole(role);
      } else {
        setUserRole(null);
      }
      setIsAuthReady(true);
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user || null;
      setUser(currentUser);
      if (!currentUser) {
        setUserRole(null);
      }
      // Note: role is updated via checkUser to prioritize DB role
    });

    return () => { 
      isMounted = false; 
      subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setCurrentView('home');
      showToast('Đã đăng xuất', 'info');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // ===== SITE SETTINGS — với cache =====
  useEffect(() => {
    let isMounted = true;

    const fetchSettings = async () => {
      // Đọc cache trước
      const cached = appCache.get<SiteSettings>(CACHE_KEYS.SITE_SETTINGS);
      if (cached) {
        setSiteSettings(cached);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('site_settings')
          .select('*')
          .eq('id', 'global')
          .single();

        if (error && error.code !== 'PGRST116') throw error; // Ignore not found error

        if (!isMounted) return;
        if (data) {
          appCache.set(CACHE_KEYS.SITE_SETTINGS, data, CACHE_TTL.SITE_SETTINGS);
          setSiteSettings(data);
        }
      } catch (error) {
        if (!isMounted) return;
        console.error('Error fetching site settings:', error);
      }
    };

    fetchSettings();
    return () => { isMounted = false; };
  }, []);

  const handleUpdateSettings = async (newSettings: SiteSettings) => {
    try {
      const { error } = await supabase
        .from('site_settings')
        .upsert({ id: 'global', ...newSettings });

      if (error) throw error;

      // Cập nhật cả cache lẫn state
      appCache.set(CACHE_KEYS.SITE_SETTINGS, newSettings, CACHE_TTL.SITE_SETTINGS);
      setSiteSettings(newSettings);
      showToast('Đã cập nhật cài đặt website!');
    } catch (error) {
      console.error('Error updating site settings:', error);
      showToast('Lỗi khi cập nhật cài đặt', 'error');
    }
  };

  // ===== PRODUCTS — với cache =====
  useEffect(() => {
    let isMounted = true;

    const fetchProducts = async () => {
      // Đọc cache trước — tránh Firebase read khi user reload trong vòng 5 phút
      const cached = appCache.get<Product[]>(CACHE_KEYS.PRODUCTS);
      if (cached) {
        setProducts(cached);
        setIsLoadingProducts(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(24);

        if (error) throw error;

        if (!isMounted) return;

        appCache.set(CACHE_KEYS.PRODUCTS, data || [], CACHE_TTL.PRODUCTS);
        setProducts(data || []);
        setIsLoadingProducts(false);
      } catch (error) {
        if (!isMounted) return;
        setIsLoadingProducts(false);
        console.error('Error fetching products:', error);
      }
    };

    fetchProducts();
    return () => { isMounted = false; };
  }, []);

  // ===== PRODUCT CRUD =====
  const generateOutfitSuggestions = async (product: Product, allProducts: Product[]): Promise<string[]> => {
    try {
      const otherProducts = allProducts.filter(p => p.id !== product.id);
      if (otherProducts.length === 0) return [];

      const suggestions = await getAISuggestions(
        product.name,
        product.category,
        otherProducts.map(p => ({ id: p.id, name: p.name }))
      );
      
      return Array.isArray(suggestions) ? suggestions : [];
    } catch (error) {
      console.error("Error generating outfit suggestions:", error);
      return [];
    }
  };

  const handleAddProduct = async (newProduct: Product) => {
    try {
      const suggestions = await generateOutfitSuggestions(newProduct, products);
      const productWithId = { ...newProduct, outfit_suggestions: suggestions };

      const { data, error } = await supabase
        .from('products')
        .insert([productWithId])
        .select()
        .single();

      if (error) throw error;

      // Cập nhật state và cache đồng thời
      const updatedProducts = [data, ...products];
      setProducts(updatedProducts);
      appCache.set(CACHE_KEYS.PRODUCTS, updatedProducts, CACHE_TTL.PRODUCTS);

      showToast('Đã thêm sản phẩm mới!');
    } catch (error) {
      console.error('Error adding product:', error);
      showToast('Lỗi khi thêm sản phẩm', 'error');
    }
  };

  const handleUpdateProduct = async (updatedProduct: Product) => {
    try {
      let suggestions = updatedProduct.outfit_suggestions;
      if (!suggestions || suggestions.length === 0) {
        suggestions = await generateOutfitSuggestions(updatedProduct, products);
      }

      const finalProduct = { ...updatedProduct, outfit_suggestions: suggestions };
      
      // Đảm bảo stock_quantity là số
      if (typeof finalProduct.stock_quantity === 'string') {
        finalProduct.stock_quantity = parseInt(finalProduct.stock_quantity) || 0;
      }

      const { error } = await supabase
        .from('products')
        .update(finalProduct)
        .eq('id', finalProduct.id);

      if (error) throw error;

      const updatedProducts = products.map(p => p.id === finalProduct.id ? finalProduct : p);
      setProducts(updatedProducts);
      appCache.set(CACHE_KEYS.PRODUCTS, updatedProducts, CACHE_TTL.PRODUCTS);

      showToast('Đã cập nhật sản phẩm!');
    } catch (error) {
      console.error('Error updating product:', error);
      showToast('Lỗi khi cập nhật sản phẩm', 'error');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;

      const updatedProducts = products.filter(p => p.id !== id);
      setProducts(updatedProducts);
      appCache.set(CACHE_KEYS.PRODUCTS, updatedProducts, CACHE_TTL.PRODUCTS);
      showToast('Đã xóa sản phẩm', 'info');
    } catch (error) {
      console.error('Error deleting product:', error);
      showToast('Lỗi khi xóa sản phẩm', 'error');
    }
  };

  // ===== CART LOGIC =====
  const addToCart = useCallback((product: Product, selectedSize?: string, quantity: number = 1) => {
    let actualSize = selectedSize;
    if (!actualSize) {
      if (product.stock_by_size) {
        const availableSizes = Object.entries(product.stock_by_size)
          .filter(([_, stock]) => stock > 0)
          .map(([s]) => s);
        actualSize = availableSizes.length > 0 ? availableSizes[0] : 'S';
      } else {
        actualSize = 'M';
      }
    }
    const maxStock = product.stock_by_size?.[actualSize] || 0;
    
    setSavedCartItems(prev => {
      const cartKey = `${product.id}-${actualSize}`;
      const existing = prev.find(item => `${item.id}-${item.size || actualSize}` === cartKey);
      
      if (existing) {
        const newQty = existing.quantity + quantity;
        if (newQty > maxStock) {
          setTimeout(() => showToast(`Chỉ còn ${maxStock} sản phẩm size ${actualSize} trong kho`, 'error'), 0);
          return prev.map(item =>
            `${item.id}-${item.size || actualSize}` === cartKey
              ? { ...item, quantity: maxStock }
              : item
          );
        }
        setTimeout(() => showToast(`Đã thêm ${quantity} sản phẩm vào giỏ — Size ${actualSize} ✓`), 0);
        return prev.map(item =>
          `${item.id}-${item.size || actualSize}` === cartKey
            ? { ...item, quantity: newQty }
            : item
        );
      }
      
      const finalQty = quantity > maxStock ? maxStock : quantity;
      if (quantity > maxStock) {
        setTimeout(() => showToast(`Chỉ còn ${maxStock} sản phẩm size ${actualSize} trong kho`, 'error'), 0);
      } else {
        setTimeout(() => showToast(`Đã thêm ${quantity} sản phẩm vào giỏ — Size ${actualSize} ✓`), 0);
      }
      return [...prev, { id: product.id, quantity: finalQty, size: actualSize }];
    });
  }, [showToast]);

  const updateCartQuantity = useCallback((id: string, size: string, delta: number) => {
    setSavedCartItems(prev => prev.map(item => {
      if (item.id === id && (item.size || '') === (size || '')) {
        const product = products.find(p => p.id === id);
        const maxStock = product?.stock_by_size?.[size] || 0;
        const newQty = item.quantity + delta;
        if (newQty <= 0) return null as unknown as {id: string, size: string, quantity: number};
        if (newQty > maxStock) {
          setTimeout(() => showToast(`Chỉ còn ${maxStock} sản phẩm size ${size} trong kho`, 'error'), 0);
          return { ...item, quantity: maxStock };
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(Boolean));
  }, [products, showToast]);

  const removeCartItem = useCallback((id: string, size: string) => {
    setSavedCartItems(prev => prev.filter(item => !(item.id === id && (item.size || '') === (size || ''))));
    showToast('Đã xóa khỏi giỏ hàng', 'info');
  }, [showToast]);

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // ===== STOCK NOTIFICATIONS =====
  const handleRegisterStockNotification = async (productId: string, email: string, size: string = 'M') => {
    try {
      const { error } = await supabase
        .from('stock_notifications')
        .insert([{
          product_id: productId,
          size: size,
          email: email,
          status: 'pending'
        }]);

      if (error) throw error;
      showToast('Đã đăng ký nhận thông báo thành công!');
      return true;
    } catch (error) {
      console.error('Error registering stock notification:', error);
      showToast('Lỗi khi đăng ký thông báo', 'error');
      return false;
    }
  };

  // ===== LOADING STATE =====
  if (!isAuthReady || isLoadingProducts) {
    return (
      <div className="min-h-screen bg-nie8-bg flex flex-col items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 border-4 border-nie8-primary/20 border-t-nie8-primary rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-2xl font-serif italic text-nie8-text mb-2">niee8.</h2>
          <p className="text-nie8-text/40 text-xs uppercase tracking-[0.3em]">Minimalist Romantic</p>
        </motion.div>
      </div>
    );
  }

  if (currentView === 'checkout') {
    return (
      <Checkout
        items={cartItems}
        onBack={() => setCurrentView('home')}
        onComplete={(orderId, phone) => {
          setSavedCartItems([]); // Xoá giỏ hàng sau khi đặt thành công
          setLastOrderInfo({ id: orderId, phone });
          setCurrentView('track-order');
        }}
        user={user}
      />
    );
  }

  if (currentView === 'track-order') {
    return (
      <OrderTracking 
        onBack={() => setCurrentView('home')} 
        initialOrderId={lastOrderInfo?.id}
        initialPhone={lastOrderInfo?.phone}
        user={user}
      />
    );
  }

  if (currentView === 'admin' && userRole === 'admin') {
    return (
      <AdminDashboard
        products={products}
        siteSettings={siteSettings}
        onAddProduct={handleAddProduct}
        onUpdateProduct={handleUpdateProduct}
        onDeleteProduct={handleDeleteProduct}
        onUpdateSettings={handleUpdateSettings}
        onClose={() => setCurrentView('home')}
        onLogout={logout}
      />
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="page"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.8 }}
        className="min-h-screen flex flex-col bg-nie8-bg"
      >
        {/* Scroll progress bar */}
        <motion.div
          className="fixed top-0 left-0 right-0 h-[2px] bg-nie8-primary origin-left z-[60]"
          style={{ scaleX }}
        />

        <ToastContainer toasts={toasts} onRemove={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />

        <Header
          onCartClick={() => setIsCartOpen(true)}
          cartCount={cartCount}
          isAdmin={userRole === 'admin'}
          onAdminClick={() => setCurrentView('admin')}
          onLoginClick={() => setIsAuthModalOpen(true)}
          onAIClick={() => setIsAIStylistOpen(true)}
          onTrackOrderClick={() => setCurrentView('track-order')}
          user={user}
          onLogout={logout}
        />

        <main className="flex-grow">
          <Hero settings={siteSettings} />

          <ProductGrid
            products={products}
            onAddToCart={addToCart}
            onBuyNow={(product, size, quantity) => {
              addToCart(product, size, quantity);
              setCurrentView('checkout');
            }}
            onChatWithAI={(product) => {
              setAiContextProduct(product);
              setIsAIStylistOpen(true);
            }}
            onRegisterStockNotification={handleRegisterStockNotification}
            isLoading={isLoadingProducts}
          />

          {/* Newsletter section */}
          <section className="py-6 sm:py-10 bg-nie8-text relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
                className="max-w-3xl mx-auto"
              >
                <h2 className="text-2xl sm:text-4xl md:text-5xl font-serif italic text-white mb-2 sm:mb-4 leading-tight">
                  Gia nhập <br className="sm:hidden" />
                  <span className="text-nie8-primary">niee8 Circle.</span>
                </h2>
                <p className="text-white/60 text-xs sm:text-sm mb-4 sm:mb-6 leading-relaxed max-w-xl mx-auto">
                  Nhận quyền truy cập sớm vào các bộ sưu tập mới và mẹo phối đồ độc quyền.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 max-w-sm sm:max-w-md mx-auto">
                  <input
                    type="email"
                    placeholder="Địa chỉ email của bạn"
                    className="flex-grow bg-white/10 border border-white/20 rounded-full px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-nie8-primary transition-colors text-xs sm:text-sm"
                  />
                  <button className="px-6 py-3 bg-nie8-primary text-white rounded-full font-bold text-xs sm:text-sm hover:bg-nie8-secondary transition-all active:scale-95 whitespace-nowrap">
                    Đăng ký
                  </button>
                </div>
              </motion.div>
            </div>
          </section>
        </main>

        <div className="h-16 lg:hidden" aria-hidden="true" />
        <Footer onAdminLogin={() => setIsAuthModalOpen(true)} />

        <FloatingActions onAIClick={() => setIsAIStylistOpen(true)} />

        <AuthModal 
          isOpen={isAuthModalOpen} 
          onClose={() => setIsAuthModalOpen(false)} 
          onSuccess={() => {
            showToast('Đăng nhập thành công!', 'success');
          }}
        />

        <AIStylist 
          isOpen={isAIStylistOpen} 
          onClose={() => setIsAIStylistOpen(false)} 
          productContext={aiContextProduct}
        />

        <AnimatePresence>
          {isAdminOpen && (
            <AdminDashboard
              products={products}
              siteSettings={siteSettings}
              onAddProduct={handleAddProduct}
              onUpdateProduct={handleUpdateProduct}
              onDeleteProduct={handleDeleteProduct}
              onUpdateSettings={handleUpdateSettings}
              onClose={() => setIsAdminOpen(false)}
              onLogout={logout}
            />
          )}
        </AnimatePresence>

        <Cart
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          items={cartItems}
          onUpdateQuantity={updateCartQuantity}
          onRemoveItem={removeCartItem}
          onCheckout={() => {
            setIsCartOpen(false);
            setCurrentView('checkout');
          }}
        />
      </motion.div>
    </AnimatePresence>
  );
}
