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
import React, { useState, useEffect } from 'react';
import { Product, CartItem, SiteSettings } from './types';
import {
  auth, db, collection, doc, setDoc, deleteDoc, onSnapshot, query,
  signInWithGoogle, logout, OperationType, handleFirestoreError
} from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { LogOut, ShieldCheck, User as UserIcon, CheckCircle, AlertCircle } from 'lucide-react';

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

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAIStylistOpen, setIsAIStylistOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'client' | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Toast helper
  const showToast = (message: string, type: Toast['type'] = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  // Cart state — lưu size vào CartItem
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('niee8_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Auth listener
  useEffect(() => {
    let userDocUnsubscribe: (() => void) | null = null;
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (userDocUnsubscribe) { userDocUnsubscribe(); userDocUnsubscribe = null; }

      if (currentUser) {
        userDocUnsubscribe = onSnapshot(doc(db, 'users', currentUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            setUserRole(docSnap.data().role);
          } else {
            const isDefaultAdmin = currentUser.email === "mnhiiudau8897@gmail.com";
            const role = isDefaultAdmin ? 'admin' : 'client';
            setDoc(doc(db, 'users', currentUser.uid), {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName,
              photoURL: currentUser.photoURL,
              role,
            }).catch(err => {
              if (!err.message.includes('insufficient permissions')) {
                handleFirestoreError(err, OperationType.WRITE, 'users');
              }
            });
            setUserRole(role);
          }
        }, (error) => console.error("Error listening to user doc:", error));
      } else {
        setUserRole(null);
      }
      setIsAuthReady(true);
    });

    return () => { unsubscribe(); if (userDocUnsubscribe) userDocUnsubscribe(); };
  }, []);

  // Site settings listener
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'site_settings', 'global'), (docSnap) => {
      if (docSnap.exists()) setSiteSettings(docSnap.data() as SiteSettings);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'site_settings/global'));
    return () => unsubscribe();
  }, []);

  const handleUpdateSettings = async (newSettings: SiteSettings) => {
    try {
      await setDoc(doc(db, 'site_settings', 'global'), newSettings);
      showToast('Đã cập nhật cài đặt website!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'site_settings/global');
    }
  };

  // Products listener — với loading state
  useEffect(() => {
    const q = query(collection(db, 'products'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const productsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Product[];
      setProducts(productsData);
      setIsLoadingProducts(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
      setIsLoadingProducts(false);
    });
    return () => unsubscribe();
  }, []);

  // Persist cart
  useEffect(() => {
    try {
      localStorage.setItem('niee8_cart', JSON.stringify(cartItems));
    } catch (error) {
      console.error('Error saving cart:', error);
    }
  }, [cartItems]);

  // Product CRUD
  const handleAddProduct = async (newProduct: Product) => {
    try {
      const productRef = doc(collection(db, 'products'));
      await setDoc(productRef, { ...newProduct, id: productRef.id });
      showToast('Đã thêm sản phẩm mới!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'products');
    }
  };

  const handleUpdateProduct = async (updatedProduct: Product) => {
    try {
      await setDoc(doc(db, 'products', updatedProduct.id), updatedProduct);
      showToast('Đã cập nhật sản phẩm!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `products/${updatedProduct.id}`);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'products', id));
      showToast('Đã xóa sản phẩm', 'info');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
    }
  };

  // Cart logic — key là id + size để phân biệt cùng sản phẩm khác size
  const addToCart = (product: Product, size: string = 'M') => {
    setCartItems(prev => {
      const cartKey = `${product.id}-${size}`;
      const existing = prev.find(item => `${item.id}-${item.size}` === cartKey);
      if (existing) {
        return prev.map(item =>
          `${item.id}-${item.size}` === cartKey
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1, size }];
    });
    showToast(`Đã thêm vào giỏ — Size ${size} ✓`);
  };

  const updateCartQuantity = (id: string, size: string, delta: number) => {
    setCartItems(prev => prev.map(item => {
      if (item.id === id && item.size === size) {
        const newQty = item.quantity + delta;
        if (newQty <= 0) return null as unknown as CartItem;
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(Boolean));
  };

  const removeCartItem = (id: string, size: string) => {
    setCartItems(prev => prev.filter(item => !(item.id === id && item.size === size)));
    showToast('Đã xóa khỏi giỏ hàng', 'info');
  };

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

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
        {/* Progress bar */}
        <motion.div
          className="fixed top-0 left-0 right-0 h-[2px] bg-nie8-primary origin-left z-[60]"
          style={{ scaleX }}
        />

        {/* Toast notifications */}
        <ToastContainer toasts={toasts} onRemove={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />

        <Header
          onCartClick={() => setIsCartOpen(true)}
          cartCount={cartCount}
          isAdmin={userRole === 'admin'}
          onAdminClick={() => setIsAdminOpen(true)}
          onAIClick={() => setIsAIStylistOpen(true)}
        />

        <main className="flex-grow">
          <Hero settings={siteSettings} />

          {/* Auth section */}
          <section className="py-8 sm:py-12 bg-white border-b border-nie8-primary/5">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {user ? (
                  <>
                    <img
                      src={user.photoURL || ''}
                      alt=""
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-nie8-primary/20"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <p className="text-xs font-bold text-nie8-text">{user.displayName}</p>
                      <p className="text-[10px] text-nie8-text/40 uppercase tracking-widest flex items-center gap-1">
                        {userRole === 'admin' && <ShieldCheck size={10} className="text-nie8-primary" />}
                        {userRole || 'Client'}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-3 text-nie8-text/40">
                    <div className="w-9 h-9 rounded-full bg-nie8-primary/5 flex items-center justify-center">
                      <UserIcon size={18} />
                    </div>
                    <p className="text-xs italic font-serif">Chào mừng đến với niee8</p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                {user ? (
                  <>
                    {userRole === 'admin' && (
                      <button
                        onClick={() => setIsAdminOpen(true)}
                        className="px-5 py-2 bg-nie8-primary/10 text-nie8-primary rounded-full text-xs font-bold uppercase tracking-widest hover:bg-nie8-primary hover:text-white transition-all"
                      >
                        Quản trị
                      </button>
                    )}
                    <button
                      onClick={logout}
                      className="flex items-center gap-2 text-xs font-bold text-nie8-text/40 hover:text-red-500 transition-colors"
                    >
                      <LogOut size={14} />
                      <span className="hidden sm:inline">Đăng xuất</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={signInWithGoogle}
                    className="px-6 py-2.5 sm:px-8 sm:py-3 bg-nie8-text text-white rounded-full text-xs font-bold uppercase tracking-widest hover:bg-nie8-primary transition-all shadow-lg active:scale-95"
                  >
                    Đăng nhập với Google
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Product Grid — với loading state và addToCart nhận size */}
          <ProductGrid
            products={products}
            onAddToCart={addToCart}
            isLoading={isLoadingProducts}
          />

          {/* Newsletter section */}
          <section className="py-20 sm:py-32 bg-nie8-text relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
                className="max-w-3xl mx-auto"
              >
                <h2 className="text-4xl sm:text-6xl md:text-7xl font-serif italic text-white mb-6 sm:mb-10 leading-tight">
                  Gia nhập <br />
                  <span className="text-nie8-primary">niee8 Circle.</span>
                </h2>
                <p className="text-white/60 text-base sm:text-lg mb-8 sm:mb-12 leading-relaxed max-w-xl mx-auto">
                  Nhận quyền truy cập sớm vào các bộ sưu tập mới và mẹo phối đồ độc quyền.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 max-w-sm sm:max-w-md mx-auto">
                  <input
                    type="email"
                    placeholder="Địa chỉ email của bạn"
                    className="flex-grow bg-white/10 border border-white/20 rounded-full px-6 py-4 text-white placeholder-white/40 focus:outline-none focus:border-nie8-primary transition-colors text-sm"
                  />
                  <button className="px-8 py-4 bg-nie8-primary text-white rounded-full font-bold text-sm hover:bg-nie8-secondary transition-all active:scale-95 whitespace-nowrap">
                    Đăng ký
                  </button>
                </div>
              </motion.div>
            </div>
          </section>
        </main>

        {/* Spacer cho mobile bottom nav */}
        <div className="h-16 lg:hidden" aria-hidden="true" />

        <Footer />

        {/* AI Stylist — controlled by state thay vì luôn show */}
        <AIStylist isOpen={isAIStylistOpen} onClose={() => setIsAIStylistOpen(false)} />

        {/* Admin Dashboard */}
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
            />
          )}
        </AnimatePresence>

        {/* Cart */}
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
