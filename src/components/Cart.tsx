import { motion, AnimatePresence } from 'motion/react';
import { X, ShoppingBag, Plus, Minus, Trash2, ArrowRight, Tag } from 'lucide-react';
import { CartItem } from '../types';
import { useEffect } from 'react';

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (id: string, size: string, delta: number) => void;
  onRemoveItem: (id: string, size: string) => void;
}

export default function Cart({ isOpen, onClose, items, onUpdateQuantity, onRemoveItem }: CartProps) {
  const total = items.reduce((sum, item) => {
    const price = parseFloat(item.price.replace(/[^0-9.]/g, ''));
    return sum + price * item.quantity;
  }, 0);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  // Lock scroll khi cart mở
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200]"
          />

          {/* Cart panel — bottom sheet trên mobile, slide từ phải trên desktop */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed bottom-0 left-0 right-0 sm:bottom-auto sm:top-0 sm:left-auto sm:right-0 sm:h-full sm:w-full sm:max-w-md z-[201] bg-white flex flex-col rounded-t-[24px] sm:rounded-none max-h-[92dvh] sm:max-h-none"
          >
            {/* Drag handle (mobile) */}
            <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 sm:px-8 py-4 sm:py-6 border-b border-nie8-primary/10 flex-shrink-0">
              <div className="flex items-center gap-3">
                <ShoppingBag size={20} className="text-nie8-primary" />
                <h2 className="text-lg sm:text-2xl font-serif italic text-nie8-text">Giỏ hàng</h2>
                {totalItems > 0 && (
                  <span className="text-xs bg-nie8-primary text-white w-5 h-5 rounded-full flex items-center justify-center font-bold">
                    {totalItems}
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full border border-nie8-primary/20 flex items-center justify-center text-nie8-text hover:bg-nie8-primary hover:text-white transition-all active:scale-95"
              >
                <X size={18} />
              </button>
            </div>

            {/* Cart items */}
            <div className="flex-grow overflow-y-auto scroll-hide px-5 sm:px-8 py-4 sm:py-6">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-12">
                  <div className="w-20 h-20 bg-nie8-primary/5 rounded-full flex items-center justify-center mb-5">
                    <ShoppingBag size={32} className="text-nie8-primary/20" strokeWidth={1.5} />
                  </div>
                  <p className="text-nie8-text/40 font-serif italic text-lg mb-2">Giỏ hàng đang trống</p>
                  <p className="text-nie8-text/30 text-sm mb-8">Thêm sản phẩm yêu thích của bạn</p>
                  <button
                    onClick={onClose}
                    className="px-8 py-3 bg-nie8-primary text-white rounded-full text-sm font-bold uppercase tracking-wider active:scale-95 transition-transform"
                  >
                    Tiếp tục mua sắm
                  </button>
                </div>
              ) : (
                <div className="space-y-4 sm:space-y-6">
                  {items.map((item) => (
                    <motion.div
                      key={`${item.id}-${item.size || ''}`}
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20, height: 0 }}
                      className="flex gap-4 py-1"
                    >
                      {/* Product image */}
                      <div className="w-20 h-24 sm:w-24 sm:h-32 rounded-xl sm:rounded-2xl overflow-hidden flex-shrink-0 bg-nie8-bg">
                        {item.images?.[0] && (
                          <img
                            src={item.images[0]}
                            alt={item.name}
                            loading="lazy"
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        )}
                      </div>

                      {/* Product info */}
                      <div className="flex-grow flex flex-col justify-between min-w-0">
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h3 className="font-serif italic text-sm sm:text-base text-nie8-text leading-tight line-clamp-2">{item.name}</h3>
                            <button
                              onClick={() => onRemoveItem(item.id, item.size || '')}
                              className="text-nie8-text/20 hover:text-red-400 transition-colors flex-shrink-0 p-1 -mt-1 -mr-1 active:scale-90"
                            >
                              <X size={16} />
                            </button>
                          </div>
                          {/* Size tag */}
                          {item.size && (
                            <span className="inline-flex items-center gap-1 text-[10px] bg-nie8-bg border border-nie8-primary/10 text-nie8-secondary px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                              <Tag size={8} />
                              Size {item.size}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          {/* Quantity control */}
                          <div className="flex items-center border border-nie8-primary/15 rounded-xl overflow-hidden">
                            <button
                              onClick={() => onUpdateQuantity(item.id, item.size || '', -1)}
                              className="w-8 h-8 flex items-center justify-center text-nie8-text/60 hover:bg-nie8-primary/5 active:bg-nie8-primary/10 transition-colors"
                            >
                              {item.quantity === 1 ? <Trash2 size={13} className="text-red-400" /> : <Minus size={13} />}
                            </button>
                            <span className="w-7 text-center text-sm font-bold">{item.quantity}</span>
                            <button
                              onClick={() => onUpdateQuantity(item.id, item.size || '', 1)}
                              className="w-8 h-8 flex items-center justify-center text-nie8-text/60 hover:bg-nie8-primary/5 active:bg-nie8-primary/10 transition-colors"
                            >
                              <Plus size={13} />
                            </button>
                          </div>
                          {/* Price */}
                          <p className="font-bold text-nie8-text text-sm">
                            ${(parseFloat(item.price.replace(/[^0-9.]/g, '')) * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {/* Free shipping bar */}
                  {total < 150 && (
                    <div className="bg-nie8-bg rounded-2xl p-4">
                      <div className="flex justify-between text-xs mb-2">
                        <span className="text-nie8-text/60">Thêm <span className="font-bold text-nie8-primary">${(150 - total).toFixed(0)}</span> để miễn phí vận chuyển</span>
                        <span className="font-bold text-nie8-text">{Math.round((total / 150) * 100)}%</span>
                      </div>
                      <div className="h-1.5 bg-nie8-primary/10 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min((total / 150) * 100, 100)}%` }}
                          className="h-full bg-nie8-primary rounded-full"
                        />
                      </div>
                    </div>
                  )}

                  {total >= 150 && (
                    <div className="bg-green-50 border border-green-200 rounded-2xl p-3 text-center">
                      <p className="text-green-600 text-xs font-bold">🎉 Bạn được miễn phí vận chuyển!</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Checkout section — sticky */}
            {items.length > 0 && (
              <div className="flex-shrink-0 px-5 sm:px-8 py-4 sm:py-6 bg-white border-t border-nie8-primary/10 safe-area-pb">
                {/* Order summary */}
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <p className="text-xs text-nie8-text/40 uppercase tracking-widest">Tổng cộng</p>
                    <p className="text-2xl sm:text-3xl font-serif italic text-nie8-text mt-0.5">${total.toFixed(2)}</p>
                  </div>
                  <div className="text-right text-xs text-nie8-text/40">
                    <p>Đã bao gồm VAT</p>
                    {total >= 150 && <p className="text-green-500 font-bold">Free ship</p>}
                  </div>
                </div>

                {/* Checkout CTA — full width, lớn cho ngón cái */}
                <button className="w-full py-4 sm:py-5 bg-nie8-primary text-white rounded-2xl font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-3 shadow-xl shadow-nie8-primary/25 hover:bg-nie8-secondary transition-colors active:scale-[0.98] group">
                  Thanh toán ngay
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>

                {/* Payment methods */}
                <p className="text-center text-[10px] text-nie8-text/25 uppercase tracking-widest mt-3">
                  Thanh toán an toàn · COD · Chuyển khoản · Ví điện tử
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
