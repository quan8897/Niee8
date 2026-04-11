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
        <svg viewBox="0 0 512 512" className="w-6 h-6 sm:w-8 sm:h-8 fill-[#0068FF]">
          <path d="M470.5 210c.8 40.5-12.7 79.5-38.6 110.6-28.5 34.3-68.5 59.5-112.7 71s-91 7.2-132.1-13.6c-41.1-20.8-73.4-54.8-91.1-95.7-17.6-40.9-20.7-86.4-8.8-128s37.7-77.8 72.8-102c35.1-24.2 77.1-36.4 120-34.4 42.9 2.1 83.9 18.2 115.5 45.4s53.1 63.8 60.5 105.7c2.1 11.5 3.3 23.1 3.5 34.8-.4 2.1-.5 4.3-.5 6.5s.1 4.3.5 6.4c-4.2 0-8.5.1-12.7.4-42 .4-83.9-10.3-119.8-31.1-35.9-20.7-65.4-50.6-84.4-86.2-1.9-3.5-3.6-7.1-5.1-10.7-16.7 34.7-41.9 64.9-73 87.5-31.1 22.6-67.6 36.4-105.7 40-2.4 20.3-3.2 40.8-2.5 61.2 1.3 40.5 13.9 79.7 36.5 113.3 22.5 33.6 54.4 59.8 92.2 75.7s79 21.3 118.8 15.6c39.8-5.8 76.5-22.3 106-47.5 29.5-25.2 50.8-58.4 61.4-96 10.6-37.6 11.2-77.5 1.6-115.5-2.6-10.1-5.8-20-9.6-29.6zm-175.7 87.2H203.2v-16.6l55.8-57.9h-52.6v-23.7h91.1v16.3l-56.1 58.2h53v23.7z"/>
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
        <svg viewBox="0 0 448 512" className="w-5 h-5 sm:w-7 sm:h-7 fill-white">
          <path d="M448 209.91a210.06 210.06 0 0 1-122.77-39.25V349.38A138.42 138.42 0 1 1 186.83 211c4.13 0 8.16.32 12.11.93v77.67a76.47 76.47 0 1 0-7.31 59.78V0h94.22a108.81 108.81 0 0 0 20.9 62.24 109.13 109.13 0 0 0 81.25 47v90.67h-.03z"/>
        </svg>
        <span className="absolute right-full mr-4 bg-white text-nie8-text text-xs font-bold px-3 py-1.5 rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none hidden sm:block">
          TikTok
        </span>
      </motion.a>
    </div>
  );
}
