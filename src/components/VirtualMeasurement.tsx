import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Ruler, Sparkles, RefreshCw, ChevronRight } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function VirtualMeasurement() {
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [advice, setAdvice] = useState<string | null>(null);

  const handleConsult = async () => {
    if (!height || !weight) return;
    setIsProcessing(true);

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Tôi cao ${height}cm và nặng ${weight}kg. Hãy tư vấn size quần áo và cách phối đồ để che khuyết điểm, tôn dáng theo phong cách tối giản, sang trọng của thương hiệu NIE8. Hãy trả lời bằng tiếng Việt, giọng văn nhẹ nhàng, tinh tế và ngắn gọn.`,
      });

      setAdvice(response.text || 'Xin lỗi, tôi đang gặp chút trục trặc. Bạn có thể thử lại sau không?');
    } catch (error) {
      console.error(error);
      setAdvice('Tôi không thể kết nối ngay lúc này. Hãy thử lại sau nhé!');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <section className="py-24 bg-nie8-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 1 }}
            viewport={{ once: true }}
          >
            <span className="text-nie8-accent text-xs font-medium tracking-[0.3em] uppercase mb-4 block">AI Consultant</span>
            <h2 className="text-5xl md:text-6xl font-serif italic text-nie8-tan mb-8 leading-tight">
              Số đo của bạn, <br />
              <span className="text-nie8-accent">Sự hoàn hảo của NIE8.</span>
            </h2>
            <p className="text-lg text-nie8-tan/60 mb-10 leading-relaxed">
              Nhập số đo của bạn để nhận được lời khuyên cá nhân hóa từ chuyên gia AI của chúng tôi. 
              Chúng tôi sẽ giúp bạn tìm thấy kích cỡ và kiểu dáng tôn vinh vẻ đẹp tự nhiên của bạn nhất.
            </p>

            <div className="grid grid-cols-2 gap-6 mb-10">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-nie8-tan/40 font-medium ml-4">Chiều cao (cm)</label>
                <input 
                  type="number" 
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="165"
                  className="w-full bg-nie8-beige/10 border border-nie8-beige/20 rounded-full px-8 py-4 text-nie8-tan focus:outline-none focus:border-nie8-tan transition-colors"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-nie8-tan/40 font-medium ml-4">Cân nặng (kg)</label>
                <input 
                  type="number" 
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="50"
                  className="w-full bg-nie8-beige/10 border border-nie8-beige/20 rounded-full px-8 py-4 text-nie8-tan focus:outline-none focus:border-nie8-tan transition-colors"
                />
              </div>
            </div>

            <button 
              onClick={handleConsult}
              disabled={isProcessing || !height || !weight}
              className="w-full sm:w-auto px-12 py-5 bg-nie8-tan text-nie8-white rounded-full font-medium hover:bg-nie8-accent transition-all flex items-center justify-center gap-3 shadow-2xl shadow-nie8-tan/20 disabled:opacity-50"
            >
              {isProcessing ? <RefreshCw className="animate-spin" size={20} /> : <Sparkles size={20} />}
              Nhận tư vấn ngay
            </button>
          </motion.div>

          <div className="relative">
            <div className="aspect-[4/5] rounded-[60px] overflow-hidden shadow-2xl bg-nie8-beige/5 border border-nie8-beige/10 p-10 flex flex-col">
              <AnimatePresence mode="wait">
                {isProcessing ? (
                  <motion.div 
                    key="processing"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-grow flex flex-col items-center justify-center text-center space-y-6"
                  >
                    <div className="w-24 h-24 rounded-full border-2 border-dashed border-nie8-tan animate-spin flex items-center justify-center">
                      <Ruler className="text-nie8-tan" size={32} />
                    </div>
                    <p className="font-serif italic text-2xl text-nie8-tan">Đang phân tích tỉ lệ cơ thể...</p>
                  </motion.div>
                ) : advice ? (
                  <motion.div 
                    key="advice"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex-grow flex flex-col"
                  >
                    <div className="flex items-center gap-3 mb-8">
                      <div className="w-10 h-10 bg-nie8-tan rounded-full flex items-center justify-center text-nie8-white">
                        <Sparkles size={18} />
                      </div>
                      <h4 className="font-serif italic text-xl text-nie8-tan">Lời khuyên từ NIE8 AI</h4>
                    </div>
                    <div className="flex-grow overflow-y-auto pr-4 scroll-hide">
                      <p className="text-nie8-tan/80 leading-relaxed whitespace-pre-wrap italic font-serif text-lg">
                        "{advice}"
                      </p>
                    </div>
                    <button className="mt-8 flex items-center gap-2 text-nie8-accent font-medium group">
                      Xem các sản phẩm phù hợp <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex-grow flex flex-col items-center justify-center text-center space-y-6 opacity-30"
                  >
                    <Ruler size={80} strokeWidth={1} className="text-nie8-tan" />
                    <p className="font-serif italic text-xl text-nie8-tan">Kết quả tư vấn sẽ hiển thị tại đây</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Decorative elements */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-nie8-beige/20 rounded-full blur-3xl -z-10"></div>
            <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-nie8-tan/10 rounded-full blur-3xl -z-10"></div>
          </div>
        </div>
      </div>
    </section>
  );
}
