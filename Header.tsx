import { ShoppingBag, Search, Menu, Heart, Home, Sparkles, User as UserIcon, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect } from 'react';

interface HeaderProps {
  onCartClick: () => void;
  cartCount: number;
  isAdmin?: boolean;
  onAdminClick?: () => void;
  onAIClick?: () => void;
}

export default function Header({ onCartClick, cartCount, isAdmin, onAdminClick, onAIClick }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeNav, setActiveNav] = useState('home');

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Lock scroll khi menu mở
  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMenuOpen]);

  return (
    <>
      {/* ===== TOP HEADER ===== */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-white/95 backdrop-blur-xl py-3 shadow-sm' : 'bg-transparent py-5 sm:py-8'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">

            {/* Desktop nav links */}
            <nav className="hidden lg:flex items-center gap-8 text-xs font-medium tracking-[0.2em] uppercase">
              <a href="#" className="hover:text-nie8-primary transition-colors">Cửa hàng</a>
              <a href="#" className="hover:text-nie8-primary transition-colors">Bộ sưu tập</a>
              <a href="#" className="hover:text-nie8-primary transition-colors">Về niee8</a>
              {isAdmin && (
                <button
                  onClick={onAdminClick}
                  className="text-nie8-primary font-bold hover:text-nie8-secondary transition-colors"
                >
                  Quản trị
                </button>
              )}
            </nav>

            {/* Mobile: Hamburger */}
            <button
              className="lg:hidden w-9 h-9 flex items-center justify-center text-nie8-text"
              onClick={() => setIsMenuOpen(true)}
            >
              <Menu size={22} />
            </button>

            {/* Logo — center */}
            <motion.a
              href="#"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute left-1/2 -translate-x-1/2 text-2xl sm:text-3xl font-serif italic text-nie8-text tracking-tighter lowercase select-none"
            >
              niee<span className="text-3xl sm:text-4xl not-italic">8</span>
            </motion.a>

            {/* Right actions */}
            <div className="flex items-center gap-3 sm:gap-5">
              <button
                aria-label="Tìm kiếm"
                className="hidden sm:flex text-nie8-text hover:text-nie8-primary transition-colors"
              >
                <Search size={18} />
              </button>
              <button
                aria-label="Yêu thích"
                className="hidden sm:flex text-nie8-text hover:text-nie8-primary transition-colors"
              >
                <Heart size={18} />
              </button>
              {/* Cart button — luôn hiển thị, kể cả mobile */}
              <button
                onClick={onCartClick}
                aria-label="Giỏ hàng"
                className="relative text-nie8-text hover:text-nie8-primary transition-colors"
              >
                <ShoppingBag size={20} />
                <AnimatePresence>
                  {cartCount > 0 && (
                    <motion.span
                      key={cartCount}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute -top-1.5 -right-1.5 bg-nie8-primary text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold"
                    >
                      {cartCount > 9 ? '9+' : cartCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ===== MOBILE MENU DRAWER ===== */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-[300] lg:hidden"
              onClick={() => setIsMenuOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="fixed top-0 left-0 bottom-0 w-72 bg-white z-[301] flex flex-col shadow-2xl"
            >
              {/* Menu header */}
              <div className="flex items-center justify-between p-6 border-b border-nie8-primary/10">
                <span className="text-2xl font-serif italic text-nie8-text">niee8</span>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="w-9 h-9 rounded-full border border-nie8-primary/20 flex items-center justify-center"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Menu items */}
              <nav className="flex-grow p-6 space-y-1">
                {[
                  { label: 'Trang chủ', href: '#' },
                  { label: 'Cửa hàng', href: '#' },
                  { label: 'Bộ sưu tập', href: '#' },
                  { label: 'Hàng mới về', href: '#', badge: 'Mới' },
                  { label: 'Về niee8', href: '#' },
                  { label: 'Liên hệ', href: '#' },
                ].map(item => (
                  <a
                    key={item.label}
                    href={item.href}
                    className="flex items-center justify-between py-3.5 border-b border-nie8-primary/5 text-nie8-text hover:text-nie8-primary transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <span className="font-medium">{item.label}</span>
                    {item.badge && (
                      <span className="text-[10px] bg-nie8-primary text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                        {item.badge}
                      </span>
                    )}
                  </a>
                ))}

                {isAdmin && (
                  <button
                    onClick={() => { onAdminClick?.(); setIsMenuOpen(false); }}
                    className="w-full text-left py-3.5 border-b border-nie8-primary/5 text-nie8-primary font-bold"
                  >
                    ⚙️ Quản trị viên
                  </button>
                )}
              </nav>

              {/* Menu footer */}
              <div className="p-6 border-t border-nie8-primary/10">
                <p className="text-xs text-nie8-text/30 uppercase tracking-widest">© 2024 niee8</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ===== MOBILE BOTTOM NAVIGATION BAR ===== */}
      {/* Đây là thành phần quan trọng nhất cho UX mobile — như app thật */}
      <nav className="fixed bottom-0 left-0 right-0 z-[50] lg:hidden safe-area-pb">
        <div className="bg-white/95 backdrop-blur-xl border-t border-nie8-primary/10 px-2 py-2">
          <div className="flex items-center justify-around max-w-sm mx-auto">

            {/* Home */}
            <button
              onClick={() => setActiveNav('home')}
              className={`flex flex-col items-center gap-1 min-w-[56px] py-1 transition-colors ${activeNav === 'home' ? 'text-nie8-primary' : 'text-nie8-text/40'}`}
            >
              <Home size={22} strokeWidth={activeNav === 'home' ? 2.5 : 1.8} />
              <span className="text-[9px] font-bold uppercase tracking-widest">Home</span>
            </button>

            {/* Search */}
            <button
              onClick={() => setActiveNav('search')}
              className={`flex flex-col items-center gap-1 min-w-[56px] py-1 transition-colors ${activeNav === 'search' ? 'text-nie8-primary' : 'text-nie8-text/40'}`}
            >
              <Search size={22} strokeWidth={activeNav === 'search' ? 2.5 : 1.8} />
              <span className="text-[9px] font-bold uppercase tracking-widest">Tìm</span>
            </button>

            {/* AI Stylist — CTA chính giữa, nổi bật nhất */}
            <button
              onClick={onAIClick}
              className="flex flex-col items-center gap-1 -mt-5"
            >
              <div className="w-14 h-14 bg-nie8-primary rounded-full flex items-center justify-center shadow-xl shadow-nie8-primary/40 active:scale-90 transition-transform">
                <Sparkles size={24} className="text-white" />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-nie8-primary">AI Stylist</span>
            </button>

            {/* Wishlist */}
            <button
              onClick={() => setActiveNav('wishlist')}
              className={`flex flex-col items-center gap-1 min-w-[56px] py-1 transition-colors ${activeNav === 'wishlist' ? 'text-nie8-primary' : 'text-nie8-text/40'}`}
            >
              <Heart size={22} strokeWidth={activeNav === 'wishlist' ? 2.5 : 1.8} />
              <span className="text-[9px] font-bold uppercase tracking-widest">Yêu thích</span>
            </button>

            {/* Cart */}
            <button
              onClick={() => { setActiveNav('cart'); onCartClick(); }}
              className={`relative flex flex-col items-center gap-1 min-w-[56px] py-1 transition-colors ${activeNav === 'cart' ? 'text-nie8-primary' : 'text-nie8-text/40'}`}
            >
              <div className="relative">
                <ShoppingBag size={22} strokeWidth={activeNav === 'cart' ? 2.5 : 1.8} />
                <AnimatePresence>
                  {cartCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1.5 -right-1.5 bg-nie8-primary text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-black"
                    >
                      {cartCount > 9 ? '9+' : cartCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              <span className="text-[9px] font-bold uppercase tracking-widest">Giỏ hàng</span>
            </button>

          </div>
        </div>
      </nav>

      {/* Spacer để content không bị che bởi bottom nav trên mobile */}
      <div className="h-16 lg:hidden" aria-hidden="true" />
    </>
  );
}
