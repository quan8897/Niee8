import { ShoppingBag, Search, Menu, Heart, User, Flower2 } from 'lucide-react';
import { motion, useScroll, useTransform } from 'motion/react';
import { useState, useEffect } from 'react';

interface HeaderProps {
  onCartClick: () => void;
  cartCount: number;
  isAdmin?: boolean;
  onAdminClick?: () => void;
}

export default function Header({ onCartClick, cartCount, isAdmin, onAdminClick }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const { scrollY } = useScroll();
  
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      isScrolled ? 'bg-white/90 backdrop-blur-xl py-4 shadow-sm' : 'bg-transparent py-8'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-8 text-xs font-medium tracking-[0.2em] uppercase hidden lg:flex">
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
          </div>

          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative flex flex-col items-center"
          >
            <Flower2 size={16} className="text-nie8-primary absolute -top-4 right-2 opacity-80" />
            <div className="text-3xl font-serif italic text-nie8-text tracking-tighter lowercase">
              niee<span className="text-4xl not-italic">8</span>
            </div>
          </motion.div>

          <div className="flex items-center gap-6">
            <button className="text-nie8-text hover:text-nie8-primary transition-colors hidden sm:block">
              <Search size={18} />
            </button>
            <button className="text-nie8-text hover:text-nie8-primary transition-colors">
              <User size={18} />
            </button>
            <button 
              onClick={onCartClick}
              className="text-nie8-text hover:text-nie8-primary transition-colors relative"
            >
              <ShoppingBag size={18} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-nie8-primary text-nie8-white text-[8px] w-3.5 h-3.5 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
            <button className="lg:hidden text-nie8-text">
              <Menu size={20} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
