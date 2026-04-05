import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Send, X, User, Bot } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

const getAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing. Please set it in your environment variables.");
  }
  return new GoogleGenAI({ apiKey });
};

export default function AIStylist() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'bot', text: string }[]>([
    { role: 'bot', text: 'Chào bạn! Tôi là niee8 AI Stylist. Bạn cần tư vấn phối đồ cho sự kiện nào hôm nay? (Đi làm, đi cafe hay một buổi hẹn hò lãng mạn?)' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickSuggestions = [
    "Phối đồ đi cafe cuối tuần",
    "Trang phục cho da ngăm",
    "Phong cách Minimalist Romantic",
    "Tư vấn đồ thêu lỗ"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (text?: string) => {
    const messageToSend = text || input;
    if (!messageToSend.trim()) return;

    setMessages(prev => [...prev, { role: 'user', text: messageToSend }]);
    if (!text) setInput('');
    setIsTyping(true);

    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: messageToSend,
        config: {
          systemInstruction: "Bạn là một chuyên gia tư vấn thời trang cao cấp của thương hiệu niee8. Phong cách của thương hiệu là Minimalist Romantic & Craftsmanship, tập trung vào các chi tiết thủ công và sự thoải mái hàng ngày (lấy cảm hứng từ slowand.com). Nhiệm vụ của bạn là: 1. Tư vấn phối đồ cá nhân hóa (Mix & Match) theo set đồ hoàn chỉnh. 2. Tư vấn kích cỡ (Size Guide) dựa trên chiều cao, cân nặng người dùng. 3. Tư vấn trang phục theo cảm xúc hoặc sự kiện (đi làm, đi cafe, hẹn hò). Hãy trả lời một cách tinh tế, sang trọng, ngắn gọn và ấm áp bằng tiếng Việt. Luôn nhấn mạnh vào sự tự tin và vẻ đẹp bền vững.",
        },
      });

      setMessages(prev => [...prev, { role: 'bot', text: response.text || 'Xin lỗi, tôi đang gặp chút trục trặc. Bạn có thể thử lại sau không?' }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'bot', text: 'Tôi không thể kết nối ngay lúc này. Hãy thử lại sau nhé!' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-nie8-primary text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform group"
      >
        <Sparkles size={24} className="group-hover:rotate-12 transition-transform" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-x-4 bottom-24 md:inset-auto md:bottom-24 md:right-6 z-50 md:w-96 bg-white rounded-3xl shadow-2xl border border-nie8-primary/20 overflow-hidden flex flex-col h-[60vh] md:h-auto max-h-[500px]"
          >
            <div className="bg-nie8-primary p-4 flex justify-between items-center flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <Sparkles size={16} className="text-white" />
                </div>
                <span className="text-white font-serif italic">niee8 AI Stylist</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-white/60 hover:text-white p-2 -mr-2">
                <X size={20} />
              </button>
            </div>

            <div className="flex-grow p-4 overflow-y-auto scroll-hide space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-nie8-primary text-white' 
                      : 'bg-nie8-primary/5 text-nie8-text border border-nie8-primary/10'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-nie8-primary/5 p-3 rounded-2xl border border-nie8-primary/10">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-nie8-primary/40 rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-nie8-primary/40 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                      <div className="w-1.5 h-1.5 bg-nie8-primary/40 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-nie8-primary/10">
              <div className="flex flex-wrap gap-2 mb-4">
                {quickSuggestions.map((s, i) => (
                  <button 
                    key={i}
                    onClick={() => handleSend(s)}
                    className="text-[10px] bg-nie8-primary/5 hover:bg-nie8-primary/10 border border-nie8-primary/10 rounded-full px-3 py-1 text-nie8-text transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Hỏi về cách phối đồ..."
                  className="flex-grow bg-nie8-primary/5 border border-nie8-primary/20 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-nie8-primary transition-colors"
                />
                <button 
                  onClick={() => handleSend()}
                  className="w-10 h-10 bg-nie8-primary text-white rounded-full flex items-center justify-center hover:bg-nie8-secondary transition-colors"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
