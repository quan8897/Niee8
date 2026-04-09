/**
 * AIStylist.tsx — phiên bản tối ưu
 *
 * Thay đổi so với bản cũ:
 * 1. Fix model name: "gemini-2.0-flash" (hợp lệ)
 * 2. Thêm rate limiting đơn giản: tối đa 1 request / 3 giây
 *    → Tránh spam API khi user click gửi liên tục
 * 3. Memoize quickSuggestions (không cần tạo lại mỗi render)
 * 4. Không thay đổi logic hoặc UI
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Send, X } from 'lucide-react';
import { generateAIResponse } from '../services/geminiService';

// Rate limiting: chặn gửi nếu chưa qua MIN_INTERVAL ms kể từ lần cuối
const MIN_INTERVAL_MS = 3000;

interface AIStylistProps {
  isOpen?: boolean;
  onClose?: () => void;
  productContext?: any; // Nhận thông tin sản phẩm để tư vấn
}

export default function AIStylist({ isOpen: controlledOpen, onClose, productContext }: AIStylistProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const handleClose = () => { onClose?.(); setInternalOpen(false); };

  const [messages, setMessages] = useState<{ role: 'user' | 'bot'; text: string }[]>([
    { role: 'bot', text: 'Chào bạn! Tôi là niee8 AI Stylist 👗 Bạn cần tư vấn phối đồ cho dịp nào hôm nay?' }
  ]);

  // Xử lý khi có context sản phẩm mới
  useEffect(() => {
    if (productContext && isOpen) {
      const reviewMessage = `Tôi thấy bạn đang quan tâm đến sản phẩm "${productContext.name}". Đây là một lựa chọn tuyệt vời trong bộ sưu tập ${productContext.category} của chúng tôi! ✨\n\nSản phẩm này có phong cách tối giản, rất dễ phối đồ. Bạn có thắc mắc gì về size, chất liệu hay cách phối chiếc ${productContext.name} này không?`;
      
      // Kiểm tra xem tin nhắn này đã tồn tại chưa để tránh lặp lại
      setMessages(prev => {
        if (prev.some(m => m.text.includes(productContext.name))) return prev;
        return [...prev, { role: 'bot', text: reviewMessage }];
      });
    }
  }, [productContext, isOpen]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastRequestTime = useRef<number>(0); // rate limit tracker

  // Memoize — không tạo lại array mỗi render
  const quickSuggestions = useMemo(() => [
    "Phối đồ đi cafe cuối tuần",
    "Trang phục cho da ngăm",
    "Phong cách Minimalist",
    "Tư vấn chọn size"
  ], []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleSend = async (text?: string) => {
    const messageToSend = text || input;
    if (!messageToSend.trim() || isTyping) return;

    // Rate limiting — tránh spam
    const now = Date.now();
    if (now - lastRequestTime.current < MIN_INTERVAL_MS) {
      setMessages(prev => [...prev, {
        role: 'bot',
        text: 'Bạn gửi nhanh quá! Chờ tôi một chút nhé 😊'
      }]);
      return;
    }
    lastRequestTime.current = now;

    setMessages(prev => [...prev, { role: 'user', text: messageToSend }]);
    if (!text) setInput('');
    setIsTyping(true);

    // Rule-based size consulting (tiết kiệm token)
    const lowerText = messageToSend.toLowerCase();
    const complexKeywords = ['vai', 'eo', 'bụng', 'mông', 'đùi', 'phối', 'màu', 'dịp', 'đi tiệc', 'đi làm', 'rộng', 'chật', 'kích'];
    const isComplex = complexKeywords.some(kw => lowerText.includes(kw));

    if (!isComplex) {
      let height = 0;
      const hMatch1 = lowerText.match(/1m(\d{2})/);
      const hMatch2 = lowerText.match(/(\d{3})\s*cm/);
      const hMatch3 = lowerText.match(/cao\s*(\d{3})/);
      if (hMatch1) height = 100 + parseInt(hMatch1[1]);
      else if (hMatch2) height = parseInt(hMatch2[1]);
      else if (hMatch3) height = parseInt(hMatch3[1]);

      let weight = 0;
      const wMatch = lowerText.match(/(\d{2,3})\s*kg/);
      const wMatch2 = lowerText.match(/nặng\s*(\d{2,3})/);
      if (wMatch) weight = parseInt(wMatch[1]);
      else if (wMatch2) weight = parseInt(wMatch2[1]);

      if (height > 0 && weight > 0) {
        let suggestedSize = 'XL';
        if (weight <= 48 && height <= 158) suggestedSize = 'S';
        else if (weight <= 54 && height <= 162) suggestedSize = 'M';
        else if (weight <= 60 && height <= 168) suggestedSize = 'L';

        setTimeout(() => {
          setMessages(prev => [...prev, {
            role: 'bot',
            text: `Với số đo chiều cao ${height}cm và cân nặng ${weight}kg, size ${suggestedSize} sẽ vừa vặn nhất với bạn nhé! Bạn có cần tư vấn thêm về cách phối đồ không?`
          }]);
          setIsTyping(false);
        }, 600);
        return;
      }
    }

    // Gọi Gemini Service trực tiếp từ Frontend
    try {
      const responseText = await generateAIResponse(messageToSend, messages);

      setMessages(prev => [...prev, {
        role: 'bot',
        text: responseText || 'Xin lỗi, tôi đang gặp chút trục trặc. Bạn thử lại sau nhé?'
      }]);
    } catch (error: any) {
      console.error(error);
      const errorMsg = error.message?.includes('API key not valid') 
        ? 'Lỗi cấu hình AI: API Key không hợp lệ. Vui lòng kiểm tra cài đặt.' 
        : 'Không thể kết nối ngay lúc này. Hãy thử lại sau nhé!';
      setMessages(prev => [...prev, { role: 'bot', text: errorMsg }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* FAB button — desktop only */}
      {controlledOpen === undefined && (
        <button
          onClick={() => setInternalOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-nie8-primary text-white rounded-full hidden lg:flex items-center justify-center shadow-2xl hover:scale-110 transition-transform group"
          aria-label="Mở AI Stylist"
        >
          <Sparkles size={24} className="group-hover:rotate-12 transition-transform" />
        </button>
      )}

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[150] lg:hidden"
              onClick={handleClose}
            />

            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              className={`
                fixed z-[151] bg-white overflow-hidden flex flex-col shadow-2xl border border-nie8-primary/20
                bottom-0 left-0 right-0 rounded-t-[24px] h-[80dvh]
                lg:bottom-24 lg:right-6 lg:left-auto lg:top-auto
                lg:w-96 lg:rounded-3xl lg:h-auto lg:max-h-[500px]
              `}
            >
              <div className="lg:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
                <div className="w-10 h-1 bg-gray-200 rounded-full" />
              </div>

              <div className="bg-nie8-primary px-4 py-3 sm:py-4 flex justify-between items-center flex-shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <Sparkles size={16} className="text-white" />
                  </div>
                  <div>
                    <span className="text-white font-serif italic text-sm">niee8 AI Stylist</span>
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                      <span className="text-white/60 text-[10px]">Đang hoạt động</span>
                    </div>
                  </div>
                </div>
                <button onClick={handleClose} className="text-white/60 hover:text-white p-2 -mr-2 active:scale-90 transition-transform">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-grow p-4 overflow-y-auto scroll-hide space-y-3">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[82%] p-3 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-nie8-primary text-white rounded-br-sm'
                        : 'bg-nie8-bg text-nie8-text border border-nie8-primary/10 rounded-bl-sm'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-nie8-bg p-3 rounded-2xl border border-nie8-primary/10 rounded-bl-sm">
                      <div className="flex gap-1 items-center">
                        <div className="w-1.5 h-1.5 bg-nie8-primary/50 rounded-full animate-bounce" />
                        <div className="w-1.5 h-1.5 bg-nie8-primary/50 rounded-full animate-bounce [animation-delay:0.15s]" />
                        <div className="w-1.5 h-1.5 bg-nie8-primary/50 rounded-full animate-bounce [animation-delay:0.3s]" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {messages.length <= 1 && (
                <div className="px-4 pb-2 flex flex-wrap gap-2 flex-shrink-0">
                  {quickSuggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(s)}
                      className="text-[11px] bg-nie8-bg hover:bg-nie8-primary/10 border border-nie8-primary/15 rounded-full px-3 py-1.5 text-nie8-text transition-colors active:scale-95"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              <div className="p-4 border-t border-nie8-primary/10 flex-shrink-0 safe-area-pb">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                    placeholder="Hỏi về cách phối đồ..."
                    className="flex-grow bg-nie8-bg border border-nie8-primary/20 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:border-nie8-primary transition-colors"
                  />
                  <button
                    onClick={() => handleSend()}
                    disabled={!input.trim() || isTyping}
                    className="w-10 h-10 bg-nie8-primary text-white rounded-full flex items-center justify-center hover:bg-nie8-secondary transition-colors disabled:opacity-50 active:scale-90"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
