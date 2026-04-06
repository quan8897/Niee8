import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Send, X } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

const getAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is missing.");
  return new GoogleGenAI({ apiKey });
};

interface AIStylistProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function AIStylist({ isOpen: controlledOpen, onClose }: AIStylistProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  // Hỗ trợ cả controlled và uncontrolled mode
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const handleClose = () => { onClose?.(); setInternalOpen(false); };
  const handleOpen = () => { setInternalOpen(true); };

  const [messages, setMessages] = useState<{ role: 'user' | 'bot'; text: string }[]>([
    { role: 'bot', text: 'Chào bạn! Tôi là niee8 AI Stylist 👗 Bạn cần tư vấn phối đồ cho dịp nào hôm nay?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickSuggestions = [
    "Phối đồ đi cafe cuối tuần",
    "Trang phục cho da ngăm",
    "Phong cách Minimalist",
    "Tư vấn chọn size"
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Lock scroll khi chat mở trên mobile
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
    if (!messageToSend.trim()) return;

    setMessages(prev => [...prev, { role: 'user', text: messageToSend }]);
    if (!text) setInput('');
    setIsTyping(true);

    // 1. Rule-based Size Consulting (Tiết kiệm Token)
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
        }, 600); // Giả lập độ trễ
        return;
      }
    }

    // 2. Gọi AI cho các ca khó
    try {
      const ai = getAI();
      const chatHistory = messages.map(msg => ({
        role: msg.role === 'bot' ? 'model' : 'user',
        parts: [{ text: msg.text }]
      }));

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview", // Sử dụng model mới nhất theo hướng dẫn
        contents: [...chatHistory, { role: 'user', parts: [{ text: messageToSend }] }],
        config: {
          systemInstruction: `Bạn là Stylist của NIEE8. Trả lời cực kỳ ngắn gọn (dưới 50 chữ). Tư vấn size và 1 item phối kèm nếu cần. Bảng size: S(eo 62-65), M(eo 66-69), L(eo 70-73), XL(eo 74-77).`,
        },
      });

      setMessages(prev => [...prev, {
        role: 'bot',
        text: response.text || 'Xin lỗi, tôi đang gặp chút trục trặc. Bạn thử lại sau nhé?'
      }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'bot', text: 'Không thể kết nối ngay lúc này. Hãy thử lại sau nhé!' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* FAB button — chỉ hiện trên desktop vì mobile dùng bottom nav */}
      {controlledOpen === undefined && (
        <button
          onClick={handleOpen}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-nie8-primary text-white rounded-full hidden lg:flex items-center justify-center shadow-2xl hover:scale-110 transition-transform group"
          aria-label="Mở AI Stylist"
        >
          <Sparkles size={24} className="group-hover:rotate-12 transition-transform" />
        </button>
      )}

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Mobile: full screen overlay */}
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
                /* Mobile: bottom sheet */
                bottom-0 left-0 right-0 rounded-t-[24px]
                h-[80dvh]
                /* Desktop: floating panel */
                lg:bottom-24 lg:right-6 lg:left-auto lg:top-auto
                lg:w-96 lg:rounded-3xl
                lg:h-auto lg:max-h-[500px]
              `}
            >
              {/* Drag handle (mobile) */}
              <div className="lg:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
                <div className="w-10 h-1 bg-gray-200 rounded-full" />
              </div>

              {/* Header */}
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

              {/* Messages */}
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

              {/* Quick suggestions */}
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

              {/* Input */}
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
