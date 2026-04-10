import { useState } from 'react';
import { Truck, CreditCard, ChevronRight, MapPin, Phone, User, CheckCircle2, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';

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
      console.log('NIEE8 Checkout 2026 - Processing Standard Execution...');
      
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

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Máy chủ phản hồi sai định dạng (Vui lòng kiểm tra lại build Vercel)');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Yêu cầu thanh toán bị từ chối');
      }

      if (data.checkoutUrl) {
        localStorage.setItem('niee8_temp_phone', formData.phone);
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
        <div className="max-w-md mx-auto bg-white p-10 rounded-3xl shadow-xl text-center">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-8">
            <CheckCircle2 size={40} className="text-green-500" />
          </div>
          <h2 className="text-3xl font-serif italic mb-4">Cảm ơn bạn!</h2>
          <p className="text-nie8-text/60 mb-8 leading-relaxed">Đơn hàng <span className="font-bold text-nie8-text">#{currentOrderId}</span> đã được tiếp nhận.</p>
          <button onClick={onBack} className="w-full bg-nie8-text text-white py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-nie8-primary transition-all shadow-lg active:scale-95">Quay lại cửa hàng</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-nie8-bg pt-24 pb-20 px-4 sm:px-6 uppercase tracking-wider">
      <div className="max-w-5xl mx-auto">
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
                    <div className="w-10 h-10 bg-nie8-bg rounded-xl flex items-center justify-center text-nie8-primary"><Truck size={20} /></div>
                    <h2 className="text-xl font-serif italic">Thông tin giao hàng</h2>
                  </div>
                  
                  <div className="space-y-5">
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-nie8-text/20" size={18} />
                      <input type="text" placeholder="Họ và tên" required className="w-full bg-nie8-bg/50 border-none rounded-2xl py-4 pl-12 pr-4 font-medium" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                    </div>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-nie8-text/20" size={18} />
                      <input type="tel" placeholder="Số điện thoại" required className="w-full bg-nie8-bg/50 border-none rounded-2xl py-4 pl-12 pr-4 font-medium" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                    </div>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-4 text-nie8-text/20" size={18} />
                      <textarea placeholder="Địa chỉ chi tiết" required rows={3} className="w-full bg-nie8-bg/50 border-none rounded-2xl py-4 pl-12 pr-4 font-medium" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
                    </div>
                  </div>
                  
                  <button type="button" onClick={() => setStep(2)} disabled={!formData.name || !formData.phone || !formData.address} className="w-full mt-8 bg-nie8-text text-white py-4 rounded-2xl font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-nie8-primary disabled:opacity-50 transition-all"> Tiếp theo <ChevronRight size={18} /> </button>
                </section>
              ) : (
                <section className="bg-white p-8 rounded-3xl shadow-sm border border-nie8-primary/5">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-nie8-bg rounded-xl flex items-center justify-center text-nie8-primary"><CreditCard size={20} /></div>
                      <h2 className="text-xl font-serif italic">Phương thức thanh toán</h2>
                    </div>
                    <button type="button" onClick={() => setStep(1)} className="text-xs font-bold text-nie8-primary uppercase tracking-widest hover:underline">Sửa thông tin</button>
                  </div>

                  <div className="space-y-4">
                    <label className={`flex items-center justify-between p-5 rounded-2xl border-2 cursor-pointer ${formData.paymentMethod === 'cod' ? 'border-nie8-primary bg-nie8-primary/5' : 'border-nie8-bg'}`}>
                      <div className="flex items-center gap-4">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${formData.paymentMethod === 'cod' ? 'border-nie8-primary' : 'border-nie8-text/20'}`}>
                          {formData.paymentMethod === 'cod' && <div className="w-2.5 h-2.5 bg-nie8-primary rounded-full" />}
                        </div>
                        <p className="font-bold text-sm">Thanh toán khi nhận hàng (COD)</p>
                      </div>
                      <input type="radio" className="hidden" name="payment" value="cod" checked={formData.paymentMethod === 'cod'} onChange={() => setFormData({...formData, paymentMethod: 'cod'})} />
                    </label>

                    <label className={`flex items-center justify-between p-5 rounded-2xl border-2 cursor-pointer ${formData.paymentMethod === 'payos' ? 'border-nie8-primary bg-nie8-primary/5' : 'border-nie8-bg'}`}>
                      <div className="flex items-center gap-4">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${formData.paymentMethod === 'payos' ? 'border-nie8-primary' : 'border-nie8-text/20'}`}>
                          {formData.paymentMethod === 'payos' && <div className="w-2.5 h-2.5 bg-nie8-primary rounded-full" />}
                        </div>
                        <p className="font-bold text-sm">ATM / QR Code (PayOS)</p>
                      </div>
                      <input type="radio" className="hidden" name="payment" value="payos" checked={formData.paymentMethod === 'payos'} onChange={() => setFormData({...formData, paymentMethod: 'payos'})} />
                    </label>
                  </div>

                  <button type="submit" disabled={isProcessing} className="w-full mt-8 bg-nie8-text text-white py-5 rounded-2xl font-bold uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-nie8-primary transition-all active:scale-95 shadow-xl">
                    {isProcessing ? <Loader2 className="animate-spin" /> : 'Xác nhận đặt hàng'}
                  </button>
                </section>
              )}
            </form>
          </div>

          <aside className="lg:col-span-5">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-nie8-primary/5 sticky top-28">
              <h3 className="text-lg font-serif italic mb-6">Tóm tắt đơn hàng</h3>
              <div className="space-y-4 mb-6">
                {items.map((item, idx) => (
                  <div key={idx} className="flex gap-4">
                    <img src={item.image} alt={item.name} className="w-16 h-20 object-cover rounded-xl" />
                    <div>
                      <h4 className="text-[10px] font-bold uppercase mb-1">{item.name}</h4>
                      <p className="text-[9px] text-nie8-text/40 font-bold">Size: {item.size} • sl: {item.quantity}</p>
                      <p className="text-xs font-serif italic">{item.price}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-3 pt-6 border-t border-nie8-primary/10 text-xs">
                <div className="flex justify-between font-medium text-nie8-text/60"><span>Tạm tính</span><span>{total.toLocaleString()}đ</span></div>
                <div className="flex justify-between font-medium text-nie8-text/60"><span>Phí ship</span><span>{shippingFee === 0 ? 'Miễn phí' : `${shippingFee.toLocaleString()}đ`}</span></div>
                <div className="flex justify-between items-center pt-4 border-t border-nie8-primary/10">
                  <span className="text-sm font-bold">Tổng thanh toán</span>
                  <span className="text-2xl font-serif italic text-nie8-primary">{finalTotal.toLocaleString()}đ</span>
                </div>
              </div>
            </div>
            <button onClick={onBack} className="w-full mt-6 text-xs font-bold text-nie8-text/40 uppercase tracking-widest flex items-center justify-center gap-2"><ArrowLeft size={16} /> Quay lại</button>
          </aside>
        </div>
      </div>
    </div>
  );
}
