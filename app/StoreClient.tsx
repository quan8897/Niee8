'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useScroll, useSpring, AnimatePresence } from 'motion/react';
import { CheckCircle, AlertCircle } from 'lucide-react';
import dynamic from 'next/dynamic';
import { Product, CartItem, SavedCartItem, SiteSettings, Toast } from '@/types';
import { getSupabaseClient } from '@/lib/supabase/client';
import Header from '@/components/store/Header';
import Hero from '@/components/store/Hero';
import ProductGrid from '@/components/store/ProductGrid';
import Footer from '@/components/store/Footer';
import Cart from '@/components/store/Cart';
import Checkout from '@/components/store/Checkout';
import FloatingActions from '@/components/store/FloatingActions';

// Dynamic imports for heavy components
const OrderTracking = dynamic(() => import('@/components/store/OrderTracking'), {
  loading: () => <div className="min-h-screen bg-nie8-bg flex items-center justify-center"><div className="w-8 h-8 border-2 border-nie8-primary/20 border-t-nie8-primary rounded-full animate-spin" /></div>
});
const AuthModal = dynamic(() => import('@/components/store/AuthModal'), {
  loading: () => null
});
const AdminDashboard = dynamic(() => import('@/components/admin/AdminDashboard'), {
  loading: () => <div className="min-h-screen bg-nie8-bg flex items-center justify-center"><div className="w-8 h-8 border-2 border-nie8-primary/20 border-t-nie8-primary rounded-full animate-spin" /></div>
});

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

type View = 'home' | 'checkout' | 'admin' | 'track-order';

interface StoreClientProps {
  initialProducts: Product[];
  initialSettings: SiteSettings | null;
}

export default function StoreClient({ initialProducts, initialSettings }: StoreClientProps) {
  const supabase = getSupabaseClient();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  const [currentView, setCurrentView] = useState<View>('home');
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(initialSettings);
  const [previewTheme, setPreviewTheme] = useState<'warm' | 'slate' | null>(null);

  // Hàm làm mới dữ liệu sản phẩm từ DB
  const refreshProducts = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      if (data) setProducts(data);
    } catch (err) {
      console.error('Failed to refresh products:', err);
    }
  }, [supabase]);

  // Apply theme to HTML tag for maximum coverage
  useEffect(() => {
    const activeTheme = previewTheme || siteSettings?.theme_mode || 'warm';
    if (activeTheme === 'slate') {
      document.documentElement.classList.add('theme-slate');
    } else {
      document.documentElement.classList.remove('theme-slate');
    }
  }, [siteSettings?.theme_mode, previewTheme]);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<'admin' | 'client' | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [lastOrderInfo, setLastOrderInfo] = useState<{ id: string; phone: string } | null>(null);

  // Toast helper
  const lastToastRef = useRef<{ message: string; time: number } | null>(null);
  const showToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const now = Date.now();
    if (lastToastRef.current && lastToastRef.current.message === message && now - lastToastRef.current.time < 1000) return;
    lastToastRef.current = { message, time: now };
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  // Cart state — persisted to localStorage
  // Cart state — Khởi tạo trống để tránh lỗi Hydration (#418)
  const [savedCartItems, setSavedCartItems] = useState<SavedCartItem[]>([]);

  // Đọc giỏ hàng sau khi component đã mount (chỉ ở client)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('niee8_cart');
      if (saved) {
        const rawItems = JSON.parse(saved) as SavedCartItem[];
        const merged: Record<string, SavedCartItem> = {};
        rawItems.forEach(item => {
          const key = `${item.id}-${item.size}`;
          if (merged[key]) merged[key].quantity += item.quantity;
          else merged[key] = { ...item };
        });
        setSavedCartItems(Object.values(merged));
      }
    } catch (e) {
      console.error('Failed to load cart:', e);
    }
  }, []);

  // PayOS redirect handling — KHÔNG trust URL param, verify qua DB
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment');
    const orderId = params.get('orderId');

    if (paymentStatus === 'pending' && orderId) {
      // PayOS redirect về — kiểm tra trạng thái thực tế từ DB
      const verifyPayment = async () => {
        try {
          const { data: order } = await supabase
            .from('orders')
            .select('status, payment_method')
            .eq('id', orderId)
            .single();

          if (order?.status === 'processing' || order?.status === 'completed') {
            // Webhook PayOS đã xác nhận — thành công thực sự
            setSavedCartItems([]);
            showToast('Thanh toán thành công! Cảm ơn bạn đã mua sắm.', 'success');
            const tempPhone = localStorage.getItem('niee8_temp_phone');
            if (tempPhone) {
              setLastOrderInfo({ id: orderId, phone: tempPhone });
              setCurrentView('track-order');
              localStorage.removeItem('niee8_temp_phone');
              refreshProducts(); // Cập nhật kho mới nhất
            }
          } else if (order?.status === 'pending') {
            // Chưa được xác nhận qua Webhook
            showToast('Thanh toán đang chờ xác nhận. Vui lòng chờ vài giây...', 'info');
            const tempPhone = localStorage.getItem('niee8_temp_phone');
            if (tempPhone) {
              setLastOrderInfo({ id: orderId, phone: tempPhone });
              setCurrentView('track-order');
              refreshProducts(); // Cập nhật kho mới nhất
            }
          } else {
            showToast('Thanh toán không thành công.', 'error');
          }
        } catch {
          showToast('Không thể xác nhận trạng thái thanh toán.', 'error');
        }
      };
      verifyPayment();
      window.history.replaceState({}, '', window.location.pathname);
    } else if (paymentStatus === 'cancel' && orderId) {
      const token = params.get('token');
      showToast('Đang hủy thanh toán...', 'info');
      
      // Sử dụng API Route bảo mật thay vì gọi RPC trực tiếp từ Client
      fetch('/api/cancel-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, token })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          showToast('Thanh toán đã được hủy theo yêu cầu. Hẹn gặp lại bạn!', 'info');
          refreshProducts(); 
        } else {
          showToast(data.error || 'Cảnh báo: Không thể xác thực việc hủy đơn.', 'error');
        }
      })
      .catch(() => showToast('Lỗi kết nối khi hủy đơn.', 'error'));

      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [showToast, supabase]);

  // Persist cart to localStorage
  useEffect(() => {
    try { localStorage.setItem('niee8_cart', JSON.stringify(savedCartItems)); } catch {}
  }, [savedCartItems]);

  // Derived cart items
  const cartItems: CartItem[] = React.useMemo(() =>
    savedCartItems.map(saved => {
      const product = products.find(p => p.id === saved.id);
      if (!product) return null;
      
      const maxStock = product.stock_by_size?.[saved.size] || 0;
      const validQty = Math.min(saved.quantity, maxStock);
      
      if (validQty <= 0) return null;
      
      return { ...product, quantity: validQty, size: saved.size };
    }).filter(Boolean) as CartItem[],
    [savedCartItems, products]
  );

  // Auth listener
  useEffect(() => {
    let mounted = true;
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user || null;
      if (!mounted) return;
      setUser(currentUser);
      if (currentUser) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', currentUser.id).single();
        if (mounted) setUserRole(profile?.role || 'client');
      } else {
        setUserRole(null);
      }
      if (mounted) setIsAuthReady(true);
    };
    checkUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user || null;
      setUser(currentUser);
      if (!currentUser) setUserRole(null);
      else checkUser();
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, [supabase]);

  const logout = async () => {
    await supabase.auth.signOut();
    setCurrentView('home');
    showToast('Đã đăng xuất', 'info');
  };

  // Cart logic
  const addToCart = useCallback((product: Product, selectedSize?: string, quantity: number = 1) => {
    let actualSize = selectedSize;
    if (!actualSize) {
      const availableSizes = Object.entries(product.stock_by_size || {}).filter(([, s]) => s > 0).map(([s]) => s);
      actualSize = availableSizes[0] || 'M';
    }
    const maxStock = product.stock_by_size?.[actualSize] || 0;
    setSavedCartItems(prev => {
      const cartKey = `${product.id}-${actualSize}`;
      const existing = prev.find(item => `${item.id}-${item.size}` === cartKey);
      if (existing) {
        const newQty = Math.min(existing.quantity + quantity, maxStock);
        if (existing.quantity + quantity > maxStock) setTimeout(() => showToast(`Chỉ còn ${maxStock} size ${actualSize}`, 'error'), 0);
        else setTimeout(() => showToast(`Đã thêm vào giỏ — Size ${actualSize} ✓`), 0);
        return prev.map(item => `${item.id}-${item.size}` === cartKey ? { ...item, quantity: newQty } : item);
      }
      const finalQty = Math.min(quantity, maxStock);
      if (quantity > maxStock) setTimeout(() => showToast(`Chỉ còn ${maxStock} size ${actualSize}`, 'error'), 0);
      else setTimeout(() => showToast(`Đã thêm vào giỏ — Size ${actualSize} ✓`), 0);
      return [...prev, { id: product.id, quantity: finalQty, size: actualSize! }];
    });
  }, [showToast]);

  const updateCartQuantity = useCallback((id: string, size: string, delta: number) => {
    setSavedCartItems(prev => prev.map(item => {
      if (item.id === id && item.size === size) {
        const product = products.find(p => p.id === id);
        const maxStock = product?.stock_by_size?.[size] || 0;
        const newQty = item.quantity + delta;
        if (newQty <= 0) return null as any;
        return { ...item, quantity: Math.min(newQty, maxStock) };
      }
      return item;
    }).filter(Boolean));
  }, [products]);

  const removeCartItem = useCallback((id: string, size: string) => {
    setSavedCartItems(prev => prev.filter(item => !(item.id === id && item.size === size)));
    showToast('Đã xóa khỏi giỏ hàng', 'info');
  }, [showToast]);

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);


  // Loading state - Chỉ hiện loading nếu đang ở các trang cần quyền (Admin) hoặc thực sự chưa có dữ liệu gì
  if (!isAuthReady && (currentView === 'admin' || !products.length)) {
    return (
      <div className="min-h-screen bg-nie8-bg flex flex-col items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <div className="w-16 h-16 border-4 border-nie8-primary/20 border-t-nie8-primary rounded-full animate-spin mx-auto mb-6" />
          <h2 className="text-2xl font-serif italic text-nie8-text mb-2">nie8.</h2>
          <p className="text-nie8-text/40 text-xs uppercase tracking-[0.3em]">Minimalist Romantic</p>
        </motion.div>
      </div>
    );
  }

  if (currentView === 'checkout') {
    const cartTotal = cartItems.reduce((sum, item) => {
      const price = Number(String(item.price).replace(/[^0-9]/g, '')) || 0;
      return sum + (price * item.quantity);
    }, 0);

    return (
      <Checkout
        items={cartItems}
        total={cartTotal}
        onBack={() => setCurrentView('home')}
        onComplete={(orderId, phone) => {
          setSavedCartItems([]);
          setLastOrderInfo({ id: orderId, phone });
          refreshProducts(); // Quan trọng: Cập nhật lại kho ngay lập tức
          setCurrentView('track-order');
        }}
        user={user}
        onUpdateQuantity={updateCartQuantity}
        onRemoveItem={removeCartItem}
      />
    );
  }

  if (currentView === 'track-order') {
    return <OrderTracking onBack={() => setCurrentView('home')} initialOrderId={lastOrderInfo?.id} initialPhone={lastOrderInfo?.phone} user={user} />;
  }

  if (currentView === 'admin' && userRole === 'admin') {
    return (
      <AdminDashboard
        products={products}
        siteSettings={siteSettings as any}
        onAddProduct={async (p) => {
          const cleanPrice = p.price?.toString().replace(/[^0-9]/g, '') || '0';
          const payload = { ...p, price: Number(cleanPrice) };
          const { error } = await supabase.from('products').insert([payload]);
          if (error) { showToast('Lỗi: ' + error.message, 'error'); return; }
          
          // Ghi nhật ký hệ thống
          await supabase.from('activity_logs').insert({
            product_id: p.id,
            action: 'Thêm sản phẩm mới',
            details: `Đã thêm sản phẩm: ${p.name} (${p.category}) với giá ${new Intl.NumberFormat('vi-VN').format(Number(cleanPrice))}đ`
          });
          
          // Ghi sổ cái cho số lượng ban đầu
          if (p.stock_by_size) {
            const movements = Object.entries(p.stock_by_size)
              .filter(([_, qty]) => (qty as number) > 0)
              .map(([size, qty]) => ({
                product_id: p.id,
                size,
                quantity: qty,
                type: 'import',
                note: 'Khởi tạo tồn kho ban đầu'
              }));
            
            if (movements.length > 0) {
              await supabase.from('stock_movements').insert(movements);
            }
          }

          setProducts(prev => [p, ...prev]);
          showToast('Đã thêm sản phẩm!');
        }}
        onUpdateProduct={async (p) => {
          const current = products.find(prod => prod.id === p.id);
          const cleanPrice = p.price?.toString().replace(/[^0-9]/g, '') || '0';
          const newPrice = Number(cleanPrice);
          const payload = { ...p, price: newPrice };
          
          const { error } = await supabase.from('products').update(payload).eq('id', p.id);
          if (error) { showToast('Lỗi: ' + error.message, 'error'); return; }

          // Ghi nhật ký nếu có thay đổi quan trọng
          if (current) {
            const changes = [];
            if (current.name !== p.name) changes.push(`Tên: "${current.name}" -> "${p.name}"`);
            if (Number(current.price) !== newPrice) {
              const formatter = new Intl.NumberFormat('vi-VN');
              changes.push(`Giá: ${formatter.format(Number(current.price))}đ -> ${formatter.format(newPrice)}đ`);
            }

            if (changes.length > 0) {
              await supabase.from('activity_logs').insert({
                product_id: p.id,
                action: 'Cập nhật sản phẩm',
                details: changes.join('\n')
              });
            }
          }

          setProducts(prev => prev.map(x => x.id === p.id ? p : x));
          showToast('Đã cập nhật!');
        }}
        onDeleteProduct={async (id) => {
          const product = products.find(p => p.id === id);
          const { error } = await supabase.from('products').delete().eq('id', id);
          if (error) { showToast('Lỗi: ' + error.message, 'error'); return; }
          
          await supabase.from('activity_logs').insert({
            product_id: id,
            action: 'Xóa sản phẩm',
            details: `Đã xóa sản phẩm: ${product?.name || id}`
          });

          setProducts(prev => prev.filter(p => p.id !== id));
          showToast('Đã xóa', 'info');
        }}
        onUpdateSettings={async (s) => {
          const { error } = await supabase.from('site_settings').upsert({ id: 'global', ...s });
          if (error) { showToast('Lỗi: ' + error.message, 'error'); return; }
          
          await supabase.from('activity_logs').insert({
            action: 'Cập nhật cài đặt',
            details: 'Thay đổi cấu hình giao diện hoặc tính năng hệ thống'
          });

          setSiteSettings(s);
          setPreviewTheme(null); // Clear preview on save
          showToast('Đã cập nhật cài đặt!');
        }}
        onThemePreview={(theme) => setPreviewTheme(theme)}
        onClose={() => { setPreviewTheme(null); setCurrentView('home'); }}
        onLogout={logout}
      />
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div key="page" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8 }} className="min-h-screen flex flex-col bg-nie8-bg">
        <motion.div className="fixed top-0 left-0 right-0 h-[1.5px] sm:h-[2px] bg-nie8-primary/40 sm:bg-nie8-primary origin-left z-[60]" style={{ scaleX }} />
        <ToastContainer toasts={toasts} onRemove={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />

        <Header
          onCartClick={() => setIsCartOpen(true)}
          cartCount={cartCount}
          isAdmin={userRole === 'admin'}
          onAdminClick={() => setCurrentView('admin')}
          onLoginClick={() => setIsAuthModalOpen(true)}
          onTrackOrderClick={() => setCurrentView('track-order')}
          user={user}
          onLogout={logout}
        />

        <main className="flex-grow">
          <Hero settings={siteSettings} />
          <ProductGrid
            products={products}
            onAddToCart={addToCart}
            onBuyNow={(product, size, quantity) => { addToCart(product, size, quantity); setCurrentView('checkout'); }}
            settings={siteSettings}
            isLoading={false}
            user={user}
          />

          {/* Newsletter */}
          <section className="py-6 sm:py-10 bg-nie8-text relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8 }} viewport={{ once: true }} className="max-w-3xl mx-auto">
                <h2 className="text-2xl sm:text-4xl md:text-5xl font-serif italic text-white mb-2 sm:mb-4 leading-tight">
                  Gia nhập <br className="sm:hidden" />
                  <span className="text-nie8-accent">nie8 Circle.</span>
                </h2>
                <p className="text-white/60 text-xs sm:text-sm mb-4 sm:mb-6 leading-relaxed max-w-xl mx-auto">
                  Nhận quyền truy cập sớm vào các bộ sưu tập mới và mẹo phối đồ độc quyền.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 max-w-sm sm:max-w-md mx-auto">
                  <input type="email" placeholder="Địa chỉ email của bạn" className="flex-grow bg-white/10 border border-white/20 rounded-full px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-nie8-accent transition-colors text-xs sm:text-sm" />
                  <button className="px-6 py-3 bg-nie8-primary text-white rounded-full font-bold text-xs sm:text-sm hover:bg-nie8-secondary transition-all active:scale-95 whitespace-nowrap">Đăng ký</button>
                </div>
              </motion.div>
            </div>
          </section>
        </main>

        <div className="h-16 lg:hidden" aria-hidden="true" />
        <Footer onAdminLogin={() => setIsAuthModalOpen(true)} />
        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} onSuccess={() => showToast('Đăng nhập thành công!', 'success')} />
        <Cart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} items={cartItems} onUpdateQuantity={updateCartQuantity} onRemoveItem={removeCartItem} onCheckout={() => { setIsCartOpen(false); setCurrentView('checkout'); }} />
        <FloatingActions />
      </motion.div>
    </AnimatePresence>
  );
}
