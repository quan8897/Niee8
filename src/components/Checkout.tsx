import { useState, useCallback, useEffect } from 'react';
import { Truck, CreditCard, ChevronRight, MapPin, Phone, User, CheckCircle2, AlertCircle, ArrowLeft, Loader2, Mail, Info, Trash2, Plus, Minus, Receipt, Ticket } from 'lucide-react';
import { getSupabaseClient } from '../lib/supabase/client';

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

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  const shippingFee = 2000; // Fixed 2000 VND for test
  
  // Calculate discount
  let discountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discount_amount) {
      discountAmount = parseFloat(appliedCoupon.discount_amount);
    } else if (appliedCoupon.discount_percent) {
      discountAmount = (total * appliedCoupon.discount_percent) / 100;
    }
    // Cannot discount more than the cart total
    if (discountAmount > total) discountAmount = total;
  }

  const finalTotal = total + shippingFee - discountAmount;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setIsApplyingCoupon(true);
    setCouponError(null);
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode.toUpperCase())
        .single();

      if (error || !data) {
        throw new Error('Mã không hợp lệ hoặc đã hết hạn.');
      }

      if (!data.is_active) throw new Error('Mã này đã bị vô hiệu hóa.');
      if (data.usage_limit && data.usage_count >= data.usage_limit) throw new Error('Mã này đã hết lượt sử dụng.');
      if (data.min_order_amount && total < parseFloat(data.min_order_amount)) {
        throw new Error(`Đơn hàng tối thiểu ${new Intl.NumberFormat('vi-VN').format(data.min_order_amount)}đ để áp dụng mã này.`);
      }

      setAppliedCoupon(data);
      setCouponError(null);
    } catch (err: any) {
      setCouponError(err.message);
      setAppliedCoupon(null);
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError(null);
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
          discountAmount: discountAmount,
          couponCode: appliedCoupon?.code || null
        })
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textError = await response.text();
        throw new Error('Server returned HTML 500 page');
      }

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Yêu cầu thanh toán bị từ chối');

      // Update coupon usage count if applied 
      if (appliedCoupon) {
        const supabase = getSupabaseClient();
        await supabase.rpc('increment_coupon_usage', { p_code: appliedCoupon.code });
      }

      if (data.checkoutUrl) {
        localStorage.setItem('niee8_temp_phone', formData.phone);
        window.location.href = data.checkoutUrl;
      } else {
        setCurrentOrderId(data.orderId);
      }
    } catch (error: any) {
      console.error('Checkout Error:', error);
      alert(`Lỗi đặt hàng: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  }, [formData, items, user, finalTotal, isProcessing, appliedCoupon, discountAmount]);

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
         <div className="text-xl font-serif italic text-nie8-text hover:text-nie8-primary transition-colors flex items-center gap-2"><ArrowLeft size={20} /> niee8.</div>
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

          {/* eInvoice */}
          <section className="bg-white p-6 rounded-2xl shadow-sm flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors">
            <h2 className="text-sm font-bold text-gray-900">Hoá đơn điện tử</h2>
            <span className="text-sm text-gray-500 flex items-center gap-2">Yêu cầu xuất <ChevronRight size={16} /></span>
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
             
             {appliedCoupon ? (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center gap-3 text-green-700">
                    <Ticket size={20} />
                    <div>
                      <p className="font-bold text-sm uppercase">{appliedCoupon.code}</p>
                      <p className="text-xs opacity-80">Đã áp dụng giảm {appliedCoupon.discount_amount ? formatVND(appliedCoupon.discount_amount) : `${appliedCoupon.discount_percent}%`}</p>
                    </div>
                  </div>
                  <button onClick={removeCoupon} className="text-xs text-red-500 hover:underline font-bold uppercase">Xóa mã</button>
                </div>
             ) : (
                <div className="flex flex-col gap-3">
                  <button className="w-full flex justify-between items-center bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-500 hover:bg-gray-100 transition-colors">
                    <span className="flex items-center gap-2"><Ticket size={16} /> Chọn mã</span>
                    <ChevronRight size={16} />
                  </button>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Nhập mã khuyến mãi" 
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      className="flex-grow bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm focus:border-gray-900 focus:ring-0 uppercase placeholder-gray-400 transition-colors" 
                    />
                    <button 
                      onClick={handleApplyCoupon}
                      disabled={isApplyingCoupon || !couponCode}
                      className="bg-black text-white px-6 py-3 rounded-lg font-bold text-sm hover:bg-gray-800 disabled:bg-gray-400 transition-colors flex items-center justify-center min-w-[100px]"
                    >
                      {isApplyingCoupon ? <Loader2 size={16} className="animate-spin" /> : 'Áp dụng'}
                    </button>
                  </div>
                  {couponError && <p className="text-red-500 text-xs font-medium flex items-center gap-1"><AlertCircle size={12}/> {couponError}</p>}
                </div>
             )}
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
                 <p className="text-right text-[10px] text-gray-400">Giá trên đã bao gồm VAT {formatVND(finalTotal * 0.08)}</p>
               </div>

               <button 
                  onClick={handleSubmit}
                  disabled={isProcessing || items.length === 0}
                  className="w-full mt-6 bg-black text-white py-4 rounded-xl font-bold text-sm hover:bg-gray-800 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                >
                  {isProcessing ? <Loader2 size={18} className="animate-spin" /> : 'Đặt hàng'}
                </button>
             </div>
          </section>

        </div>
      </div>
    </div>
  );
}
