import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, Heart, ArrowRight, X, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { Product } from '../types';

const PRODUCTS_PER_PAGE = 6;

interface ProductGridProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
}

export default function ProductGrid({ products, onAddToCart }: ProductGridProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [story, setStory] = useState<string | null>(null);
  const [hoveredProductId, setHoveredProductId] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [modalImageIndex, setModalImageIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  // Tính toán số trang và danh sách sản phẩm hiển thị trên trang hiện tại
  const totalPages = Math.ceil(products.length / PRODUCTS_PER_PAGE);
  const currentProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
    return products.slice(startIndex, startIndex + PRODUCTS_PER_PAGE);
  }, [products, currentPage]);

  // Reset về trang 1 nếu danh sách sản phẩm thay đổi
  useEffect(() => {
    setCurrentPage(1);
  }, [products.length]);

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

  const generateStory = (product: Product) => {
    const stories: Record<string, string> = {
      'Áo': `Một buổi chiều nắng nhạt tại tiệm sách cũ, chiếc ${product.name} nhẹ nhàng tung bay theo gió, mang theo vẻ đẹp thanh lịch và tinh tế của người phụ nữ hiện đại.`,
      'Quần': `Dạo bước trên con phố quen thuộc, ${product.name} mang đến sự thoải mái tuyệt đối nhưng vẫn giữ trọn nét thanh lịch, tự tin trong từng nhịp bước.`,
      'Váy': `Dưới ánh đèn lung linh của buổi tiệc tối, chiếc ${product.name} tôn lên vẻ đẹp đài các, thu hút mọi ánh nhìn bởi sự tinh tế trong từng đường kim mũi chỉ.`,
      'Phụ kiện': `Điểm xuyết nhẹ nhàng nhưng đầy tinh tế, ${product.name} là mảnh ghép hoàn hảo, tôn vinh phong cách cá nhân độc đáo của riêng bạn.`,
      'Áo khoác': `Khoác lên mình chiếc ${product.name} trong một sớm mai se lạnh, cảm nhận sự ấm áp và phong cách vượt thời gian hòa quyện trong từng lớp vải.`
    };
    
    const defaultStory = `Thiết kế ${product.name} mang trong mình câu chuyện về sự tỉ mỉ và tình yêu với cái đẹp, đồng hành cùng bạn trong những khoảnh khắc đáng nhớ nhất.`;
    
    setStory(stories[product.category] || defaultStory);
  };

  const openProduct = (product: Product) => {
    setSelectedProduct(product);
    setModalImageIndex(0);
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

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-8 sm:gap-x-8 sm:gap-y-16">
          {currentProducts.map((product, index) => (
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
                
                <div className="absolute top-6 right-6 hidden lg:flex flex-col gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <button className="w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-nie8-text hover:bg-nie8-primary hover:text-white shadow-xl transition-all">
                    <Heart size={20} />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddToCart(product);
                    }}
                    className="w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-nie8-text hover:bg-nie8-primary hover:text-white shadow-xl transition-all"
                  >
                    <ShoppingBag size={20} />
                  </button>
                </div>

                {product.images.length > 1 && (
                  <div className="absolute bottom-24 left-1/2 -translate-x-1/2 hidden lg:flex gap-1.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
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

                <div className="absolute bottom-0 left-0 right-0 p-8 translate-y-full group-hover:translate-y-0 transition-transform duration-500 bg-gradient-to-t from-black/40 to-transparent hidden lg:block">
                  <button className="w-full py-4 bg-white/90 backdrop-blur-sm text-nie8-text rounded-2xl font-medium text-sm hover:bg-nie8-primary hover:text-white transition-all">
                    Xem chi tiết
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-start px-2 gap-2">
                <div>
                  <p className="text-[10px] text-nie8-secondary font-medium uppercase tracking-[0.2em] mb-1 sm:mb-2">{product.category}</p>
                  <h3 className="text-base sm:text-xl font-serif italic text-nie8-text group-hover:text-nie8-primary transition-colors line-clamp-2">{product.name}</h3>
                </div>
                <p className="text-sm sm:text-lg font-medium text-nie8-text whitespace-nowrap">{product.price}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Phân trang (Pagination) */}
        {totalPages > 1 && (
          <div className="mt-20 flex justify-center items-center gap-4">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="w-12 h-12 rounded-full border border-nie8-text/20 flex items-center justify-center text-nie8-text hover:bg-nie8-primary hover:text-white hover:border-nie8-primary transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-nie8-text disabled:hover:border-nie8-text/20"
            >
              <ChevronLeft size={20} />
            </button>
            
            <div className="flex flex-wrap justify-center gap-2">
              {Array.from({ length: totalPages }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentPage(idx + 1)}
                  className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                    currentPage === idx + 1 
                      ? 'bg-nie8-primary text-white shadow-md' 
                      : 'text-nie8-text/60 hover:bg-nie8-primary/10 hover:text-nie8-primary'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>

            <button 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="w-12 h-12 rounded-full border border-nie8-text/20 flex items-center justify-center text-nie8-text hover:bg-nie8-primary hover:text-white hover:border-nie8-primary transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-nie8-text disabled:hover:border-nie8-text/20"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}

        {/* Nút xem tất cả (chỉ hiển thị nếu có sản phẩm) */}
        {products.length > 0 && (
          <div className="mt-16 text-center">
            <button className="flex items-center gap-4 mx-auto text-nie8-text font-medium group">
              Xem tất cả sản phẩm
              <div className="w-12 h-12 rounded-full border border-nie8-text/20 flex items-center justify-center group-hover:bg-nie8-primary group-hover:text-white transition-all">
                <ArrowRight size={18} />
              </div>
            </button>
          </div>
        )}
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

              <div className="lg:w-1/2 h-[50vh] min-h-[300px] lg:h-auto relative group flex-shrink-0 flex overflow-x-auto snap-x snap-mandatory scroll-hide">
                {selectedProduct.images.map((img, idx) => (
                  <img 
                    key={idx}
                    src={img} 
                    alt={`${selectedProduct.name} ${idx + 1}`} 
                    className="w-full h-full object-cover flex-shrink-0 snap-center"
                    referrerPolicy="no-referrer"
                  />
                ))}
                
                {selectedProduct.images.length > 1 && (
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-10 pointer-events-none">
                    {selectedProduct.images.map((_, idx) => (
                      <div
                        key={idx}
                        className="w-2 h-2 rounded-full bg-white/60 shadow-sm"
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="lg:w-1/2 p-6 sm:p-8 lg:p-12 overflow-y-auto scroll-hide flex flex-col relative">
                <div className="mb-6 lg:mb-8">
                  <p className="text-[10px] lg:text-xs uppercase tracking-widest text-nie8-secondary font-medium mb-2">{selectedProduct.category}</p>
                  <h3 className="text-3xl lg:text-4xl font-serif italic text-nie8-text mb-2 lg:mb-4">{selectedProduct.name}</h3>
                  <p className="text-xl lg:text-2xl font-medium text-nie8-text">{selectedProduct.price}</p>
                </div>

                <div className="space-y-6 lg:space-y-8 flex-grow pb-24 lg:pb-0">
                  <div>
                    <h4 className="text-[10px] lg:text-xs uppercase tracking-widest text-nie8-text/40 font-bold mb-3 lg:mb-4">Mô tả sản phẩm</h4>
                    <p className="text-sm lg:text-base text-nie8-text/60 leading-relaxed">{selectedProduct.description}</p>
                  </div>

                  <div className="bg-nie8-primary/5 p-6 lg:p-8 rounded-2xl lg:rounded-3xl border border-nie8-primary/10 relative overflow-hidden">
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-3 lg:mb-4">
                        <Sparkles size={14} className="text-nie8-primary lg:w-4 lg:h-4" />
                        <h4 className="text-[10px] lg:text-xs uppercase tracking-widest text-nie8-primary font-bold">Câu chuyện cảm hứng</h4>
                      </div>
                      <AnimatePresence mode="wait">
                        <motion.p 
                          key="story"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-nie8-text italic font-serif text-base lg:text-lg leading-relaxed"
                        >
                          "{story}"
                        </motion.p>
                      </AnimatePresence>
                    </div>
                    <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-24 h-24 lg:w-32 lg:h-32 bg-nie8-primary/10 rounded-full blur-2xl"></div>
                  </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-4 lg:p-0 lg:relative lg:mt-12 flex gap-3 lg:gap-4 bg-white/90 backdrop-blur-md lg:bg-transparent border-t border-nie8-primary/10 lg:border-none z-20">
                  <button 
                    onClick={() => onAddToCart(selectedProduct)}
                    className="flex-grow py-3.5 lg:py-5 bg-nie8-primary text-white rounded-full font-medium hover:bg-nie8-secondary transition-all flex items-center justify-center gap-2 lg:gap-3 shadow-xl shadow-nie8-primary/20 text-sm lg:text-base min-h-[44px]"
                  >
                    <ShoppingBag size={18} className="lg:w-5 lg:h-5" />
                    Thêm vào giỏ hàng
                  </button>
                  <button className="w-12 h-12 lg:w-16 lg:h-16 border border-nie8-primary/20 rounded-full flex items-center justify-center text-nie8-text hover:bg-nie8-primary hover:text-white transition-all flex-shrink-0 min-w-[44px] min-h-[44px]">
                    <Heart size={20} className="lg:w-6 lg:h-6" />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticky Bottom Button for Mobile */}
      <div className="fixed bottom-6 left-0 right-0 z-40 flex justify-center px-4 pointer-events-none md:hidden">
        <button className="pointer-events-auto bg-nie8-primary text-white py-3 px-6 rounded-full shadow-2xl shadow-nie8-primary/30 text-sm font-medium flex items-center justify-center gap-2 hover:scale-105 transition-transform min-h-[44px]">
          <Sparkles size={16} />
          Chat với AI Stylist
        </button>
      </div>
    </section>
  );
}
