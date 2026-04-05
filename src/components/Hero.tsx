import { motion } from 'motion/react';
import { ArrowRight, Play } from 'lucide-react';
import { SiteSettings } from '../types';

interface HeroProps {
  settings: SiteSettings | null;
}

export default function Hero({ settings }: HeroProps) {
  const heroImage = settings?.heroImage || "https://images.unsplash.com/photo-1551163943-3f6a855d1153?q=80&w=1920&auto=format&fit=crop";
  const heroTitle = settings?.heroTitle || "niee8.";
  const heroSubtitle = settings?.heroSubtitle || "Minimalist Romantic & Craftsmanship";
  const heroDescription = settings?.heroDescription || "Những thiết kế tinh tuyển dành cho người phụ nữ hiện đại, trân trọng chất lượng hơn số lượng. Kiểu dáng vượt thời gian trong bảng màu trung tính.";

  return (
    <section className="relative h-screen flex items-center overflow-hidden bg-nie8-bg">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-r from-nie8-bg via-nie8-bg/40 to-transparent z-10"></div>
        <motion.img 
          key={heroImage}
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 2, ease: "easeOut" }}
          src={heroImage} 
          alt="Hero Fashion" 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      </div>

      <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="max-w-2xl">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex items-center gap-4 mb-8"
          >
            <div className="h-[1px] w-12 bg-nie8-primary"></div>
            <span className="text-nie8-secondary text-xs font-medium tracking-[0.3em] uppercase">{heroSubtitle}</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="text-5xl sm:text-6xl md:text-8xl font-serif italic text-nie8-text leading-[0.9] mb-8 md:mb-10 lowercase"
          >
            {heroTitle.endsWith('.') ? (
              <>
                {heroTitle.slice(0, -1)}<span className="text-nie8-primary">.</span>
              </>
            ) : (
              heroTitle
            )}
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-lg text-nie8-text/60 mb-12 leading-relaxed max-w-md"
          >
            {heroDescription}
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-8"
          >
            <button className="w-full sm:w-auto px-10 py-4 sm:px-12 sm:py-5 bg-nie8-primary text-nie8-white text-base sm:text-lg rounded-full font-bold hover:bg-nie8-text hover:scale-105 hover:shadow-2xl hover:shadow-nie8-text/30 transition-all duration-300 flex items-center justify-center gap-3 group">
              Mua ngay
              <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform duration-300" />
            </button>
            <button className="w-full sm:w-auto flex items-center justify-center sm:justify-start gap-4 text-nie8-text text-base sm:text-lg font-bold group hover:text-nie8-primary transition-colors duration-300">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-nie8-text/20 flex items-center justify-center group-hover:bg-nie8-primary group-hover:border-nie8-primary group-hover:text-nie8-white group-hover:scale-110 group-hover:shadow-xl transition-all duration-300">
                <Play size={18} fill="currentColor" className="ml-1" />
              </div>
              Xem phim ngắn
            </button>
          </motion.div>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1.2, delay: 0.4 }}
        className="absolute right-0 top-1/2 -translate-y-1/2 w-[30%] h-[70%] z-20 hidden lg:block"
      >
        <div className="relative w-full h-full p-8 bg-white/10 backdrop-blur-md rounded-l-[100px] border-l border-y border-white/20">
          <img 
            src="https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?q=80&w=800&auto=format&fit=crop" 
            alt="Side product" 
            className="w-full h-full object-cover rounded-l-[80px] shadow-2xl"
            referrerPolicy="no-referrer"
          />
          <div className="absolute -left-12 top-1/2 -translate-y-1/2 bg-white p-6 rounded-3xl shadow-2xl">
            <p className="text-[10px] uppercase tracking-widest text-nie8-secondary mb-1">Sản phẩm nổi bật</p>
            <p className="text-sm font-serif italic text-nie8-text">Sơ mi Lụa Hoa Nhí</p>
            <p className="text-xs font-semibold text-nie8-secondary mt-2">$240.00</p>
          </div>
        </div>
      </motion.div>

      {/* Small secondary image in the bottom right corner */}
      <motion.div
        initial={{ opacity: 0, y: 50, rotate: 5 }}
        animate={{ opacity: 1, y: 0, rotate: -2 }}
        transition={{ duration: 1, delay: 0.8 }}
        className="absolute bottom-12 right-12 z-30 hidden md:block w-48 h-64 rounded-lg overflow-hidden border-[6px] border-white shadow-2xl hover:rotate-0 hover:scale-105 transition-all duration-500"
      >
        <img 
          src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=600&auto=format&fit=crop" 
          alt="Secondary Fashion" 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      </motion.div>
    </section>
  );
}
