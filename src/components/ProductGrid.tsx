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
  const [selectedSize, setSelectedSize] = useState<string>('S');
  const [quantity, setQuantity] = useState<number>(1);

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
    setSelectedSize('S');
    setQuantity(1);
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

              <div className="lg:w-1/2 h-[50vh] min-h-[300px] lg:h-auto relative group flex-shrink-0 flex lg:flex-row overflow-x-auto lg:overflow-hidden snap-x snap-mandatory scroll-hide bg-gray-50">
                {/* Desktop Vertical Thumbnails */}
                <div className="hidden lg:flex flex-col gap-2 p-4 w-24 overflow-y-auto scroll-hide">
                  {selectedProduct.images.map((img, idx) => (
                    <button 
                      key={idx} 
                      onClick={() => setModalImageIndex(idx)} 
                      className={`w-full aspect-[3/4] border-2 transition-all ${modalImageIndex === idx ? 'border-nie8-text' : 'border-transparent opacity-60 hover:opacity-100'}`}
                    >
                      <img src={img} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </button>
                  ))}
                </div>
                
                {/* Mobile Horizontal Scroll Images */}
                <div className="flex lg:hidden w-full h-full">
                  {selectedProduct.images.map((img, idx) => (
                    <img 
                      key={idx}
                      src={img} 
                      alt={`${selectedProduct.name} ${idx + 1}`} 
                      className="w-full h-full object-cover flex-shrink-0 snap-center"
                      referrerPolicy="no-referrer"
                    />
                  ))}
                </div>

                {/* Desktop Main Image */}
                <div className="hidden lg:block flex-grow relative">
                  <AnimatePresence mode="wait">
                    <motion.img 
                      key={modalImageIndex}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      src={selectedProduct.images[modalImageIndex]} 
                      alt={selectedProduct.name} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </AnimatePresence>
                </div>
                
                {/* Mobile Dots */}
                {selectedProduct.images.length > 1 && (
                  <div className="absolute bottom-4 left-0 right-0 flex lg:hidden justify-center gap-2 z-10 pointer-events-none">
                    {selectedProduct.images.map((_, idx) => (
                      <div
                        key={idx}
                        className="w-2 h-2 rounded-full bg-white/60 shadow-sm"
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="lg:w-1/2 p-6 sm:p-8 lg:p-10 overflow-y-auto scroll-hide flex flex-col relative">
                <div className="mb-6 border-b border-nie8-text/10 pb-6">
                  <h3 className="text-xl lg:text-2xl font-bold text-nie8-text mb-2">{selectedProduct.name}</h3>
                  <p className="text-xs text-nie8-text/50 mb-4">SKU: {selectedProduct.id}</p>
                  <p className="text-lg font-bold text-nie8-text">{selectedProduct.price}</p>
                </div>

                <div className="space-y-6 flex-grow pb-24 lg:pb-0">
                  {/* Material */}
                  <div>
                    <h4 className="text-sm text-nie8-text mb-2">Vật liệu:</h4>
                    <button className="border border-nie8-text px-4 py-2 text-sm text-nie8-text">Cotton</button>
                  </div>
                  
                  {/* Color */}
                  <div>
                    <h4 className="text-sm text-nie8-text mb-2">Màu sắc: Nâu</h4>
                    <button className="w-8 h-8 rounded-full bg-[#5C4D3F] border-2 border-white ring-1 ring-nie8-text"></button>
                  </div>

                  {/* Size */}
                  <div>
                    <h4 className="text-sm text-nie8-text mb-2">Kích thước:</h4>
                    <div className="flex gap-2">
                      {['S', 'M', 'L'].map(size => (
                        <button 
                          key={size} 
                          onClick={() => setSelectedSize(size)}
                          className={`w-10 h-10 border flex items-center justify-center text-sm transition-colors ${
                            selectedSize === size 
                              ? 'border-nie8-text text-nie8-text font-medium' 
                              : 'border-nie8-text/20 text-nie8-text/60 hover:border-nie8-text/50'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quantity */}
                  <div className="flex items-center gap-4">
                    <h4 className="text-sm text-nie8-text">Số lượng:</h4>
                    <div className="flex items-center border border-nie8-text/20 w-fit">
                      <button 
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="w-8 h-8 flex items-center justify-center text-nie8-text hover:bg-gray-50"
                      >
                        -
                      </button>
                      <span className="w-12 text-center text-sm text-nie8-text">{quantity}</span>
                      <button 
                        onClick={() => setQuantity(quantity + 1)}
                        className="w-8 h-8 flex items-center justify-center text-nie8-text hover:bg-gray-50"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-4 pt-2">
                    <button 
                      onClick={() => {
                        onAddToCart({ ...selectedProduct, name: `${selectedProduct.name} - Size ${selectedSize}` });
                      }}
                      className="flex-1 border border-nie8-text py-3 text-sm font-bold text-nie8-text hover:bg-nie8-text hover:text-white transition-colors uppercase tracking-wider"
                    >
                      Thêm vào giỏ hàng
                    </button>
                    <button className="flex-1 border border-nie8-text py-3 text-sm font-bold text-nie8-text hover:bg-nie8-text hover:text-white transition-colors uppercase tracking-wider">
                      Bảng size
                    </button>
                  </div>

                  {/* Info */}
                  <div className="pt-6 border-t border-nie8-text/10">
                    <h4 className="text-sm font-bold text-nie8-text mb-3 uppercase tracking-wider">Thông tin sản phẩm</h4>
                    <div className="text-sm text-nie8-text/80 space-y-1.5">
                      <p>{selectedProduct.description}</p>
                      <p>Chất liệu: Cotton</p>
                      <p>Màu sắc: Nâu</p>
                      <br/>
                      <p className="font-bold text-nie8-text">Kích thước sản phẩm:</p>
                      <p>Size S: Dài áo 64,5</p>
                      <p>Size M: Dài áo 65,5</p>
                      <p>Size L: Dài áo 66,5</p>
                    </div>
                  </div>

                  {/* Similar Products */}
                  <div className="pt-6 border-t border-nie8-text/10">
                    <h4 className="text-sm font-bold text-nie8-text mb-4 uppercase tracking-wider">Gợi ý cho bạn</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {products
                        .filter(p => p.category === selectedProduct.category && p.id !== selectedProduct.id)
                        .slice(0, 2)
                        .map(similarProduct => (
                          <div 
                            key={similarProduct.id} 
                            className="group cursor-pointer"
                            onClick={() => openProduct(similarProduct)}
                          >
                            <div className="aspect-[3/4] overflow-hidden bg-gray-50 mb-2">
                              <img 
                                src={similarProduct.images[0]} 
                                alt={similarProduct.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <h5 className="text-xs font-medium text-nie8-text line-clamp-1 group-hover:text-nie8-primary transition-colors">{similarProduct.name}</h5>
                            <p className="text-xs text-nie8-text/60 mt-0.5">{similarProduct.price}</p>
                          </div>
                      ))}
                      {/* Fallback if no similar products in same category */}
                      {products.filter(p => p.category === selectedProduct.category && p.id !== selectedProduct.id).length === 0 && 
                        products.filter(p => p.id !== selectedProduct.id).slice(0, 2).map(similarProduct => (
                          <div 
                            key={similarProduct.id} 
                            className="group cursor-pointer"
                            onClick={() => openProduct(similarProduct)}
                          >
                            <div className="aspect-[3/4] overflow-hidden bg-gray-50 mb-2">
                              <img 
                                src={similarProduct.images[0]} 
                                alt={similarProduct.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <h5 className="text-xs font-medium text-nie8-text line-clamp-1 group-hover:text-nie8-primary transition-colors">{similarProduct.name}</h5>
                            <p className="text-xs text-nie8-text/60 mt-0.5">{similarProduct.price}</p>
                          </div>
                      ))}
                    </div>
                  </div>
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
