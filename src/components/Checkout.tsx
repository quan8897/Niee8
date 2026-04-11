import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Truck, CreditCard, ChevronRight, MapPin, Phone, User, CheckCircle2, AlertCircle, ArrowLeft, Loader2, Mail, Info, Trash2, Plus, Minus, Receipt, Ticket, X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';

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
  const calculateTotalDiscount = () => {
    let totalDiscount = 0;
    appliedCoupons.forEach(coupon => {
      let currentDiscount = 0;
      const basis = coupon.category === 'shipping' ? shippingFee : 
                   coupon.category === 'total' ? (total + shippingFee) : total;

      if (coupon.discount_amount) {
        currentDiscount = parseFloat(coupon.discount_amount);
      } else if (coupon.discount_percent) {
        currentDiscount = (basis * coupon.discount_percent) / 100;
        if (coupon.max_discount_amount) {
          currentDiscount = Math.min(currentDiscount, parseFloat(coupon.max_discount_amount));
        }
      }
      
      // Cap at the basis (cannot discount more than the sub-total it applies to)
      totalDiscount += Math.min(currentDiscount, basis);
    });
    return totalDiscount;
  };

  const discountAmount = calculateTotalDiscount();

  const finalTotal = total + shippingFee - discountAmount;

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

      if (error || !data) throw new Error('Mã không hợp lệ hoặc đã hết hạn.');
      if (!data.is_active) throw new Error('Mã này đã bị vô hiệu hóa.');
      if (data.usage_limit && data.usage_count >= data.usage_limit) throw new Error('Mã này đã hết lượt sử dụng.');
      if (data.require_auth && !user) throw new Error('Mã này chỉ dành cho thành viên đã đăng nhập.');
      if (data.min_order_amount && total < parseFloat(data.min_order_amount)) {
        throw new Error(`Đơn hàng tối thiểu ${new Intl.NumberFormat('vi-VN').format(data.min_order_amount)}đ để áp dụng mã này.`);
      }

      // Stacking logic: 1 per category
      setAppliedCoupons(prev => {
        const filtered = prev.filter(c => c.category !== data.category);
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

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isProcessing) return;
    if (!formData.name || !formData.phone || !formData.address || !formData.city) {
      alert("Vui lòng điền đầy đủ thông tin giao hàng gồm: Họ tên, SDT, Quốc gia, Phường Xã");
      return;
    }
    if (items.length === 0) {
      alert("Giỏ hàng của bạn đang trống!");
      return;
    }
    
    setIsProcessing(true);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: formData.name,
          customerPhone: formData.phone,
          customerAddress: formData.address,
          customerCity: formData.city,
          totalAmount: finalTotal, // Final total after discount and shipping fee
          items: items.map(i => ({ id: i.id, size: i.size, quantity: i.quantity, name: i.name, images: i.images, price: i.price })),
          paymentMethod: formData.paymentMethod,
          userId: user?.id,
          note: formData.note,
          discountAmount: discountAmount,
          shippingFee: shippingFee,
          couponCodes: appliedCoupons.map(c => c.code)
        })
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textError = await response.text();
        throw new Error('Server returned HTML 500 page');
      }

      const data = await response.json();
      
      if (!response.ok) {
        // Ánh xạ mã lỗi từ Server sang thông báo tiếng Việt
        const errorMessages: Record<string, string> = {
          'OUT_OF_STOCK': 'Rất tiếc, một sản phẩm trong giỏ hàng vừa hết hàng. Vui lòng kiểm tra lại.',
          'PRODUCT_NOT_FOUND': 'Sản phẩm không còn tồn tại trong hệ thống.',
          'COUPON_INVALID': 'Mã giảm giá không hợp lệ hoặc đã hết lượt sử dụng.',
          'SYSTEM_ERROR': 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.'
        };
        
        const message = (data.error_code && data.error_code !== 'SYSTEM_ERROR') 
          ? errorMessages[data.error_code] 
          : (data.error || 'Yêu cầu bị từ chối');
        throw new Error(message);
      }

      // UPDATE: Không cần insert activity_logs và increment_coupon_usage ở đây 
      // vì RPC secure_checkout trên Server đã thực hiện tự động và an toàn hơn.

      if (data.checkoutUrl) {
        localStorage.setItem('nie8_temp_phone', formData.phone);
        window.location.href = data.checkoutUrl;
      } else {
        setCurrentOrderId(data.orderId);
      }
    } catch (error: any) {
      console.error('Checkout Error:', error);
      alert(error.message);
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

  const formatVND = (val: number) => new Intl.NumberFormat('vi-VN').format(val) + 'đ';

  return (
    <div className="min-h-screen bg-[#F8F9FA] pt-24 pb-20 px-4 sm:px-8 font-sans">
      <div className="max-w-6xl mx-auto flex items-center justify-between mb-8 cursor-pointer" onClick={onBack}>
         <div className="text-xl font-serif italic text-nie8-text hover:text-nie8-primary transition-colors flex items-center gap-2"><ArrowLeft size={20} /> nie8.</div>
      </div>
      
      <div className="max-w-6xl mx-auto grid lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: FORMS */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Default Login prompt if not signed in */}
          {!user && (
            <div className="bg-white p-6 rounded-2xl shadow-sm flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Đăng nhập để mua hàng tiện lợi và nhận nhiều ưu đãi hơn nữa</span>
              <button className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-6 py-2 rounded-lg font-medium text-sm transition-colors">Đăng nhập</button>
            </div>
          )}

          {/* Shipping Form */}
          <section className="bg-white p-8 rounded-2xl shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Thông tin giao hàng</h2>
            <div className="space-y-4">
              <input type="text" placeholder="Nhập họ và tên" required className="w-full bg-white border border-gray-200 rounded-lg py-3 px-4 text-sm focus:border-stone-400 focus:ring-0 outline-none transition-colors" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
              <div className="relative">
                <input type="tel" placeholder="Nhập số điện thoại" required className="w-full bg-white border border-gray-200 rounded-lg py-3 px-4 pr-12 text-sm focus:border-stone-400 focus:ring-0 outline-none transition-colors" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1">
                   {/* Fake VN flag */}
                   <div className="w-6 h-4 bg-red-600 flex items-center justify-center rounded-[2px] overflow-hidden"><div className="text-yellow-400 text-[10px] leading-none">★</div></div>
                </div>
              </div>
              <input type="email" placeholder="Nhập email (không bắt buộc)" className="w-full bg-white border border-gray-200 rounded-lg py-3 px-4 text-sm focus:border-stone-400 focus:ring-0 outline-none transition-colors" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
              
              <select className="w-full bg-white border border-gray-200 rounded-lg py-3 px-4 text-sm focus:border-stone-400 focus:ring-0 outline-none appearance-none text-gray-700 disabled:bg-gray-50" disabled>
                <option value="VN">Quốc gia: Vietnam</option>
              </select>

              <input type="text" placeholder="Tỉnh/TP, Quận/Huyện, Phường/Xã" required className="w-full bg-white border border-gray-200 rounded-lg py-3 px-4 text-sm focus:border-stone-400 focus:ring-0 outline-none transition-colors" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} />
              <textarea placeholder="Địa chỉ, tên đường" required rows={2} className="w-full bg-white border border-gray-200 rounded-lg py-3 px-4 text-sm focus:border-stone-400 focus:ring-0 outline-none transition-colors resize-none" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
            </div>
          </section>

          {/* Delivery Method */}
          <section className="bg-white p-8 rounded-2xl shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Phương thức giao hàng</h2>
            <div className="w-full bg-gray-50 border border-gray-200 rounded-lg py-4 px-4 text-sm text-gray-500 flex justify-between">
              <span>Phí vận chuyển siêu tốc (Test)</span>
              <span className="font-medium text-gray-900">{formatVND(shippingFee)}</span>
            </div>
          </section>

          {/* Payment Method */}
          <section className="bg-white p-8 rounded-2xl shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Phương thức thanh toán</h2>
            <div className="space-y-3">
              <label className={`w-full flex items-center p-4 rounded-xl border-2 transition-all cursor-pointer ${formData.paymentMethod === 'cod' ? 'border-gray-900 bg-gray-50' : 'border-gray-100 hover:border-gray-200'}`}>
                <input type="radio" name="payment" className="hidden" checked={formData.paymentMethod === 'cod'} onChange={() => setFormData({...formData, paymentMethod: 'cod'})} />
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center mr-3 ${formData.paymentMethod === 'cod' ? 'border-4 border-gray-900 bg-white' : 'border-gray-300'}`}></div>
                <div className="flex-grow flex items-center gap-3">
                  <div className="w-8 h-6 bg-zinc-200 rounded flex items-center justify-center shadow-sm"><span className="text-[8px] font-bold">COD</span></div>
                  <span className="text-sm font-medium text-gray-800">Thanh toán khi giao hàng (COD)</span>
                </div>
              </label>

              <label className={`w-full flex items-center p-4 rounded-xl border-2 transition-all cursor-pointer ${formData.paymentMethod === 'payos' ? 'border-gray-900 bg-gray-50' : 'border-gray-100 hover:border-gray-200'}`}>
                <input type="radio" name="payment" className="hidden" checked={formData.paymentMethod === 'payos'} onChange={() => setFormData({...formData, paymentMethod: 'payos'})} />
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center mr-3 ${formData.paymentMethod === 'payos' ? 'border-4 border-gray-900 bg-white' : 'border-gray-300'}`}></div>
                <div className="flex-grow flex items-center gap-3">
                  <div className="w-8 h-6 bg-emerald-500 rounded flex items-center justify-center shadow-sm"><CreditCard size={12} className="text-white"/></div>
                  <span className="text-sm font-medium text-gray-800">Chuyển khoản qua QR - PayOS</span>
                </div>
              </label>
            </div>
          </section>


          {/* Order Note */}
          <section className="bg-white p-6 rounded-2xl shadow-sm">
             <input type="text" placeholder="Ghi chú đơn hàng" className="w-full bg-transparent border-none py-2 text-sm focus:ring-0 outline-none" value={formData.note} onChange={(e) => setFormData({...formData, note: e.target.value})} />
          </section>
        </div>

        {/* RIGHT COLUMN: CART & SUMMARY */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Cart Items */}
          <section className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-6 flex justify-between">Giỏ hàng <span className="bg-nie8-bg text-nie8-text text-sm w-6 h-6 flex items-center justify-center rounded-full">{items.length}</span></h2>
            <div className="space-y-6 max-h-[40vh] overflow-y-auto pr-2 scroll-hide">
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-4">
                  <div className="w-16 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border">
                    <img 
                      src={item.images?.[0] || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000'} 
                      alt={item.name} 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="flex-grow flex flex-col justify-between py-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 line-clamp-1 pr-2">{item.name}</h4>
                        <p className="text-xs text-gray-500 mt-1">{item.category} / <span className="font-bold text-gray-800">{item.size}</span></p>
                      </div>
                      <button onClick={() => onRemoveItem && onRemoveItem(item.id, item.size)} className="text-gray-400 hover:text-red-500 transition-colors p-1"><Trash2 size={16} /></button>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                       <p className="text-sm font-bold text-gray-900">{formatVND(parseFloat(item.price.replace(/[^0-9]/g, '')))}</p>
                       <div className="flex items-center border border-gray-200 rounded-md">
                         <button onClick={() => onUpdateQuantity && onUpdateQuantity(item.id, item.size, -1)} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-30" disabled={item.quantity <= 1}><Minus size={14} /></button>
                         <span className="w-8 text-center text-sm font-medium leading-8">{item.quantity}</span>
                         <button onClick={() => onUpdateQuantity && onUpdateQuantity(item.id, item.size, 1)} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-50"><Plus size={14} /></button>
                       </div>
                    </div>
                  </div>
                </div>
              ))}
              {items.length === 0 && <p className="text-center text-gray-400 text-sm py-4">Giỏ hàng trống.</p>}
            </div>
          </section>

          {/* Promo Code */}
          <section className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm">
             <h2 className="text-lg font-bold text-gray-900 mb-4">Mã khuyến mãi</h2>
             
             {appliedCoupons.length > 0 && (
                <div className="space-y-2 mb-4">
                  {appliedCoupons.map(coupon => (
                    <div key={coupon.code} className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl p-4">
                      <div className="flex items-center gap-3 text-green-700">
                        <Ticket size={20} />
                        <div>
                          <p className="font-bold text-sm uppercase">{coupon.code}</p>
                          <p className="text-xs opacity-80">
                            {coupon.category === 'shipping' ? 'Miễn phí vận chuyển' : 
                             `Đã giảm ${coupon.discount_amount ? formatVND(parseFloat(coupon.discount_amount)) : `${coupon.discount_percent}%`}`}
                          </p>
                        </div>
                      </div>
                      <button onClick={() => removeCoupon(coupon.code)} className="text-gray-400 hover:text-red-500 transition-colors"><X size={18} /></button>
                    </div>
                  ))}
                </div>
             )}

             <div className="flex flex-col gap-3">
                <button 
                  onClick={() => setIsVoucherModalOpen(true)}
                  className="w-full flex justify-between items-center bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  <span className="flex items-center gap-2"><Ticket size={16} /> Chọn mã</span>
                  <ChevronRight size={16} />
                </button>
                
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
          <section className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm">
             <h2 className="text-lg font-bold text-gray-900 mb-6">Tóm tắt đơn hàng</h2>
             <div className="space-y-4">
               <div className="flex justify-between text-sm text-gray-600">
                 <span>Tổng tiền hàng</span>
                 <span className="font-medium text-gray-900">{formatVND(total)}</span>
               </div>
               {discountAmount > 0 && (
                 <div className="flex justify-between text-sm text-green-600">
                   <span>Giảm giá</span>
                   <span className="font-medium">- {formatVND(discountAmount)}</span>
                 </div>
               )}
               <div className="flex justify-between text-sm text-gray-600">
                 <span>Phí vận chuyển</span>
                 <span className="font-medium text-gray-900">+ {formatVND(shippingFee)}</span>
               </div>
               
               <div className="pt-6 mt-2 border-t border-gray-100">
                 <div className="flex justify-between items-end mb-1">
                   <span className="text-gray-900 font-bold">Tổng thanh toán</span>
                   <span className="text-2xl font-bold text-gray-900">{formatVND(finalTotal)}</span>
                 </div>
               </div>

               <button 
                  onClick={() => handleSubmit()}
                  disabled={isProcessing || items.length === 0}
                  className="w-full mt-6 bg-black text-white py-5 rounded-2xl font-bold uppercase tracking-[0.2em] shadow-xl shadow-gray-200 hover:shadow-2xl hover:translate-y-[-2px] transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:bg-gray-400"
               >
                  {isProcessing ? <Loader2 size={24} className="animate-spin" /> : 'Hoàn tất đặt hàng'}
               </button>

               <div className="mt-6 flex items-center justify-center gap-6 opacity-40 grayscale hover:opacity-100 hover:grayscale-0 transition-all cursor-default">
                  {/* Security/Trust Badges */}
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
