import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Truck, CreditCard, ChevronRight, MapPin, Phone, User, CheckCircle2, AlertCircle, ArrowLeft, Loader2, Mail, Info, Trash2, Plus, Minus, Receipt, Ticket, X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';

const formatVND = (val: number | string) => {
  const num = typeof val === 'string' ? parseFloat(val.replace(/[^0-9]/g, '')) || 0 : val;
  return new Intl.NumberFormat('vi-VN').format(num) + 'đ';
};

interface CheckoutProps {
  items: any[];
  total: number;
  onBack: () => void;
  onComplete: (orderId: string, phone: string) => void;
  user?: any;
  onUpdateQuantity?: (id: string, size: string, delta: number) => void;
  onRemoveItem?: (id: string, size: string) => void;
}

export default function Checkout({ items, total, onBack, onComplete, user, onUpdateQuantity, onRemoveItem }: CheckoutProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    note: '',
    paymentMethod: 'cod' as 'cod' | 'payos'
  });

  // Phase 1 Simplification: invoice state removed (not needed for Lifestyle/Taobao model)
  
  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupons, setAppliedCoupons] = useState<any[]>([]);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [allCoupons, setAllCoupons] = useState<any[]>([]);

  const shippingFee = 2000; // Fixed 2000 VND for test
  
  // Calculate total discount from multiple coupons
  // Calculate separate discounts for shop items and shipping
  const calculateDiscounts = () => {
    let shipDiscount = 0;
    let shopDiscount = 0;

    appliedCoupons.forEach(coupon => {
      let currentDiscount = 0;
      const isShipping = coupon.category === 'shipping';
      const basis = isShipping ? shippingFee : total;

      if (coupon.discount_amount) {
        currentDiscount = parseFloat(coupon.discount_amount);
      } else if (coupon.discount_percent) {
        currentDiscount = (basis * coupon.discount_percent) / 100;
        if (coupon.max_discount_amount) {
          currentDiscount = Math.min(currentDiscount, parseFloat(coupon.max_discount_amount));
        }
      }
      
      // Cap individual coupon at its specific sub-total
      if (isShipping) {
        shipDiscount = Math.min(currentDiscount, shippingFee);
      } else {
        shopDiscount = Math.min(currentDiscount, total);
      }
    });

    return { shipDiscount, shopDiscount };
  };

  const { shipDiscount, shopDiscount } = calculateDiscounts();
  const discountAmount = shipDiscount + shopDiscount;
  const finalTotal = (total - shopDiscount) + (shippingFee - shipDiscount);

  const handleApplyCoupon = async (codeFromModal?: string) => {
    const codeToUse = (codeFromModal || couponCode).trim().toUpperCase();
    if (!codeToUse) return;
    
    setIsApplyingCoupon(true);
    setCouponError(null);
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', codeToUse)
        .single();

      if (error || !data) throw new Error('Mã không hợp lệ.');
      
      const now = new Date();
      if (data.expires_at && new Date(data.expires_at) < now) {
        throw new Error('Mã này đã hết hạn sử dụng.');
      }

      if (!data.is_active) throw new Error('Mã này đã bị vô hiệu hóa.');
      if (data.usage_limit && data.usage_count >= data.usage_limit) throw new Error('Mã này đã hết lượt sử dụng.');
      if (data.require_auth && !user) throw new Error('Mã này chỉ dành cho thành viên đã đăng nhập.');
      if (data.min_order_amount && total < parseFloat(data.min_order_amount)) {
        throw new Error(`Đơn hàng tối thiểu ${new Intl.NumberFormat('vi-VN').format(data.min_order_amount)}đ để áp dụng mã này.`);
      }

      // Stacking logic: Max 1 shipping + Max 1 shop (anything else)
      const isNewShipping = data.category === 'shipping';
      setAppliedCoupons(prev => {
        const filtered = prev.filter(c => {
          const isExistingShipping = c.category === 'shipping';
          return isNewShipping ? !isExistingShipping : isExistingShipping;
        });
        return [...filtered, data];
      });
      setCouponCode('');
      setCouponError(null);
      setIsVoucherModalOpen(false);
    } catch (err: any) {
      setCouponError(err.message);
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const removeCoupon = (code: string) => {
    setAppliedCoupons(prev => prev.filter(c => c.code !== code));
  };

  const [statusMessage, setStatusMessage] = useState<{ text: string, type: 'error' | 'success' | 'info' } | null>(null);

  const showStatus = (text: string, type: 'error' | 'success' | 'info' = 'error') => {
    setStatusMessage({ text, type });
    // Tự động ẩn sau 5 giây
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isProcessing) return;
    if (!formData.name || !formData.phone || !formData.address || !formData.city) {
      showStatus("Vui lòng điền đầy đủ thông tin giao hàng nhé.");
      return;
    }
    if (items.length === 0) {
      showStatus("Giỏ hàng của bạn đang trống.");
      return;
    }
    
    setIsProcessing(true);
    setStatusMessage(null);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: formData.name,
          customerPhone: formData.phone,
          customerAddress: formData.address,
          customerCity: formData.city,
          totalAmount: finalTotal, 
          items: items.map(i => ({ id: i.id, size: i.size, quantity: i.quantity, name: i.name, images: i.images, price: i.price })),
          paymentMethod: formData.paymentMethod,
          userId: user?.id,
          note: formData.note,
          discountAmount: discountAmount,
          shippingFee: shippingFee,
          couponCodes: appliedCoupons.map(c => c.code)
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Đã xảy ra lỗi trong quá trình thanh toán.');
      }

      if (data.checkoutUrl) {
        localStorage.setItem('nie8_temp_phone', formData.phone);
        window.location.href = data.checkoutUrl;
      } else {
        setCurrentOrderId(data.orderId);
      }
    } catch (error: any) {
      console.error('Checkout Error:', error);
      showStatus(error.message);
    } finally {
      setIsProcessing(false);
    }
  }, [formData, items, user, finalTotal, isProcessing, appliedCoupons, discountAmount]);

  useEffect(() => {
    async function loadCoupons() {
      const { data } = await supabase.from('coupons').select('*').eq('is_active', true);
      if (data) setAllCoupons(data);
    }
    loadCoupons();
  }, []);

  useEffect(() => {
    if (currentOrderId && onComplete) {
      const timer = setTimeout(() => {
         onComplete(currentOrderId, formData.phone);
      }, 5000); 
      return () => clearTimeout(timer);
    }
  }, [currentOrderId, onComplete, formData.phone]);

  if (currentOrderId) {
    return (
      <div className="min-h-screen bg-nie8-bg pt-32 pb-20 px-4">
        <div className="max-w-md mx-auto bg-white p-10 rounded-[32px] shadow-sm border border-nie8-primary/5 text-center">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-8">
            <CheckCircle2 size={40} className="text-green-500" />
          </div>
          <h2 className="text-3xl font-serif italic mb-4 text-nie8-text">Cảm ơn bạn!</h2>
          <p className="text-nie8-text/60 mb-8 leading-relaxed">Đơn hàng <span className="font-bold text-nie8-text">#{currentOrderId}</span> đã được tiếp nhận thành công.</p>
          <button onClick={() => onComplete(currentOrderId, formData.phone)} className="w-full bg-nie8-text text-white py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-nie8-text/80 transition-all shadow-lg active:scale-95">Tiếp tục mua sắm</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen sm:bg-[#F8F9FA] bg-gray-50 pt-20 sm:pt-24 pb-20 px-0 sm:px-4 lg:px-8 font-sans transition-colors duration-300">
      {/* Status Message Display - FIXED TOAST for better Visibility on Mobile */}
      <AnimatePresence>
        {statusMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-5 left-4 right-4 z-[200] flex justify-center pointer-events-none"
          >
            <div className={`p-4 rounded-2xl shadow-2xl flex items-start gap-3 border pointer-events-auto max-w-md w-full ${
              statusMessage.type === 'error' 
                ? 'bg-white border-rose-100 text-rose-800' 
                : 'bg-white border-emerald-100 text-emerald-800'
            }`}>
              <AlertCircle size={20} className={`flex-shrink-0 mt-0.5 ${statusMessage.type === 'error' ? 'text-rose-500' : 'text-emerald-500'}`} />
              <div className="flex flex-col gap-1">
                <span className="text-sm font-bold">{statusMessage.type === 'error' ? 'Thông báo' : 'Thành công'}</span>
                <span className="text-xs font-medium opacity-90">{statusMessage.text}</span>
              </div>
              <button onClick={() => setStatusMessage(null)} className="ml-auto text-gray-400"><X size={16} /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto flex items-center justify-between mb-8 cursor-pointer" onClick={onBack}>
         <div className="text-xl font-serif italic text-nie8-text hover:text-nie8-primary transition-colors flex items-center gap-2"><ArrowLeft size={20} /> nie8.</div>
      </div>
      
      <div className="max-w-6xl mx-auto grid lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 space-y-6">
          
          {/* Default Login prompt if not signed in */}
          {!user && (
            <div className="bg-white p-6 rounded-2xl shadow-sm flex items-center justify-between border border-gray-50">
              <span className="text-sm font-medium text-gray-700">Đăng nhập để mua hàng tiện lợi và nhận nhiều ưu đãi hơn nữa</span>
              <button className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-6 py-2 rounded-lg font-medium text-sm transition-colors">Đăng nhập</button>
            </div>
          )}

          {/* Shipping Form */}
          <section className="bg-white p-4 sm:p-8 sm:rounded-2xl shadow-sm border-b sm:border-none">
            <h2 className="text-sm sm:text-lg font-black text-gray-900 mb-4 sm:mb-6 flex items-center gap-2 uppercase tracking-widest">
              <MapPin size={16} className="text-nie8-primary" />
              Thông tin giao hàng
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="sm:col-span-2">
                <input type="text" placeholder="Họ và tên" required className="w-full bg-nie8-bg/20 border-none rounded-xl py-3 px-4 text-xs sm:text-sm focus:bg-white focus:ring-1 focus:ring-nie8-primary/20 outline-none transition-all" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="relative">
                <input type="tel" placeholder="Số điện thoại" required className="w-full bg-nie8-bg/20 border-none rounded-xl py-3 px-4 pr-12 text-xs sm:text-sm focus:bg-white focus:ring-1 focus:ring-nie8-primary/20 outline-none transition-all" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-60">
                   <div className="w-5 h-3 bg-red-600 flex items-center justify-center rounded-[1px] overflow-hidden"><div className="text-yellow-400 text-[8px] leading-none">★</div></div>
                </div>
              </div>
              <input type="email" placeholder="Email (không bắt buộc)" className="w-full bg-nie8-bg/20 border-none rounded-xl py-3 px-4 text-xs sm:text-sm focus:bg-white focus:ring-1 focus:ring-nie8-primary/20 outline-none transition-all" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
              <input type="text" placeholder="Tỉnh/TP, Quận/Huyện, Phường/Xã" required className="sm:col-span-2 w-full bg-nie8-bg/20 border-none rounded-xl py-3 px-4 text-xs sm:text-sm focus:bg-white focus:ring-1 focus:ring-nie8-primary/20 outline-none transition-all" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} />
              <textarea placeholder="Địa chỉ chi tiết, tên đường, số nhà..." required rows={2} className="sm:col-span-2 w-full bg-nie8-bg/20 border-none rounded-xl py-3 px-4 text-xs sm:text-sm focus:bg-white focus:ring-1 focus:ring-nie8-primary/20 outline-none transition-all resize-none" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
            </div>
          </section>

          {/* Delivery Method */}
          <section className="bg-white p-4 sm:p-8 sm:rounded-2xl shadow-sm border-b sm:border-none">
            <div className="flex items-center justify-between group cursor-pointer lg:cursor-default">
              <div className="flex items-center gap-2">
                <Truck size={16} className="text-nie8-primary" />
                <span className="text-[13px] sm:text-base font-black text-gray-900 uppercase tracking-widest">Vận chuyển</span>
              </div>
              <div className="flex items-center gap-2 text-right">
                <div className="flex flex-col items-end">
                   <span className="text-[11px] font-bold text-gray-900">Siêu tốc (Test)</span>
                   <span className="text-[10px] text-gray-400 font-medium italic">Nhận hàng trong 24h</span>
                </div>
                <span className="text-[13px] font-black text-nie8-primary ml-2">{formatVND(shippingFee)}</span>
                <ChevronRight size={14} className="text-gray-300 lg:hidden" />
              </div>
            </div>
          </section>

          {/* Payment Method */}
          <section className="bg-white p-4 sm:p-8 sm:rounded-2xl shadow-sm border-b sm:border-none">
            <h2 className="text-sm sm:text-lg font-black text-gray-900 mb-4 sm:mb-6 uppercase tracking-widest flex items-center gap-2">
              <CreditCard size={16} className="text-nie8-primary" />
              Thanh toán
            </h2>
            
            {/* Desktop View: Grid of boxes */}
            <div className="hidden sm:grid grid-cols-2 gap-4">
              <label className={`flex items-center p-4 rounded-xl border-2 transition-all cursor-pointer ${formData.paymentMethod === 'cod' ? 'border-gray-900 bg-gray-50' : 'border-gray-100 hover:border-gray-200'}`}>
                <input type="radio" name="payment" className="hidden" checked={formData.paymentMethod === 'cod'} onChange={() => setFormData({...formData, paymentMethod: 'cod'})} />
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center mr-3 ${formData.paymentMethod === 'cod' ? 'border-4 border-gray-900 bg-white' : 'border-gray-300'}`}></div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-6 bg-zinc-200 rounded flex items-center justify-center"><span className="text-[8px] font-bold">COD</span></div>
                  <span className="text-sm font-medium">Tiền mặt</span>
                </div>
              </label>
              <label className={`flex items-center p-4 rounded-xl border-2 transition-all cursor-pointer ${formData.paymentMethod === 'payos' ? 'border-gray-900 bg-gray-50' : 'border-gray-100 hover:border-gray-200'}`}>
                <input type="radio" name="payment" className="hidden" checked={formData.paymentMethod === 'payos'} onChange={() => setFormData({...formData, paymentMethod: 'payos'})} />
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center mr-3 ${formData.paymentMethod === 'payos' ? 'border-4 border-gray-900 bg-white' : 'border-gray-300'}`}></div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-6 bg-emerald-500 rounded flex items-center justify-center"><CreditCard size={12} className="text-white"/></div>
                  <span className="text-sm font-medium">Chuyển khoản QR</span>
                </div>
              </label>
            </div>

            {/* Mobile View: Compact list rows */}
            <div className="sm:hidden space-y-2">
              <div 
                onClick={() => setFormData({...formData, paymentMethod: 'cod'})}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${formData.paymentMethod === 'cod' ? 'border-nie8-primary bg-nie8-bg/20' : 'border-gray-100 bg-white'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-6 bg-zinc-200 rounded flex items-center justify-center shadow-sm"><span className="text-[8px] font-black">COD</span></div>
                  <span className="text-xs font-bold text-gray-800">Thanh toán khi nhận hàng</span>
                </div>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${formData.paymentMethod === 'cod' ? 'border-4 border-nie8-primary bg-white' : 'border-gray-200'}`}></div>
              </div>

              <div 
                onClick={() => setFormData({...formData, paymentMethod: 'payos'})}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${formData.paymentMethod === 'payos' ? 'border-nie8-primary bg-nie8-bg/20' : 'border-gray-100 bg-white'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-6 bg-emerald-500 rounded flex items-center justify-center shadow-sm"><CreditCard size={12} className="text-white"/></div>
                  <span className="text-xs font-bold text-gray-800">Chuyển khoản Qua QR</span>
                </div>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${formData.paymentMethod === 'payos' ? 'border-4 border-nie8-primary bg-white' : 'border-gray-200'}`}></div>
              </div>
            </div>
          </section>


          {/* Order Note */}
          <section className="bg-white p-4 sm:p-6 sm:rounded-2xl shadow-sm border-b sm:border-none">
             <div className="flex items-center gap-2">
                <Info size={16} className="text-gray-400" />
                <input type="text" placeholder="Ghi chú đơn hàng..." className="w-full bg-transparent border-none py-1 text-xs sm:text-sm focus:ring-0 outline-none font-medium" value={formData.note} onChange={(e) => setFormData({...formData, note: e.target.value})} />
             </div>
          </section>
        </div>

        {/* RIGHT COLUMN: CART & SUMMARY */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Cart Items */}
          <section className="bg-white p-4 sm:p-8 sm:rounded-2xl shadow-sm border-b sm:border-none">
            <h2 className="text-sm sm:text-lg font-black text-gray-900 mb-4 sm:mb-6 flex justify-between items-center uppercase tracking-widest">
              <span>Sản phẩm ({items.length})</span>
            </h2>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 scrollbar-thin">
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-3 py-2 border-b border-gray-50 last:border-none">
                  <div className="w-16 h-20 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 border border-black/5 shadow-sm">
                    <img 
                      src={item.images?.[0] || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000'} 
                      alt={item.name} 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="flex-grow flex flex-col justify-between py-0.5 min-w-0">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="text-[13px] font-bold text-gray-900 truncate">{item.name}</h4>
                        <button onClick={() => onRemoveItem && onRemoveItem(item.id, item.size)} className="text-gray-300 hover:text-rose-500 transition-colors"><Trash2 size={14} /></button>
                      </div>
                      <p className="text-[10px] sm:text-xs text-gray-400 font-medium uppercase tracking-tighter mt-0.5">Size: <span className="text-nie8-primary font-black">{item.size}</span> | {item.category}</p>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                       <p className="text-[13px] font-black text-nie8-text">{formatVND(parseFloat(item.price.replace(/[^0-9]/g, '')))}</p>
                       <div className="flex items-center bg-nie8-bg/40 rounded-lg p-0.5">
                         <button onClick={() => onUpdateQuantity && onUpdateQuantity(item.id, item.size, -1)} className="w-6 h-6 flex items-center justify-center text-gray-600 active:scale-90" disabled={item.quantity <= 1}><Minus size={12} /></button>
                         <span className="min-w-[24px] text-center text-xs font-black">{item.quantity}</span>
                         <button onClick={() => onUpdateQuantity && onUpdateQuantity(item.id, item.size, 1)} className="w-6 h-6 flex items-center justify-center text-gray-600 active:scale-90"><Plus size={12} /></button>
                       </div>
                    </div>
                  </div>
                </div>
              ))}
              {items.length === 0 && <p className="text-center text-gray-400 text-[13px] py-10 italic">Giỏ hàng đang trống...</p>}
            </div>
          </section>

          {/* Promo Code */}
          <section className="bg-white p-4 sm:p-8 sm:rounded-2xl shadow-sm border-b sm:border-none">
             <div className="flex flex-col gap-3">
                <div 
                  onClick={() => setIsVoucherModalOpen(true)}
                  className="w-full flex justify-between items-center bg-nie8-bg/20 rounded-xl px-4 py-3 cursor-pointer group active:scale-[0.98] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Ticket size={18} className="text-nie8-primary" />
                    <span className="text-[13px] font-black text-gray-900 uppercase tracking-widest">Mã khuyến mãi</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {appliedCoupons.length > 0 ? (
                      <span className="text-[11px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100 uppercase tracking-tighter">Đã chọn {appliedCoupons.length} mã</span>
                    ) : (
                      <span className="text-[11px] font-bold text-gray-400">Chọn hoặc nhập mã</span>
                    )}
                    <ChevronRight size={14} className="text-gray-300" />
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Nhập mã khuyến mãi" 
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="flex-grow bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm focus:border-stone-900 focus:ring-0 uppercase placeholder-gray-400 transition-colors" 
                  />
                  <button 
                    onClick={() => handleApplyCoupon()}
                    disabled={isApplyingCoupon || !couponCode}
                    className="bg-black text-white px-6 py-3 rounded-lg font-bold text-sm hover:bg-gray-800 disabled:bg-gray-400 transition-colors flex items-center justify-center min-w-[100px]"
                  >
                    {isApplyingCoupon ? <Loader2 size={16} className="animate-spin" /> : 'Áp dụng'}
                  </button>
                </div>
                {couponError && <p className="text-red-500 text-xs font-medium flex items-center gap-1"><AlertCircle size={12}/> {couponError}</p>}
             </div>
          </section>

          {/* Summary */}
          <section className="bg-white p-4 sm:p-8 sm:rounded-2xl shadow-sm border-b sm:border-none">
             <h2 className="text-sm sm:text-lg font-black text-gray-900 mb-4 sm:mb-6 uppercase tracking-widest flex items-center gap-2">
                <Receipt size={16} className="text-nie8-primary" />
                Tổng quan
             </h2>
             <div className="space-y-3 sm:space-y-4">
               <div className="flex justify-between text-xs sm:text-sm text-gray-500">
                 <span className="font-bold">Tiền hàng ({items.length} món)</span>
                 <span className="font-black text-gray-900">{formatVND(total)}</span>
               </div>
               {discountAmount > 0 && (
                 <div className="flex justify-between text-xs sm:text-sm text-emerald-600">
                   <span className="font-bold">Giảm giá voucher</span>
                   <span className="font-black">- {formatVND(discountAmount)}</span>
                 </div>
               )}
               <div className="flex justify-between text-xs sm:text-sm text-gray-500">
                 <span className="font-bold">Phí vận chuyển</span>
                 <span className="font-black text-gray-900">+ {formatVND(shippingFee)}</span>
               </div>
               
               <div className="pt-4 mt-2 sm:pt-6 border-t border-gray-50">
                 <div className="flex justify-between items-baseline mb-1">
                   <span className="text-gray-900 text-sm sm:text-base font-black uppercase tracking-tight">Thanh toán</span>
                   <span className="text-xl sm:text-2xl font-black text-nie8-primary">{formatVND(finalTotal)}</span>
                 </div>
                 <p className="text-[10px] text-gray-400 italic text-right">Đã bao gồm VAT (nếu có)</p>
               </div>

               <button 
                  onClick={() => handleSubmit()}
                  disabled={isProcessing || items.length === 0}
                  className="hidden lg:flex w-full mt-6 bg-nie8-text text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-nie8-text/10 hover:shadow-2xl hover:translate-y-[-2px] transition-all items-center justify-center gap-3 active:scale-[0.98] disabled:bg-gray-400"
               >
                  {isProcessing ? <Loader2 size={24} className="animate-spin" /> : 'Hoàn tất đặt hàng'}
               </button>
                  <div className="flex flex-col items-center">
                    <span className="text-[8px] font-bold uppercase mb-1">Secure by</span>
                    <img src="https://pay.payos.vn/assets/img/logo-payos.svg" alt="PayOS" className="h-4" />
                  </div>
                  <div className="flex flex-col items-center border-l border-gray-200 pl-6">
                    <span className="text-[8px] font-bold uppercase mb-1">Verified by</span>
                    <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-4" />
                  </div>
                  <div className="flex flex-col items-center border-l border-gray-200 pl-6">
                    <span className="text-[8px] font-bold uppercase mb-1">Protected by</span>
                    <div className="flex items-center gap-1 font-bold text-[10px] text-gray-800">
                      <CheckCircle2 size={10} className="text-blue-500" /> SSL
                    </div>
                  </div>
               </div>
             </div>
          </section>
        </div>
      </div>

      {/* SHOPEE-STYLE STICKY BOTTOM BAR (Mobile Only) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-5 py-4 z-[100] flex items-center justify-between shadow-[0_-8px_30px_rgb(0,0,0,0.08)]">
        <div className="flex flex-col">
          <div className="flex items-center gap-1">
             <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Tổng cộng</span>
             {discountAmount > 0 && <span className="text-[8px] px-1 bg-emerald-500 text-white font-bold rounded-sm">-{formatVND(discountAmount)}</span>}
          </div>
          <span className="text-xl font-black text-nie8-primary">{formatVND(finalTotal)}</span>
        </div>
        <button 
          onClick={() => handleSubmit()}
          disabled={isProcessing || items.length === 0}
          className="bg-nie8-text text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] active:scale-95 transition-all disabled:bg-gray-300 shadow-xl shadow-nie8-text/10 flex items-center gap-2"
        >
          {isProcessing ? <Loader2 size={16} className="animate-spin" /> : 'Đặt hàng ngay'}
        </button>
      </div>

      {/* Add padding at the bottom for mobile to prevent content being hidden by sticky bar */}
      <div className="lg:hidden h-20" />

      {/* VOUCHER MODAL */}
      <AnimatePresence>
        {isVoucherModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsVoucherModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
                <h3 className="text-xl font-bold text-gray-900 tracking-tight">Chọn mã giảm giá</h3>
                <button onClick={() => setIsVoucherModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"><X size={20} /></button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4">
                {allCoupons.length === 0 ? (
                  <p className="text-center text-gray-400 py-10 italic">Hiện không có mã giảm giá khả dụng.</p>
                ) : (
                  allCoupons.map((coupon) => {
                    const isApplied = appliedCoupons.some(c => c.code === coupon.code);
                    const isMemberOnly = coupon.require_auth && !user;
                    const diffToMin = coupon.min_order_amount ? parseFloat(coupon.min_order_amount) - total : 0;
                    const isLockedByMin = diffToMin > 0;
                    const isExpired = coupon.expires_at && new Date(coupon.expires_at) < new Date();
                    
                    // Nếu mã đã hết hạn thì ẩn luôn khỏi danh sách cho sạch sẽ (theo ý bạn)
                    if (isExpired) return null;
                    
                    const isLocked = isMemberOnly || isLockedByMin;

                    return (
                      <div 
                        key={coupon.code} 
                        className={`relative group rounded-2xl border-2 transition-all p-5 flex gap-4 ${isApplied ? 'border-gray-900 bg-gray-50' : isLocked ? 'border-gray-100 opacity-60' : 'border-gray-100 hover:border-gray-300 cursor-pointer'}`}
                        onClick={() => !isLocked && handleApplyCoupon(coupon.code)}
                      >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${coupon.category === 'shipping' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                          <Ticket size={24} />
                        </div>
                        <div className="flex-grow">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold text-gray-900 uppercase tracking-wider">{coupon.code}</h4>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${coupon.category === 'shipping' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                              {coupon.category === 'shipping' ? 'Freeship' : 'Voucher Shop'}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-gray-800 mb-1">{coupon.name || 'Ưu đãi Đặc biệt'}</p>
                          <p className="text-xs text-gray-500 leading-relaxed">{coupon.description || `Giảm ngay cho đơn hàng từ ${formatVND(coupon.min_order_amount || 0)}`}</p>
                          
                          {isMemberOnly ? (
                            <div className="mt-3 flex items-center gap-1.5 text-rose-500 font-bold text-[10px] uppercase tracking-wider bg-rose-50/50 w-fit px-2 py-1 rounded">
                              <Info size={12} /> Chỉ dành cho thành viên - Đăng nhập ngay
                            </div>
                          ) : isLockedByMin ? (
                            <div className="mt-3 flex items-center gap-1.5 text-orange-500 font-bold text-[10px] uppercase tracking-wider bg-orange-50/50 w-fit px-2 py-1 rounded">
                              <Sparkles size={12} /> Mua thêm {formatVND(diffToMin)} để nhận mã này
                            </div>
                          ) : isExpired ? (
                            <div className="mt-3 flex items-center gap-1.5 text-gray-400 font-bold text-[10px] uppercase tracking-wider bg-gray-100 w-fit px-2 py-1 rounded">
                              <AlertCircle size={12} /> Mã đã hết hạn sử dụng
                            </div>
                          ) : null}
                        </div>
                        <div className="flex flex-col justify-center">
                           <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isApplied ? 'bg-gray-900 border-gray-900' : 'border-gray-300'}`}>
                             {isApplied && <CheckCircle2 size={12} className="text-white" />}
                           </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
