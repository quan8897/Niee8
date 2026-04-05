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
import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { Product, CartItem, SiteSettings } from './types';
import { 
  auth, db, collection, doc, setDoc, deleteDoc, onSnapshot, query, 
  signInWithGoogle, logout, OperationType, handleFirestoreError 
} from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { LogOut, ShieldCheck, User as UserIcon } from 'lucide-react';

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

  const [products, setProducts] = useState<Product[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'client' | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('niee8_cart');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Error loading cart from localStorage:', error);
      return [];
    }
  });

  // Auth Listener
  useEffect(() => {
    let userDocUnsubscribe: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      // Clean up previous user doc listener if any
      if (userDocUnsubscribe) {
        userDocUnsubscribe();
        userDocUnsubscribe = null;
      }

      if (currentUser) {
        // Check role in Firestore
        userDocUnsubscribe = onSnapshot(doc(db, 'users', currentUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            setUserRole(docSnap.data().role);
          } else {
            // Create default user doc if not exists
            const isDefaultAdmin = currentUser.email === "mnhiiudau8897@gmail.com";
            const role = isDefaultAdmin ? 'admin' : 'client';
            setDoc(doc(db, 'users', currentUser.uid), {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName,
              photoURL: currentUser.photoURL,
              role: role
            }).catch(err => {
              // Only log if it's not a permission error during initial creation
              if (!err.message.includes('insufficient permissions')) {
                handleFirestoreError(err, OperationType.WRITE, 'users');
              }
            });
            setUserRole(role);
          }
        }, (error) => {
          // If we can't read the user doc, we can't determine the role
          console.error("Error listening to user doc:", error);
          // Don't call handleFirestoreError here to avoid potential loops if it re-renders
        });
      } else {
        setUserRole(null);
      }
      setIsAuthReady(true);
    });

    return () => {
      unsubscribe();
      if (userDocUnsubscribe) userDocUnsubscribe();
    };
  }, []);

  // Site Settings Listener
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'site_settings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        setSiteSettings(docSnap.data() as SiteSettings);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'site_settings/global');
    });
    return () => unsubscribe();
  }, []);

  const handleUpdateSettings = async (newSettings: SiteSettings) => {
    try {
      await setDoc(doc(db, 'site_settings', 'global'), newSettings);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'site_settings/global');
    }
  };

  // Products Listener
  useEffect(() => {
    const q = query(collection(db, 'products'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const productsData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Product[];
      
      setProducts(productsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('niee8_cart', JSON.stringify(cartItems));
    } catch (error) {
      console.error('Error saving cart to localStorage:', error);
    }
  }, [cartItems]);

  const handleAddProduct = async (newProduct: Product) => {
    try {
      const productRef = doc(collection(db, 'products'));
      await setDoc(productRef, { ...newProduct, id: productRef.id });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'products');
    }
  };

  const handleUpdateProduct = async (updatedProduct: Product) => {
    try {
      await setDoc(doc(db, 'products', updatedProduct.id), updatedProduct);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `products/${updatedProduct.id}`);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
    }
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
          
          <Header 
            onCartClick={() => setIsCartOpen(true)} 
            cartCount={cartItems.reduce((sum, item) => sum + item.quantity, 0)}
            isAdmin={userRole === 'admin'}
            onAdminClick={() => setIsAdminOpen(true)}
          />
          
          <main className="flex-grow">
            <Hero settings={siteSettings} />
            
            <section className="py-12 bg-white border-b border-nie8-primary/5">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  {user ? (
                    <div className="flex items-center gap-3">
                      <img src={user.photoURL || ''} alt="" className="w-10 h-10 rounded-full border border-nie8-primary/20" referrerPolicy="no-referrer" />
                      <div>
                        <p className="text-xs font-bold text-nie8-text">{user.displayName}</p>
                        <p className="text-[10px] text-nie8-text/40 uppercase tracking-widest flex items-center gap-1">
                          {userRole === 'admin' && <ShieldCheck size={10} className="text-nie8-primary" />}
                          {userRole || 'Client'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 text-nie8-text/40">
                      <div className="w-10 h-10 rounded-full bg-nie8-primary/5 flex items-center justify-center">
                        <UserIcon size={20} />
                      </div>
                      <p className="text-xs italic font-serif">Chào mừng bạn đến với niee8</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  {user ? (
                    <>
                      {userRole === 'admin' && (
                        <button 
                          onClick={() => setIsAdminOpen(true)}
                          className="px-6 py-2 bg-nie8-primary/10 text-nie8-primary rounded-full text-xs font-bold uppercase tracking-widest hover:bg-nie8-primary hover:text-white transition-all"
                        >
                          Quản trị viên
                        </button>
                      )}
                      <button 
                        onClick={logout}
                        className="flex items-center gap-2 text-xs font-bold text-nie8-text/40 hover:text-red-500 transition-colors"
                      >
                        <LogOut size={14} />
                        Đăng xuất
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={signInWithGoogle}
                      className="px-8 py-3 bg-nie8-text text-white rounded-full text-xs font-bold uppercase tracking-widest hover:bg-nie8-primary transition-all shadow-lg shadow-nie8-text/10"
                    >
                      Đăng nhập với Google
                    </button>
                  )}
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
        
        <Footer />
        <AIStylist />

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


