import React from 'react';
import { Sparkles, Instagram } from 'lucide-react';
import { motion } from 'framer-motion';

interface FloatingActionsProps {
  onAIClick: () => void;
}

export default function FloatingActions({ onAIClick }: FloatingActionsProps) {
  return (
    <div className="fixed bottom-24 sm:bottom-8 right-4 sm:right-8 z-[90] flex flex-col gap-3 sm:gap-4">
      {/* AI Stylist - Ẩn trên mobile vì đã có ở thanh điều hướng dưới */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={onAIClick}
        className="hidden sm:flex w-10 h-10 sm:w-14 sm:h-14 bg-nie8-primary text-white rounded-full items-center justify-center shadow-lg shadow-nie8-primary/30 relative group"
        aria-label="AI Stylist"
      >
        <Sparkles size={24} className="scale-75 sm:scale-100" />
        <span className="absolute right-full mr-4 bg-white text-nie8-text text-xs font-bold px-3 py-1.5 rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none hidden sm:block">
          AI Stylist
        </span>
      </motion.button>

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
        <span className="font-bold text-[11px] sm:text-base tracking-tight">Zalo</span>
        <span className="absolute right-full mr-4 bg-white text-nie8-text text-xs font-bold px-3 py-1.5 rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none hidden sm:block">
          Chat Zalo
        </span>
      </motion.a>

      {/* Instagram */}
      <motion.a
        href="https://instagram.com/"
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
    </div>
  );
}
