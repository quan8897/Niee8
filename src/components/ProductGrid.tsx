import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, Heart, ArrowRight, X, Sparkles, RefreshCw } from 'lucide-react';
import { Product } from '../types';
import { GoogleGenAI } from "@google/genai";

const getAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing. Please set it in your environment variables.");
  }
  return new GoogleGenAI({ apiKey });
};

interface ProductGridProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
}

export default function ProductGrid({ products, onAddToCart }: ProductGridProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [story, setStory] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hoveredProductId, setHoveredProductId] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (hoveredProductId) {
      const product = products.find(p => p.id === hoveredProductId);
      if (product && product.images.length > 1) {
        interval = setInterval(() => {
          setCurrentImageIndex(prev => (prev + 1) % product.images.length);
        }, 1500);
      }
    } else {
      setCurrentImageIndex(0);
    }
    return () => clearInterval(interval);
  }, [hoveredProductId, products]);

  const generateStory = async (product: Product) => {
    setIsGenerating(true);
    setStory(null);
    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Hãy viết một câu chuyện ngắn (khoảng 3-4 câu) về hoàn cảnh diện bộ đồ "${product.name}" (thuộc danh mục ${product.category}) của thương hiệu niee8. Câu chuyện nên mang phong cách lãng mạn, nhẹ nhàng, gợi cảm hứng về một phong cách sống tinh tế và trân trọng các giá trị thủ công. Ví dụ: "Một buổi chiều nắng nhạt tại tiệm sách cũ...". Hãy trả lời bằng tiếng Việt.`,
      });
      setStory(response.text || "Câu chuyện đang được viết tiếp...");
    } catch (error) {
      console.error(error);
      setStory("Cảm hứng đang tạm thời gián đoạn, hãy quay lại sau nhé.");
    } finally {
      setIsGenerating(false);
    }
  };

  const openProduct = (product: Product) => {
    setSelectedProduct(product);
    generateStory(product);
  };

  return (
    <section className="py-24 bg-nie8-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
          <div className="max-w-xl">
            <motion.span 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="inline-block text-nie8-secondary text-xs font-medium tracking-[0.2em] uppercase mb-4"
            >
              Lựa chọn Tinh tuyển
            </motion.span>
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
              className="text-5xl font-serif italic text-nie8-text leading-tight"
            >
              Tủ đồ <br />
              <span className="text-nie8-primary">Hiện đại.</span>
            </motion.h2>
          </div>
          <div className="flex gap-8 text-xs font-medium tracking-[0.1em] uppercase">
            <button className="text-nie8-text border-b border-nie8-text pb-2">Tất cả</button>
            <button className="text-nie8-text/40 hover:text-nie8-text transition-colors pb-2">Mới về</button>
            <button className="text-nie8-text/40 hover:text-nie8-text transition-colors pb-2">Bán chạy</button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16">
          {products.map((product, index) => (
            <motion.div 
              key={product.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="group cursor-pointer"
              onClick={() => openProduct(product)}
              onMouseEnter={() => setHoveredProductId(product.id)}
              onMouseLeave={() => setHoveredProductId(null)}
            >
              <div className="relative aspect-[3/4] overflow-hidden rounded-[30px] bg-white mb-8">
                <AnimatePresence mode="wait">
                  <motion.img 
                    key={hoveredProductId === product.id ? currentImageIndex : 0}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    src={hoveredProductId === product.id ? product.images[currentImageIndex] : product.images[0]} 
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                    referrerPolicy="no-referrer"
                  />
                </AnimatePresence>
                
                <div className="absolute top-6 right-6 flex flex-col gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <button className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-nie8-text hover:bg-nie8-primary hover:text-white shadow-xl transition-all">
                    <Heart size={20} />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddToCart(product);
                    }}
                    className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-nie8-text hover:bg-nie8-primary hover:text-white shadow-xl transition-all"
                  >
                    <ShoppingBag size={20} />
                  </button>
                </div>

                {product.images.length > 1 && (
                  <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex gap-1.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    {product.images.map((_, i) => (
                      <div 
                        key={i} 
                        className={`w-1.5 h-1.5 rounded-full transition-all ${
                          (hoveredProductId === product.id ? currentImageIndex : 0) === i 
                            ? 'bg-white w-4' 
                            : 'bg-white/40'
                        }`}
                      />
                    ))}
                  </div>
                )}

                <div className="absolute bottom-0 left-0 right-0 p-8 translate-y-full group-hover:translate-y-0 transition-transform duration-500 bg-gradient-to-t from-black/20 to-transparent">
                  <button className="w-full py-4 bg-white text-nie8-text rounded-2xl font-medium text-sm hover:bg-nie8-primary hover:text-white transition-all">
                    Xem chi tiết
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-start px-2">
                <div>
                  <p className="text-[10px] text-nie8-secondary font-medium uppercase tracking-[0.2em] mb-2">{product.category}</p>
                  <h3 className="text-xl font-serif italic text-nie8-text group-hover:text-nie8-primary transition-colors">{product.name}</h3>
                </div>
                <p className="text-lg font-medium text-nie8-text">{product.price}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-24 text-center">
          <button className="flex items-center gap-4 mx-auto text-nie8-text font-medium group">
            Xem tất cả sản phẩm
            <div className="w-12 h-12 rounded-full border border-nie8-text/20 flex items-center justify-center group-hover:bg-nie8-primary group-hover:text-white transition-all">
              <ArrowRight size={18} />
            </div>
          </button>
        </div>
      </div>

      {/* Product Detail Modal with AI Story */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-black/40 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-5xl rounded-[40px] overflow-hidden shadow-2xl relative flex flex-col lg:flex-row max-h-[90vh]"
            >
              <button 
                onClick={() => setSelectedProduct(null)}
                className="absolute top-6 right-6 z-10 w-10 h-10 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center text-nie8-text hover:bg-nie8-primary hover:text-white transition-all"
              >
                <X size={20} />
              </button>

              <div className="lg:w-1/2 h-64 lg:h-auto">
                <img 
                  src={selectedProduct.images[0]} 
                  alt={selectedProduct.name} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="lg:w-1/2 p-8 sm:p-12 overflow-y-auto scroll-hide flex flex-col">
                <div className="mb-8">
                  <p className="text-xs uppercase tracking-widest text-nie8-secondary font-medium mb-2">{selectedProduct.category}</p>
                  <h3 className="text-4xl font-serif italic text-nie8-text mb-4">{selectedProduct.name}</h3>
                  <p className="text-2xl font-medium text-nie8-text">{selectedProduct.price}</p>
                </div>

                <div className="space-y-8 flex-grow">
                  <div>
                    <h4 className="text-xs uppercase tracking-widest text-nie8-text/40 font-bold mb-4">Mô tả sản phẩm</h4>
                    <p className="text-nie8-text/60 leading-relaxed">{selectedProduct.description}</p>
                  </div>

                  <div className="bg-nie8-primary/5 p-8 rounded-3xl border border-nie8-primary/10 relative overflow-hidden">
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-4">
                        <Sparkles size={16} className="text-nie8-primary" />
                        <h4 className="text-xs uppercase tracking-widest text-nie8-primary font-bold">Câu chuyện cảm hứng</h4>
                      </div>
                      <AnimatePresence mode="wait">
                        {isGenerating ? (
                          <motion.div 
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center gap-3 text-nie8-text/40 italic font-serif"
                          >
                            <RefreshCw size={16} className="animate-spin" />
                            <span>Đang dệt nên câu chuyện...</span>
                          </motion.div>
                        ) : (
                          <motion.p 
                            key="story"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-nie8-text italic font-serif text-lg leading-relaxed"
                          >
                            "{story}"
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>
                    <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-32 h-32 bg-nie8-primary/10 rounded-full blur-2xl"></div>
                  </div>
                </div>

                <div className="mt-12 flex gap-4">
                  <button 
                    onClick={() => onAddToCart(selectedProduct)}
                    className="flex-grow py-5 bg-nie8-primary text-white rounded-full font-medium hover:bg-nie8-secondary transition-all flex items-center justify-center gap-3 shadow-xl shadow-nie8-primary/20"
                  >
                    <ShoppingBag size={20} />
                    Thêm vào giỏ hàng
                  </button>
                  <button className="w-16 h-16 border border-nie8-primary/20 rounded-full flex items-center justify-center text-nie8-text hover:bg-nie8-primary hover:text-white transition-all">
                    <Heart size={24} />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
