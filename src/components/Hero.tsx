import { motion } from 'motion/react';
import { ArrowRight, Play } from 'lucide-react';
import { SiteSettings } from '../types';
import ProtectedImage from './ProtectedImage';

interface HeroProps {
  settings: SiteSettings | null;
}

export default function Hero({ settings }: HeroProps) {
  const heroImage = settings?.heroImage || "https://images.unsplash.com/photo-1551163943-3f6a855d1153?q=80&w=1920&auto=format&fit=crop";
  const heroTitle = settings?.heroTitle || "nie8.";
  const heroSubtitle = settings?.heroSubtitle || "Minimalist Romantic & Craftsmanship";
  const heroDescription = settings?.heroDescription || "Những thiết kế tinh tuyển dành cho người phụ nữ hiện đại, trân trọng chất lượng hơn số lượng. Kiểu dáng vượt thời gian trong bảng màu trung tính.";

  return (
    <section className="relative min-h-screen pt-20 flex items-center overflow-hidden bg-nie8-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex flex-col lg:flex-row items-center gap-12 lg:gap-24 py-12">
        
        {/* Text Editorial - Cột trái */}
        <div className="w-full lg:w-1/2 z-20 order-2 lg:order-1">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="flex items-center gap-6 mb-10"
          >
            <div className="h-[1px] w-16 bg-nie8-primary"></div>
            <span className="text-nie8-secondary text-[10px] sm:text-xs font-bold tracking-[0.4em] uppercase">{heroSubtitle}</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.2 }}
            className="text-6xl sm:text-8xl md:text-[10rem] font-serif italic text-nie8-text leading-[0.85] mb-10 lowercase tracking-tighter"
          >
            {heroTitle.endsWith('.') ? (
              <>
                {heroTitle.slice(0, -1)}<span className="text-nie8-primary">.</span>
              </>
            ) : (
              heroTitle
            )}
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mb-14"
          >
            <p className="text-base sm:text-lg text-nie8-text/50 leading-relaxed max-w-sm font-light">
              {heroDescription}
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row items-start sm:items-center gap-8"
          >
            <button className="group relative px-12 py-5 bg-nie8-primary text-white text-sm font-bold uppercase tracking-widest overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-nie8-primary/30 active:scale-95 rounded-full">
              <span className="relative z-10 flex items-center gap-3">
                Khám phá ngay
                <ArrowRight size={18} className="transition-transform duration-500 group-hover:translate-x-2" />
              </span>
            </button>
            <div className="h-[1px] w-12 bg-nie8-primary/20 hidden sm:block"></div>
            <button className="text-[10px] font-bold uppercase tracking-[0.3em] text-nie8-text/40 hover:text-nie8-primary transition-colors duration-300">
               Issue No. 01 / 2026
            </button>
          </motion.div>
        </div>

        {/* Hero Image Block - Cột phải */}
        <div className="w-full lg:w-1/2 relative order-1 lg:order-2">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: 50 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="relative aspect-[3/4] sm:aspect-[4/5] rounded-[40px] sm:rounded-[80px] overflow-hidden shadow-2xl border-4 border-white/20"
          >
            <ProtectedImage 
              src={heroImage} 
              alt="Nie8 Editorial" 
              className="w-full h-full object-cover transition-transform duration-[3s] hover:scale-110"
              containerClassName="w-full h-full"
              referrerPolicy="no-referrer"
            />
            {/* Overlay Gradient nhẹ */}
            <div className="absolute inset-0 bg-gradient-to-tr from-nie8-primary/10 to-transparent pointer-events-none" />
          </motion.div>
          
          {/* Decorative Elements */}
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-nie8-primary/5 rounded-full blur-3xl -z-10" />
          <div className="absolute -top-10 -right-10 w-60 h-60 bg-white/40 rounded-full blur-3xl -z-10" />
        </div>
      </div>

    </section>
  );
}
