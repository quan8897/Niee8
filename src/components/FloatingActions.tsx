import { Instagram, Facebook, Music } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FloatingActionsProps {
}

export default function FloatingActions({}: FloatingActionsProps) {
  return (
    <div className="fixed bottom-24 sm:bottom-8 right-4 sm:right-8 z-[90] flex flex-col gap-3 sm:gap-4">
      {/* Zalo - Nền trắng, chữ xanh */}
      <motion.a
        href="https://zalo.me/"
        target="_blank"
        rel="noopener noreferrer"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="w-10 h-10 sm:w-14 sm:h-14 bg-white text-[#0068FF] rounded-full flex items-center justify-center shadow-lg shadow-black/10 relative group"
        aria-label="Zalo"
      >
        <svg viewBox="0 0 24 24" className="w-10 h-10 sm:w-14 sm:h-14 fill-current">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 12.35c-.15.4-.55.65-1.01.65H8.32c-.46 0-.86-.25-1.01-.65-.15-.4-.05-.85.26-1.15l3.24-3.24c.2-.2.51-.2.71 0l3.24 3.24c.31.3.41.75.26 1.15z" className="text-[#0068FF]" />
          <text x="50%" y="55%" textAnchor="middle" dy=".3em" fontSize="6" fontWeight="bold" fill="#0068FF" className="font-sans">Zalo</text>
        </svg>
        <span className="absolute right-full mr-4 bg-white text-nie8-text text-xs font-bold px-3 py-1.5 rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none hidden sm:block">
          Chat Zalo
        </span>
      </motion.a>

      {/* Instagram */}
      <motion.a
        href="https://www.instagram.com/nie8.studio/"
        target="_blank"
        rel="noopener noreferrer"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="w-10 h-10 sm:w-14 sm:h-14 bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white rounded-full flex items-center justify-center shadow-lg shadow-pink-500/30 relative group"
        aria-label="Instagram"
      >
        <Instagram size={24} className="scale-75 sm:scale-100" />
        <span className="absolute right-full mr-4 bg-white text-nie8-text text-xs font-bold px-3 py-1.5 rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none hidden sm:block">
          Instagram
        </span>
      </motion.a>

      {/* Facebook */}
      <motion.a
        href="https://www.facebook.com/"
        target="_blank"
        rel="noopener noreferrer"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="w-10 h-10 sm:w-14 sm:h-14 bg-[#1877F2] text-white rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30 relative group"
        aria-label="Facebook"
      >
        <Facebook size={24} className="scale-75 sm:scale-100" />
        <span className="absolute right-full mr-4 bg-white text-nie8-text text-xs font-bold px-3 py-1.5 rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none hidden sm:block">
          Facebook
        </span>
      </motion.a>

      {/* TikTok */}
      <motion.a
        href="https://www.tiktok.com/@nie8.studio"
        target="_blank"
        rel="noopener noreferrer"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="w-10 h-10 sm:w-14 sm:h-14 bg-black text-white rounded-full flex items-center justify-center shadow-lg shadow-black/30 relative group"
        aria-label="TikTok"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-7 sm:h-7 fill-current">
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.81-.6-4.03-1.37-.01 3.9 0 7.81-.01 11.72-.11 3.12-2.73 5.68-5.85 5.67-4.14-.04-6.85-4.71-4.7-8.25.96-1.54 2.76-2.31 4.54-1.95v4.19c-.83-.35-1.85-.05-2.28.75-.41.74-.15 1.76.57 2.14.73.38 1.67.12 2.05-.59.08-.2.1-.42.09-.64V7.22c-.01-2.4-.01-4.8-.01-7.2z" />
        </svg>
        <span className="absolute right-full mr-4 bg-white text-nie8-text text-xs font-bold px-3 py-1.5 rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none hidden sm:block">
          TikTok
        </span>
      </motion.a>
    </div>
  );
}
