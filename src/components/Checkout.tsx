import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Package, Truck, CreditCard, ChevronRight, MapPin, Phone, User, ShoppingBag, CheckCircle2, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CheckoutProps {
  items: any[];
  total: number;
  onBack: () => void;
  onComplete: (orderId: string, phone: string) => void;
  user?: any;
}

export default function Checkout({ items, total, onBack, onComplete, user }: CheckoutProps) {
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    city: 'Hồ Chí Minh',
    paymentMethod: 'cod' as 'cod' | 'payos'
  });

  const shippingFee = total >= 2000000 ? 0 : 30000;
  const finalTotal = total + shippingFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;
    setIsProcessing(true);
    
    try {
      console.log('NIEE8 Checkout 2026 - Standard Processing...');
      
      const response = await fetch('/api/checkout-v3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: formData.name,
          customerPhone: formData.phone,
          customerAddress: formData.address,
          customerCity: formData.city,
          items: items.map(i => ({ id: i.id, size: i.size, quantity: i.quantity })),
          paymentMethod: formData.paymentMethod,
          userId: user?.id
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Lỗi xử lý đơn hàng từ hệ thống');
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        setIsProcessing(false);
        setCurrentOrderId(data.orderId);
        setStep(3);
        if (onComplete) onComplete(data.orderId, formData.phone);
      }

    } catch (error: any) {
      console.error('Checkout V3 Error:', error);
      alert(`Lỗi đặt hàng: ${error.message}`);
      setIsProcessing(false);
    }
  };

  if (step === 3) {
    return (
      <div className="min-h-screen bg-nie8-bg pt-32 pb-20 px-4">
        <div className="max-w-md mx-auto bg-white p-10 rounded-3xl shadow-xl shadow-nie8-primary/5 text-center">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-8">
            <CheckCircle2 size={40} className="text-green-500" />
          </div>
          <h2 className="text-3xl font-serif italic mb-4">Cảm ơn bạn!</h2>
          <p className="text-nie8-text/60 mb-8 leading-relaxed"> Đơn hàng <span className="font-bold text-nie8-text">#{currentOrderId}</span> của bạn đã được tiếp nhận và đang được xử lý.</p>
          <button
            onClick={onBack}
            className="w-full bg-nie8-text text-white py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-nie8-primary transition-all shadow-lg active:scale-95"
          >
            Quay lại cửa hàng
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-nie8-bg pt-24 pb-20 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        {/* Progress steps */}
        <div className="flex items-center justify-center mb-12">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'text-nie8-text' : 'text-nie8-text/20'}`}>
            <span className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-xs ${step >= 1 ? 'border-nie8-text' : 'border-nie8-text/20'}`}>1</span>
            <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:block">Vận chuyển</span>
          </div>
          <div className="w-12 h-[2px] mx-4 bg-nie8-text/10" />
          <div className={`flex items-center gap-2 ${step >= 2 ? 'text-nie8-text' : 'text-nie8-text/20'}`}>
            <span className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-xs ${step >= 2 ? 'border-nie8-text' : 'border-nie8-text/20'}`}>2</span>
            <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:block">Thanh toán</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-7">
            <form id="checkout-form" onSubmit={handleSubmit} className="space-y-8">
              {step === 1 ? (
                <section className="bg-white p-8 rounded-3xl shadow-sm border border-nie8-primary/5">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-nie8-bg rounded-xl flex items-center justify-center text-nie8-primary">
                      <Truck size={20} />
                    </div>
                    <h2 className="text-xl font-serif italic">Thông tin giao hàng</h2>
                  </div>
                  
                  <div className="space-y-5">
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-nie8-text/20" size={18} />
                      <input
                        type="text"
                        placeholder="Họ và tên"
                        required
                        className="w-full bg-nie8-bg/50 border-none rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-nie8-primary/20 transition-all font-medium"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                      />
                    </div>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-nie8-text/20" size={18} />
                      <input
                        type="tel"
                        placeholder="Số điện thoại"
                        required
                        className="w-full bg-nie8-bg/50 border-none rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-nie8-primary/20 transition-all font-medium"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      />
                    </div>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-4 text-nie8-text/20" size={18} />
                      <textarea
                        placeholder="Địa chỉ chi tiết (Số nhà, tên đường...)"
                        required
                        rows={3}
                        className="w-full bg-nie8-bg/50 border-none rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-nie8-primary/20 transition-all font-medium"
                        value={formData.address}
                        onChange={(e) => setFormData({...formData, address: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    disabled={!formData.name || !formData.phone || !formData.address}
                    className="w-full mt-8 bg-nie8-text text-white py-4 rounded-2xl font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-nie8-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Tiếp theo <ChevronRight size={18} />
                  </button>
                </section>
              ) : (
                <section className="bg-white p-8 rounded-3xl shadow-sm border border-nie8-primary/5">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-nie8-bg rounded-xl flex items-center justify-center text-nie8-primary">
                        <CreditCard size={20} />
                      </div>
                      <h2 className="text-xl font-serif italic">Phương thức thanh toán</h2>
                    </div>
                    <button type="button" onClick={() => setStep(1)} className="text-xs font-bold text-nie8-primary uppercase tracking-widest hover:underline">Thay đổi thông tin</button>
                  </div>

                  <div className="space-y-4">
                    <label className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all cursor-pointer ${formData.paymentMethod === 'cod' ? 'border-nie8-primary bg-nie8-primary/5 shadow-md shadow-nie8-primary/10' : 'border-nie8-bg'}`}>
                      <div className="flex items-center gap-4">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${formData.paymentMethod === 'cod' ? 'border-nie8-primary' : 'border-nie8-text/20'}`}>
                          {formData.paymentMethod === 'cod' && <div className="w-2.5 h-2.5 bg-nie8-primary rounded-full" />}
                        </div>
                        <div>
                          <p className="font-bold text-sm">Thanh toán khi nhận hàng (COD)</p>
                          <p className="text-[10px] text-nie8-text/40 font-medium">Thanh toán bằng tiền mặt khi giao hàng</p>
                        </div>
                      </div>
                      <Truck size={20} className={formData.paymentMethod === 'cod' ? 'text-nie8-primary' : 'text-nie8-text/10'} />
                      <input type="radio" className="hidden" name="payment" value="cod" checked={formData.paymentMethod === 'cod'} onChange={() => setFormData({...formData, paymentMethod: 'cod'})} />
                    </label>

                    <label className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all cursor-pointer ${formData.paymentMethod === 'payos' ? 'border-nie8-primary bg-nie8-primary/5 shadow-md shadow-nie8-primary/10' : 'border-nie8-bg'}`}>
                      <div className="flex items-center gap-4">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${formData.paymentMethod === 'payos' ? 'border-nie8-primary' : 'border-nie8-text/20'}`}>
                          {formData.paymentMethod === 'payos' && <div className="w-2.5 h-2.5 bg-nie8-primary rounded-full" />}
                        </div>
                        <div>
                          <p className="font-bold text-sm">Chuyển khoản / ATM / QR Code (PayOS)</p>
                          <p className="text-[10px] text-nie8-text/40 font-medium">Nhanh chóng, an toàn qua cổng PayOS</p>
                        </div>
                      </div>
                      <CreditCard size={20} className={formData.paymentMethod === 'payos' ? 'text-nie8-primary' : 'text-nie8-text/10'} />
                      <input type="radio" className="hidden" name="payment" value="payos" checked={formData.paymentMethod === 'payos'} onChange={() => setFormData({...formData, paymentMethod: 'payos'})} />
                    </label>
                  </div>

                  <div className="mt-10 p-5 bg-blue-50/50 rounded-2xl flex gap-4 border border-blue-100/50">
                    <AlertCircle className="text-blue-500 shrink-0" size={18} />
                    <p className="text-[11px] text-blue-700/80 leading-relaxed font-medium">Bằng cách nhấn nút đặt hàng, bạn đồng ý với các quy định về chính sách đổi trả và bảo mật thông tin của NIEE8.</p>
                  </div>

                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full mt-8 bg-nie8-text text-white py-5 rounded-2xl font-bold uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-nie8-primary transition-all shadow-xl shadow-nie8-text/10 active:scale-95"
                  >
                    {isProcessing ? (
                      <><Loader2 className="animate-spin" size={20} /> Đang xử lý...</>
                    ) : (
                      <>Xác nhận đặt hàng <ChevronRight size={18} /></>
                    )}
                  </button>
                </section>
              )}
            </form>
          </div>

          <aside className="lg:col-span-5 space-y-6">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-nie8-primary/5 sticky top-28">
              <h3 className="text-lg font-serif italic mb-6">Tóm tắt đơn hàng</h3>
              
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar mb-6">
                {items.map((item, idx) => (
                  <div key={`${item.id}-${item.size}-${idx}`} className="flex gap-4 group">
                    <div className="w-16 h-20 bg-nie8-bg rounded-xl overflow-hidden shrink-0">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div className="flex-grow">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider mb-1 line-clamp-1">{item.name}</h4>
                      <p className="text-[10px] text-nie8-text/40 font-bold mb-1">Size: {item.size} • sl: {item.quantity}</p>
                      <p className="text-xs font-serif italic">{item.price}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3 pt-6 border-t border-nie8-primary/10">
                <div className="flex justify-between text-xs font-medium text-nie8-text/60">
                  <span>Tạm tính</span>
                  <span>{total.toLocaleString()}đ</span>
                </div>
                <div className="flex justify-between text-xs font-medium text-nie8-text/60">
                  <span>Phí vận chuyển</span>
                  <span>{shippingFee === 0 ? 'Miễn phí' : `${shippingFee.toLocaleString()}đ`}</span>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-nie8-primary/10">
                  <span className="text-sm font-bold uppercase tracking-widest">Tổng thanh toán</span>
                  <span className="text-2xl font-serif italic text-nie8-primary">{finalTotal.toLocaleString()}đ</span>
                </div>
              </div>
            </div>
            
            <button
              onClick={onBack}
              className="w-full flex items-center justify-center gap-2 text-xs font-bold text-nie8-text/40 uppercase tracking-widest hover:text-nie8-primary transition-colors group"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Quay lại giỏ hàng
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
}
