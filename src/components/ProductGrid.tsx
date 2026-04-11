import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, Heart, X, ChevronLeft, ChevronRight, Star, Share2, Minus, Plus, Sparkles } from 'lucide-react';
import { Product, SiteSettings } from '../types';
import ProtectedImage from './ProtectedImage';
import { supabase } from '../lib/supabase';

const PRODUCTS_PER_PAGE = 12;

interface ProductGridProps {
  products: Product[];
  onAddToCart: (product: Product, size: string, quantity: number) => void;
  onBuyNow?: (product: Product, size: string, quantity: number) => void;
  onRegisterStockNotification?: (productId: string, email: string, size: string) => Promise<boolean>;
  settings: SiteSettings | null;
  isLoading?: boolean;
}

// Skeleton card cho loading state
function SkeletonCard() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[3/4] rounded-2xl bg-nie8-primary/10 mb-3" />
      <div className="h-3 bg-nie8-primary/10 rounded w-1/3 mb-2" />
      <div className="h-4 bg-nie8-primary/10 rounded w-2/3 mb-1" />
      <div className="h-4 bg-nie8-primary/10 rounded w-1/4" />
    </div>
  );
}

// Component ảnh với lazy loading và fallback chuyên nghiệp
function LazyImage({ src, alt, className }: { src: string; alt: string; className: string }) {
  const [error, setError] = useState(false);
  const fallbackUrl = 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop';

  return (
    <div className="relative w-full h-full bg-nie8-primary/5 overflow-hidden">
      <ProtectedImage
        src={error ? fallbackUrl : src}
        alt={alt}
        loading="lazy"
        onError={() => setError(true)}
        className={`${className} transition-transform duration-700 hover:scale-110 object-cover w-full h-full`}
        containerClassName="w-full h-full"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}

export default function ProductGrid({ 
  products, 
  onAddToCart, 
  onBuyNow,
  onRegisterStockNotification,
  settings,
  isLoading = false 
}: ProductGridProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string>('M');
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [addedToCart, setAddedToCart] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('Tất cả');
  const [activeSort, setActiveSort] = useState<'default' | 'new' | 'price-asc' | 'price-desc' | 'sales-desc' | 'likes-desc'>('default');
  const touchStartX = useRef<number>(0);
  const sectionRef = useRef<HTMLElement>(null);

  // Chuẩn hóa danh mục theo yêu cầu: Áo, Quần, Váy, Nguyên set, Áo khoác, Phụ kiện
  const categories = ['Tất cả', 'Áo', 'Quần', 'Váy', 'Nguyên set', 'Áo khoác', 'Phụ kiện'];

  // Helper kiểm tra sản phẩm hết hàng an toàn (Tính toán từ các size để đảm bảo chính xác)
  const isProductOutOfStock = (p: Product) => {
    // 1. Kiểm tra nếu không có dữ liệu size thì dùng stock_quantity
    if (!p.stock_by_size) return !p.stock_quantity || p.stock_quantity <= 0;
    
    // 2. Tính tổng thực tế từ các size
    const totalFromSizes = Object.values(p.stock_by_size).reduce((sum, qty) => sum + (qty || 0), 0);
    return totalFromSizes <= 0;
  };

  // Filter + Sort logic
  const filteredProducts = useMemo(() => {
    let result = activeCategory === 'Tất cả'
      ? products
      : products.filter(p => p.category === activeCategory);

    // Sắp xếp: Còn hàng lên đầu, hết hàng xuống cuối
    result = [...result].sort((a, b) => {
      const aOut = isProductOutOfStock(a) ? 1 : 0;
      const bOut = isProductOutOfStock(b) ? 1 : 0;
      return aOut - bOut;
    });

    if (activeSort === 'new') {
      result = [...result].sort((a, b) =>
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );
    } else if (activeSort === 'price-asc') {
      result = [...result].sort((a, b) =>
        parseFloat(a.price.replace(/[^0-9]/g, '')) - parseFloat(b.price.replace(/[^0-9]/g, ''))
      );
    } else if (activeSort === 'price-desc') {
      result = [...result].sort((a, b) =>
        parseFloat(b.price.replace(/[^0-9]/g, '')) - parseFloat(a.price.replace(/[^0-9]/g, ''))
      );
    } else if (activeSort === 'sales-desc') {
      result = [...result].sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0));
    } else if (activeSort === 'likes-desc') {
      result = [...result].sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
    }
    return result;
  }, [products, activeCategory, activeSort]);

  const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
  const currentProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
    return filteredProducts.slice(startIndex, startIndex + PRODUCTS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [activeCategory, activeSort]);

  // Khoá scroll body khi modal mở (quan trọng cho mobile)
  useEffect(() => {
    if (selectedProduct) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [selectedProduct]);

  const openProduct = (product: Product) => {
    setSelectedProduct(product);
    setActiveImageIndex(0);
    setSelectedSize('M');
    setQuantity(1);
    setAddedToCart(false);
  };

  const closeModal = () => setSelectedProduct(null);



  // Format tiền VND
  const formatVND = (priceStr: string) => {
    const amount = parseFloat(priceStr.replace(/[^0-9]/g, ''));
    if (isNaN(amount)) return priceStr;
    return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
  };

  const toggleWishlist = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isAdding = !wishlist.has(id);
    
    // 1. Cập nhật UI ngay lập tức để tạo cảm giác mượt mà
    setWishlist(prev => {
      const next = new Set(prev);
      isAdding ? next.add(id) : next.delete(id);
      return next;
    });

    // 2. Gửi tín hiệu lên Database để tích lũy chỉ số (Background)
    try {
      await supabase.rpc('handle_product_like', { 
        p_id: id, 
        p_increment: isAdding ? 1 : -1 
      });
    } catch (err) {
      console.error('Lỗi khi cập nhật lượt yêu thích:', err);
    }
  };

  const handleAddToCart = () => {
    if (!selectedProduct) return;
    onAddToCart(selectedProduct, selectedSize, quantity);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  // Swipe gesture cho ảnh trong modal
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!selectedProduct) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        setActiveImageIndex(prev => (prev + 1) % selectedProduct.images.length);
      } else {
        setActiveImageIndex(prev => (prev - 1 + selectedProduct.images.length) % selectedProduct.images.length);
      }
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll lên đầu section khi đổi trang — quan trọng trên mobile
    sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section ref={sectionRef} className="py-12 sm:py-24 bg-nie8-bg scroll-mt-16">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">

        {/* Header section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8 sm:mb-16">
          <div>
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-block text-nie8-secondary text-[10px] sm:text-xs font-bold tracking-[0.3em] uppercase mb-2 sm:mb-4"
            >
              Editorial Lookbook
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              viewport={{ once: true }}
              className="text-4xl sm:text-6xl font-serif italic text-nie8-text leading-tight"
            >
              The <span className="text-nie8-primary">Journal.</span>
            </motion.h2>
          </div>
          
          <div className="flex flex-wrap gap-2 w-full md:w-auto overflow-x-auto pb-1 scroll-hide">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-[10px] sm:text-xs font-bold tracking-widest uppercase transition-all ${
                  activeCategory === cat
                    ? 'bg-nie8-primary text-white shadow-lg shadow-nie8-primary/20'
                    : 'text-nie8-text/40 hover:text-nie8-text border border-nie8-text/10'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-6 w-full md:w-auto overflow-x-auto pb-1 scroll-hide border-t border-nie8-text/5 pt-4 md:border-none md:pt-0">
            <span className="text-[9px] font-bold text-nie8-text/20 uppercase tracking-[0.2em]">Sắp xếp theo:</span>
            {[
              { id: 'sales-desc', label: 'Bán chạy' },
              { id: 'likes-desc', label: 'Yêu thích' },
              { id: 'price-asc', label: 'Giá ↑' },
              { id: 'price-desc', label: 'Giá ↓' },
            ].map(sort => (
              <button
                key={sort.id}
                onClick={() => setActiveSort(sort.id as any)}
                className={`whitespace-nowrap text-[10px] uppercase tracking-widest transition-all ${
                  activeSort === sort.id ? 'text-nie8-primary font-bold' : 'text-nie8-text/30 hover:text-nie8-text'
                }`}
              >
                {sort.label}
              </button>
            ))}
          </div>
        </div>

        {/* GRID CONTAINER: THE MAGAZINE LOOKBOOK */}
        <div className={`grid gap-4 sm:gap-10 ${
          settings?.grid_mode === 'full-lookbook' 
            ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 grid-flow-dense' 
            : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
        }`}>
          {isLoading ? (
            Array(8).fill(0).map((_, i) => <SkeletonCard key={i} />)
          ) : filteredProducts.length === 0 ? (
            <div className="col-span-full text-center py-24 text-nie8-text/30">
               <ShoppingBag size={48} className="mx-auto mb-4" strokeWidth={1} />
               <p className="font-serif italic text-xl">Hiện chưa có sản phẩm nào...</p>
            </div>
          ) : (
            currentProducts.map((product, index) => {
              // Magazine Layout Logic
              let spanClass = "col-span-1";
              let aspectClass = "aspect-[4/5]";
              
              if (settings?.grid_mode === 'full-lookbook') {
                const patternIndex = index % 8;
                if (patternIndex === 0) {
                  spanClass = "col-span-2 row-span-2 md:col-span-2 md:row-span-2";
                  aspectClass = "aspect-[4/5]";
                } else if (patternIndex === 4) {
                  spanClass = "col-span-1 md:col-span-2";
                  aspectClass = "aspect-[16/9] md:aspect-[21/9]";
                }
              }

              return (
                <React.Fragment key={product.id}>
                  {/* Story Block Integration */}
                  {settings?.show_story && product.story_content && product.story_content.length > 10 && (index % 6 === 3) && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      className="hidden lg:flex flex-col justify-center p-10 bg-nie8-bg/20 rounded-[48px] border border-nie8-primary/5 italic text-sm text-nie8-text/50 leading-relaxed font-serif text-center"
                    >
                      "{product.story_content}"
                    </motion.div>
                  )}

                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className={`${spanClass} relative group cursor-pointer`}
                    onClick={() => openProduct(product)}
                  >
                    <div className="h-full flex flex-col">
                      <div className={`${aspectClass} rounded-[40px] sm:rounded-[56px] overflow-hidden relative shadow-sm border border-nie8-primary/5 group-hover:shadow-2xl group-hover:shadow-nie8-primary/10 transition-all duration-700`}>
                        <div className={`w-full h-full transition-transform duration-700 hover:scale-110 ${isProductOutOfStock(product) ? 'opacity-70 grayscale-[0.3]' : ''}`}>
                          <LazyImage
                            src={product.images[0]}
                            alt={product.name}
                            className="group-hover:scale-105"
                          />
                        </div>
                        
                        {isProductOutOfStock(product) ? (
                          <div className="absolute top-4 left-4 bg-white/80 backdrop-blur-md text-nie8-text/60 text-[10px] font-bold px-4 py-1.5 rounded-full z-10 shadow-sm border border-white/50 tracking-widest">
                            SOLD OUT
                          </div>
                        ) : product.sales_count && product.sales_count > 10 ? (
                          <div className="absolute top-4 left-4 bg-nie8-text text-white text-[8px] font-bold px-3 py-1 rounded-full z-10 tracking-[0.2em] flex items-center gap-1.5 opacity-80">
                             <div className="w-1 h-1 bg-yellow-400 rounded-full animate-pulse"></div> BEST SELLER
                          </div>
                        ) : null}

                        <button 
                          onClick={(e) => toggleWishlist(product.id, e)}
                          className="absolute top-4 right-4 sm:top-6 sm:right-6 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center text-nie8-text/40 hover:text-red-500 transition-all z-10 border border-white/50"
                        >
                          <Heart size={18} className={wishlist.has(product.id) ? 'fill-red-500 text-red-500' : ''} />
                        </button>
                      </div>
                      
                      <div className="mt-4 sm:mt-6 px-2 text-center">
                        <h3 className="text-xs sm:text-base font-serif italic text-nie8-text group-hover:text-nie8-primary transition-colors">
                          {product.name}
                        </h3>
                        <p className="mt-1 font-bold text-[10px] sm:text-xs text-nie8-primary">
                          {formatVND(product.price)}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </React.Fragment>
              );
            })
          )}
        </div>

        {/* Empty state */}
        {!isLoading && filteredProducts.length === 0 && (
          <div className="text-center py-24 text-nie8-text/30">
            <ShoppingBag size={48} className="mx-auto mb-4" strokeWidth={1} />
            {activeCategory !== 'Tất cả'
              ? <p className="font-serif italic text-xl">Không có sản phẩm trong danh mục <span className="text-nie8-primary">{activeCategory}</span></p>
              : <p className="font-serif italic text-xl">Bộ sưu tập đang được cập nhật...</p>
            }
          </div>
        )}

        {/* Pagination — mobile friendly */}
        {totalPages > 1 && (
          <div className="mt-12 sm:mt-20 flex justify-center items-center gap-2 sm:gap-4">
            <button
              onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
              disabled={currentPage === 1}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-nie8-text/20 flex items-center justify-center disabled:opacity-30 active:bg-nie8-primary active:text-white transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex gap-2">
              {Array.from({ length: totalPages }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => handlePageChange(idx + 1)}
                  className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full text-sm font-medium transition-all ${
                    currentPage === idx + 1
                      ? 'bg-nie8-primary text-white'
                      : 'text-nie8-text/50 hover:bg-nie8-primary/10'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
            <button
              onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-nie8-text/20 flex items-center justify-center disabled:opacity-30 active:bg-nie8-primary active:text-white transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>

      {/* ===== PRODUCT DETAIL MODAL ===== */}
      <AnimatePresence>
        {selectedProduct && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
              onClick={closeModal}
            />

            {/* Modal Container to handle centering without transform conflicts */}
            <div className="fixed inset-0 z-[101] flex items-end sm:items-center justify-center pointer-events-none">
              {/* Modal — bottom sheet trên mobile, centered trên desktop */}
              <motion.div
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                className="w-full sm:max-w-5xl bg-white rounded-t-[24px] sm:rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[95dvh] sm:max-h-[90vh] pointer-events-auto"
              >
                {/* Drag handle — chỉ mobile */}
                <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
                  <div className="w-10 h-1 bg-nie8-text/20 rounded-full" />
                </div>

                <div className="flex flex-col flex-grow overflow-hidden">
                  <div className="flex flex-col sm:flex-row flex-grow overflow-y-auto sm:overflow-hidden">
                  {/* === IMAGE SECTION === */}
                  <div
                    className="w-full aspect-[4/5] sm:h-full sm:aspect-auto sm:w-[45%] flex-shrink-0 bg-nie8-bg relative"
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                  >
                  {/* Main image với swipe */}
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeImageIndex}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="w-full h-full sm:h-[520px]"
                    >
                      <LazyImage
                        src={selectedProduct.images[activeImageIndex]}
                        alt={selectedProduct.name}
                        className="w-full h-full object-cover"
                      />
                    </motion.div>
                  </AnimatePresence>

                  {/* Image dots indicator */}
                  {selectedProduct.images.length > 1 && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
                      {selectedProduct.images.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setActiveImageIndex(i)}
                          className={`h-1.5 rounded-full transition-all ${i === activeImageIndex ? 'w-5 bg-white' : 'w-1.5 bg-white/50'}`}
                        />
                      ))}
                    </div>
                  )}

                  {/* Desktop: prev/next arrows */}
                  {selectedProduct.images.length > 1 && (
                    <>
                      <button
                        onClick={() => setActiveImageIndex(prev => (prev - 1 + selectedProduct.images.length) % selectedProduct.images.length)}
                        className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 rounded-full items-center justify-center shadow-md z-20"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        onClick={() => setActiveImageIndex(prev => (prev + 1) % selectedProduct.images.length)}
                        className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 rounded-full items-center justify-center shadow-md z-20"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </>
                  )}

                  {/* Close button */}
                  <button
                    onClick={closeModal}
                    className="absolute top-3 right-3 w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md z-20"
                  >
                    <X size={18} />
                  </button>

                  {/* Share button */}
                  <button className="absolute top-3 left-3 w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md z-20">
                    <Share2 size={16} />
                  </button>
                </div>

                  {/* === PRODUCT INFO SECTION === */}
                  <div className="flex flex-col flex-grow sm:w-[55%] sm:overflow-y-auto">
                    <div className="flex-grow px-5 sm:px-8 pt-4 sm:pt-8 pb-4">

                    {/* Category + Rating */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-nie8-secondary">{selectedProduct.category}</span>
                      <div className="flex items-center gap-1">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} size={11} fill={i < 4 ? 'currentColor' : 'none'} className="text-nie8-primary" />
                          ))}
                        </div>
                        <span className="text-[10px] text-nie8-text/40 ml-1">(24)</span>
                      </div>
                    </div>

                    {/* Product name & price */}
                    <h2 className="text-xl sm:text-2xl font-serif italic text-nie8-text mb-2 leading-tight">{selectedProduct.name}</h2>
                    <p className="text-2xl font-bold text-nie8-primary mb-4">{formatVND(selectedProduct.price)}</p>

                    {/* Thumbnail images — desktop only */}
                    {selectedProduct.images.length > 1 && (
                      <div className="hidden sm:flex gap-2 mb-6">
                        {selectedProduct.images.map((img, i) => (
                          <button
                            key={i}
                            onClick={() => setActiveImageIndex(i)}
                            className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition-all ${i === activeImageIndex ? 'border-nie8-primary' : 'border-transparent opacity-60'}`}
                          >
                            <img src={img} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="mb-5">
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-xs font-bold uppercase tracking-wider text-nie8-text">Kích thước</span>
                        <button className="text-[10px] text-nie8-primary underline underline-offset-2">Bảng size</button>
                      </div>
                      <div className="flex gap-2">
                        {['S', 'M', 'L', 'XL'].map(size => {
                          const sizeStock = selectedProduct.stock_by_size?.[size] || 0;
                          const isOutOfStock = sizeStock === 0;
                          
                          return (
                            <button
                              key={size}
                              onClick={() => {
                                setSelectedSize(size);
                                if (quantity > sizeStock && sizeStock > 0) {
                                  setQuantity(sizeStock);
                                } else if (sizeStock === 0) {
                                  setQuantity(1);
                                }
                              }}
                              className={`min-w-[44px] h-11 px-3 rounded-xl border-2 text-sm font-bold transition-all active:scale-95 relative ${
                                selectedSize === size
                                  ? 'border-nie8-primary bg-nie8-primary text-white'
                                  : isOutOfStock
                                    ? 'border-nie8-text/5 bg-nie8-text/5 text-nie8-text/30 cursor-not-allowed'
                                    : 'border-nie8-text/15 text-nie8-text/70 hover:border-nie8-primary/50'
                              }`}
                            >
                              {selectedProduct.is_set ? `Set ${size}` : size}
                              {isOutOfStock && (
                                <span className="absolute -top-1 -right-1 w-2 h-2 bg-nie8-secondary/40 rounded-full border border-white" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Quantity */}
                    <div className="mb-5">
                      <span className="text-xs font-bold uppercase tracking-wider text-nie8-text block mb-2.5">Số lượng</span>
                      <div className="flex items-center gap-0 border border-nie8-text/15 rounded-xl w-fit overflow-hidden">
                        <button
                          onClick={() => setQuantity(q => Math.max(1, q - 1))}
                          className="w-11 h-11 flex items-center justify-center text-nie8-text hover:bg-nie8-primary/5 transition-colors active:bg-nie8-primary/10"
                        >
                          <Minus size={16} />
                        </button>
                        <span className="w-12 text-center text-sm font-bold">{quantity}</span>
                        <button
                          onClick={() => setQuantity(q => Math.min(q + 1, selectedProduct.stock_by_size?.[selectedSize] || 0))}
                          disabled={quantity >= (selectedProduct.stock_by_size?.[selectedSize] || 0)}
                          className="w-11 h-11 flex items-center justify-center text-nie8-text hover:bg-nie8-primary/5 transition-colors active:bg-nie8-primary/10 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                      {(selectedProduct.stock_by_size?.[selectedSize] || 0) > 0 && quantity >= (selectedProduct.stock_by_size?.[selectedSize] || 0) && (
                        <p className="text-[10px] text-nie8-primary/60 mt-1">Đã đạt số lượng tối đa trong kho</p>
                      )}
                    </div>

                    {/* Description & Story */}
                    <div className="mb-4">
                      {selectedProduct.story_content && (
                        <div className="mb-4 p-4 bg-nie8-bg rounded-2xl border-l-4 border-nie8-primary italic text-nie8-text/80 text-sm leading-relaxed">
                          "{selectedProduct.story_content}"
                        </div>
                      )}
                      <span className="text-xs font-bold uppercase tracking-wider text-nie8-text block mb-2">Chi tiết bộ đồ</span>
                      <p className="text-sm text-nie8-text/70 leading-relaxed">{selectedProduct.description}</p>
                    </div>

                    {/* Outfit Suggestions — chỉ render khi sản phẩm vẫn còn tồn tại và còn hàng */}
                    {selectedProduct.outfit_suggestions && selectedProduct.outfit_suggestions.length > 0 && (() => {
                      const validSuggestions = selectedProduct.outfit_suggestions
                        .map(id => products.find(p => p.id === id))
                        .filter((p): p is Product => p != null && !isProductOutOfStock(p));
                      if (validSuggestions.length === 0) return null;
                      return (
                        <div className="mb-4 mt-6">
                          <span className="text-xs font-bold uppercase tracking-wider text-nie8-primary flex items-center gap-1 mb-3">
                            <Sparkles size={14} /> Gợi ý thêm từ Nie8
                          </span>
                          <div className="flex gap-3 overflow-x-auto scroll-hide pb-2">
                            {validSuggestions.map(suggestedProduct => (
                              <div
                                key={suggestedProduct.id}
                                className="min-w-[120px] w-[120px] rounded-xl overflow-hidden border border-nie8-primary/10 cursor-pointer hover:border-nie8-primary/30 transition-colors"
                                onClick={() => openProduct(suggestedProduct)}
                              >
                                <div className="aspect-[3/4] bg-nie8-primary/5">
                                  <img src={suggestedProduct.images[0]} alt={suggestedProduct.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                </div>
                                <div className="p-2 bg-white">
                                  <p className="text-[10px] font-bold truncate text-nie8-text">{suggestedProduct.name}</p>
                                  <p className="text-[10px] text-nie8-primary mt-0.5">{formatVND(suggestedProduct.price)}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Size info */}
                    <div className="bg-nie8-bg rounded-2xl p-4 mb-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-nie8-secondary mb-2">Thông số size</p>
                      <div className="grid grid-cols-3 gap-1 text-xs text-nie8-text/70">
                        <span>S: Dài 64,5cm</span>
                        <span>M: Dài 65,5cm</span>
                        <span>L: Dài 66,5cm</span>
                      </div>
                    </div>

                    </div>
                  </div>
                </div>

                  {/* === STICKY CTA — quan trọng nhất trên mobile ===== */}
                  <div className="flex-shrink-0 px-5 sm:px-8 py-4 sm:py-5 bg-white border-t border-nie8-primary/10 safe-area-pb z-10 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
                    {/* Check stock for the SPECIFIC selected size */}
                    {!isProductOutOfStock(selectedProduct) && (selectedProduct.stock_by_size?.[selectedSize] || 0) > 0 ? (
                      <div className="flex gap-3">
                        {/* Wishlist button */}
                        <button
                          onClick={(e) => toggleWishlist(selectedProduct.id, e)}
                          className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border-2 border-nie8-text/15 flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform"
                        >
                          <Heart
                            size={20}
                            className={wishlist.has(selectedProduct.id) ? 'fill-red-500 text-red-500' : 'text-nie8-text/60'}
                          />
                        </button>

                        {/* Add to cart button */}
                        <button
                          onClick={handleAddToCart}
                          className={`flex-1 h-12 sm:h-14 rounded-2xl font-bold text-[10px] sm:text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg ${
                            addedToCart
                              ? 'bg-green-500 text-white shadow-green-500/30'
                              : 'bg-white border-2 border-nie8-primary text-nie8-primary hover:bg-nie8-primary/5'
                          }`}
                        >
                          <ShoppingBag size={16} />
                          {addedToCart ? 'Đã thêm ✓' : 'Thêm vào giỏ'}
                        </button>

                        {/* Buy Now button */}
                        <button
                          onClick={() => onBuyNow?.(selectedProduct, selectedSize, quantity)}
                          className="flex-1 h-12 sm:h-14 rounded-2xl bg-nie8-primary text-white font-bold text-[10px] sm:text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-nie8-primary/30 hover:bg-nie8-secondary"
                        >
                          Thanh toán ngay
                        </button>

                      </div>
                    ) : (
                      <div className="py-4">
                        <div className="flex items-center gap-2 text-nie8-text/30 font-bold text-xs uppercase tracking-widest mb-2">
                           Size {selectedSize} hiện đang hết hàng
                        </div>
                        <div className="p-4 bg-nie8-bg rounded-2xl border border-nie8-primary/5 text-nie8-text/40 text-[10px] font-medium leading-relaxed">
                          Sản phẩm này hiện đã hết hàng. Bạn có thể chọn size khác hoặc nhắn tin trực tiếp cho Nie8 qua Instagram để được hỗ trợ nhanh nhất.
                        </div>
                      </div>
                    )}

                    {/* Trust signals */}
                    <p className="text-center text-[10px] text-nie8-text/30 uppercase tracking-widest mt-3">
                      Đổi trả miễn phí trong 7 ngày · Giao hàng toàn quốc
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </section>
  );
}
