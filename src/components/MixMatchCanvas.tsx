import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Move, RotateCcw, ShoppingBag, Plus } from 'lucide-react';

interface CanvasItem {
  id: string;
  name: string;
  image: string;
  category: 'top' | 'bottom' | 'outer' | 'accessory';
}

const items: CanvasItem[] = [
  { id: '1', name: 'Áo len Tan', image: 'https://images.unsplash.com/photo-1539109132314-34a77ae68c44?q=80&w=300&auto=format&fit=crop', category: 'top' },
  { id: '2', name: 'Váy Trắng Yjia', image: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?q=80&w=300&auto=format&fit=crop', category: 'bottom' },
  { id: '3', name: 'Sơ mi Vintage', image: 'https://images.unsplash.com/photo-1551163943-3f6a855d1153?q=80&w=300&auto=format&fit=crop', category: 'top' },
  { id: '4', name: 'Áo khoác dạ', image: 'https://images.unsplash.com/photo-1539533113208-f6df8cc8b543?q=80&w=300&auto=format&fit=crop', category: 'outer' },
  { id: '5', name: 'Túi xách da', image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=300&auto=format&fit=crop', category: 'accessory' },
];

export default function MixMatchCanvas() {
  const [canvasItems, setCanvasItems] = useState<CanvasItem[]>([]);

  const addToCanvas = (item: CanvasItem) => {
    if (canvasItems.find(i => i.id === item.id)) return;
    setCanvasItems([...canvasItems, item]);
  };

  const removeFromCanvas = (id: string) => {
    setCanvasItems(canvasItems.filter(item => item.id !== id));
  };

  const resetCanvas = () => setCanvasItems([]);

  return (
    <section className="py-24 bg-nie8-bg relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.span 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="text-nie8-secondary text-xs font-medium tracking-[0.3em] uppercase mb-4 block"
          >
            Trải nghiệm Tương tác
          </motion.span>
          <h2 className="text-4xl md:text-5xl font-serif italic text-nie8-text mb-6">Mix & Match Canvas</h2>
          <p className="text-nie8-text/60 max-w-lg mx-auto">Kéo thả các món đồ để tạo nên phong cách riêng biệt của bạn. Sự sáng tạo là không giới hạn cùng nie8.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Wardrobe Sidebar */}
          <div className="lg:col-span-1 bg-white p-8 rounded-[40px] shadow-xl border border-nie8-primary/10">
            <h3 className="text-xl font-serif italic text-nie8-text mb-8">Tủ đồ của bạn</h3>
            <div className="grid grid-cols-2 gap-4">
              {items.map((item) => (
                <motion.div
                  key={item.id}
                  whileHover={{ scale: 1.05 }}
                  className="group relative aspect-square rounded-2xl overflow-hidden cursor-pointer bg-nie8-primary/5"
                  onClick={() => addToCanvas(item)}
                >
                  <img 
                    src={item.image} 
                    alt={item.name} 
                    className="w-full h-full object-cover transition-transform group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <Plus className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Canvas Area */}
          <div className="lg:col-span-2 relative bg-white rounded-[40px] shadow-2xl border-4 border-dashed border-nie8-primary/20 min-h-[600px] overflow-hidden">
            <div className="absolute top-6 right-6 z-10 flex gap-3">
              <button 
                onClick={resetCanvas}
                className="p-3 bg-white rounded-full shadow-lg text-nie8-text hover:bg-nie8-primary hover:text-white transition-all"
                title="Làm mới"
              >
                <RotateCcw size={20} />
              </button>
              <button 
                className="px-6 py-3 bg-nie8-primary text-white rounded-full shadow-lg font-medium hover:bg-nie8-secondary transition-all flex items-center gap-2"
              >
                <ShoppingBag size={18} />
                Mua set đồ này
              </button>
            </div>

            <AnimatePresence>
              {canvasItems.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center text-nie8-text/20"
                >
                  <Move size={80} strokeWidth={1} className="mb-4" />
                  <p className="font-serif italic text-xl">Chọn đồ từ tủ để bắt đầu phối</p>
                </motion.div>
              ) : (
                canvasItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    drag
                    dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                    dragElastic={0.1}
                    initial={{ opacity: 0, scale: 0.8, x: 100 + index * 20, y: 100 + index * 20 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute w-64 h-80 cursor-grab active:cursor-grabbing group"
                    style={{ zIndex: index + 1 }}
                  >
                    <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-xl border-2 border-white">
                      <img 
                        src={item.image} 
                        alt={item.name} 
                        className="w-full h-full object-cover pointer-events-none"
                        referrerPolicy="no-referrer"
                      />
                      <button 
                        onClick={() => removeFromCanvas(item.id)}
                        className="absolute top-2 right-2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Plus className="rotate-45" size={16} />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
