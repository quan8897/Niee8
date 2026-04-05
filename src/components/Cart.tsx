import { motion, AnimatePresence } from 'motion/react';
import { X, ShoppingBag, Plus, Minus, Trash2, ArrowRight } from 'lucide-react';
import { CartItem } from '../types';

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
}

export default function Cart({ isOpen, onClose, items, onUpdateQuantity, onRemoveItem }: CartProps) {
  const total = items.reduce((sum, item) => {
    const price = parseFloat(item.price.replace('$', ''));
    return sum + price * item.quantity;
  }, 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-nie8-bg z-[101] shadow-2xl flex flex-col"
          >
            <div className="p-8 flex items-center justify-between border-b border-nie8-primary/10">
              <div className="flex items-center gap-3">
                <ShoppingBag size={24} className="text-nie8-primary" />
                <h2 className="text-2xl font-serif italic text-nie8-text">Giỏ hàng của bạn</h2>
              </div>
              <button 
                onClick={onClose}
                className="w-10 h-10 rounded-full border border-nie8-primary/10 flex items-center justify-center text-nie8-text hover:bg-nie8-primary hover:text-white transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-grow overflow-y-auto p-8 scroll-hide">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <div className="w-20 h-20 bg-nie8-primary/5 rounded-full flex items-center justify-center mb-6">
                    <ShoppingBag size={32} className="text-nie8-primary/20" />
                  </div>
                  <p className="text-nie8-text/40 font-serif italic text-lg">Giỏ hàng của bạn đang trống.</p>
                  <button 
                    onClick={onClose}
                    className="mt-8 text-nie8-primary font-medium border-b border-nie8-primary pb-1 hover:text-nie8-secondary hover:border-nie8-secondary transition-all"
                  >
                    Tiếp tục mua sắm
                  </button>
                </div>
              ) : (
                <div className="space-y-8">
                  {items.map((item) => (
                    <motion.div 
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex gap-6"
                    >
                      <div className="w-24 h-32 rounded-2xl overflow-hidden flex-shrink-0 bg-white">
                        <img src={item.images[0]} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div className="flex-grow flex flex-col justify-between py-1">
                        <div>
                          <div className="flex justify-between items-start mb-1">
                            <h3 className="font-serif italic text-lg text-nie8-text leading-tight">{item.name}</h3>
                            <button 
                              onClick={() => onRemoveItem(item.id)}
                              className="text-nie8-text/20 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                          <p className="text-xs text-nie8-secondary uppercase tracking-widest mb-2">{item.category}</p>
                          <p className="font-medium text-nie8-text">{item.price}</p>
                        </div>
                        
                        <div className="flex items-center justify-between mt-4">
                          <div className="flex items-center border border-nie8-primary/10 rounded-full px-2 py-1 bg-white">
                            <button 
                              onClick={() => onUpdateQuantity(item.id, -1)}
                              className="w-8 h-8 flex items-center justify-center text-nie8-text/40 hover:text-nie8-primary transition-colors"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="w-8 text-center font-medium text-sm">{item.quantity}</span>
                            <button 
                              onClick={() => onUpdateQuantity(item.id, 1)}
                              className="w-8 h-8 flex items-center justify-center text-nie8-text/40 hover:text-nie8-primary transition-colors"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <p className="font-medium text-nie8-text">
                            ${(parseFloat(item.price.replace('$', '')) * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="p-8 bg-white border-t border-nie8-primary/10">
                <div className="flex justify-between items-end mb-8">
                  <span className="text-nie8-text/40 uppercase tracking-widest text-xs font-bold">Tổng cộng</span>
                  <span className="text-3xl font-serif italic text-nie8-text">${total.toFixed(2)}</span>
                </div>
                <button className="w-full py-5 bg-nie8-primary text-white rounded-full font-medium hover:bg-nie8-secondary transition-all flex items-center justify-center gap-3 shadow-xl shadow-nie8-primary/20 group">
                  Tiến hành thanh toán
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
                <p className="text-center text-[10px] text-nie8-text/30 uppercase tracking-[0.2em] mt-6">
                  Miễn phí vận chuyển cho đơn hàng trên $150
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
