import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, CheckCircle2, CreditCard, Truck, MapPin } from 'lucide-react';
import { CartItem, Order } from '../types';
import { supabase } from '../lib/supabase';

interface CheckoutProps {
  items: CartItem[];
  onBack: () => void;
  onComplete: (orderId: string, phone: string) => void;
  user?: any;
}

export default function Checkout({ items, onBack, onComplete, user }: CheckoutProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 phút tính bằng giây
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    paymentMethod: 'cod'
  });

  // Logic đếm ngược
  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step >= 2 && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getExpiryDate = () => {
    const date = new Date(Date.now() + timeLeft * 1000);
    return date.toLocaleString('vi-VN', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  const total = items.reduce((sum, item) => {
    const priceStr = item.price.toString();
    const price = parseFloat(priceStr.replace(/[^0-9]/g, ''));
    return sum + (isNaN(price) ? 0 : price) * item.quantity;
  }, 0);

  const shippingFee = total >= 2000000 ? 0 : 30000;
  const finalTotal = 2000; // CHẾ ĐỘ TEST

  // Format tiền VND
  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      const orderId = Date.now().toString();
      setIsProcessing(true);
      
      try {
        // Thực thi Giao dịch (Transaction) Trừ kho và Lưu đơn cùng lúcrpc
        const { data: result, error: rpcError } = await supabase.rpc('secure_checkout', {
          p_order_id: orderId,
          p_user_id: user?.id || null,
          p_customer_name: formData.name,
          p_customer_phone: formData.phone,
          p_customer_address: formData.address,
          p_customer_city: formData.city,
          p_items: items.map(item => ({ id: item.id, size: item.size || 'M', quantity: item.quantity })),
          p_total_amount: finalTotal,
          p_payment_method: formData.paymentMethod
        });

        if (rpcError) throw rpcError;
        
        if (result && !result.success) {
          throw new Error(result.error || 'Lỗi hệ thống khi thanh toán.');
        }

        if (formData.paymentMethod === 'payos') {
          // Lưu tạm số điện thoại để khi quay lại từ PayOS có thể auto-track
          localStorage.setItem('niee8_temp_phone', formData.phone);

          const response = await fetch('/api/create-payment-link', {
             // Giữ nguyên PayOS test data
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: parseInt(orderId.slice(-6)), 
              amount: 2000, 
              description: `NIEE8-${orderId.slice(-4)}`,
              items: items.map(item => ({
                name: item.name,
                quantity: item.quantity,
                price: 2000 
              })),
              returnUrl: `${window.location.href.split('?')[0]}?payment=success&orderId=${orderId}`,
              cancelUrl: `${window.location.href.split('?')[0]}?payment=cancel&orderId=${orderId}`
            })
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Server error: ${response.status}`);
          }

          const data = await response.json();
          if (data.checkoutUrl) window.location.href = data.checkoutUrl;
          else throw new Error('Không nhận được link thanh toán từ PayOS');

        } else {
          // COD Payment done
          setIsProcessing(false);
          setCurrentOrderId(orderId);
          setStep(3);
        }
      } catch (error: any) {
        console.error("Payment Error:", error);
        alert(`Lỗi thanh toán: ${error.message || 'Không đủ tồn kho hoặc lỗi mạng'}`);
        setIsProcessing(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-nie8-bg flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-nie8-primary/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-nie8-text/60 hover:text-nie8-text transition-colors text-sm font-medium"
          >
            <ChevronLeft size={18} />
            Quay lại giỏ hàng
          </button>
          <h1 className="text-xl font-serif italic text-nie8-text">Thanh toán</h1>
          <div className="w-24" /> {/* Spacer for centering */}
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-16">
          
          {/* Left Column: Form */}
          <div className="flex-grow lg:w-2/3">
            {/* Progress Steps */}
            <div className="flex items-center mb-8">
              <div className={`flex items-center gap-2 ${step >= 1 ? 'text-nie8-primary' : 'text-nie8-text/40'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= 1 ? 'bg-nie8-primary text-white' : 'bg-nie8-primary/10'}`}>1</div>
                <span className="text-sm font-bold uppercase tracking-wider">Giao hàng</span>
              </div>
              <div className={`flex-grow h-px mx-4 ${step >= 2 ? 'bg-nie8-primary' : 'bg-nie8-primary/20'}`} />
              <div className={`flex items-center gap-2 ${step >= 2 ? 'text-nie8-primary' : 'text-nie8-text/40'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= 2 ? 'bg-nie8-primary text-white' : 'bg-nie8-primary/10'}`}>2</div>
                <span className="text-sm font-bold uppercase tracking-wider">Thanh toán</span>
              </div>
            </div>

            <form id="checkout-form" onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-[32px] shadow-sm border border-nie8-primary/5">
              {step === 1 ? (
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                  <h2 className="text-lg font-serif italic mb-6 flex items-center gap-2">
                    <MapPin size={20} className="text-nie8-primary" />
                    Thông tin nhận hàng
                  </h2>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs uppercase tracking-widest text-nie8-text/60 mb-2 font-semibold">Họ và tên</label>
                        <input required type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full bg-nie8-bg border border-nie8-primary/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-nie8-primary transition-colors" placeholder="Nguyễn Văn A" />
                      </div>
                      <div>
                        <label className="block text-xs uppercase tracking-widest text-nie8-text/60 mb-2 font-semibold">Số điện thoại</label>
                        <input required type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full bg-nie8-bg border border-nie8-primary/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-nie8-primary transition-colors" placeholder="0901234567" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-widest text-nie8-text/60 mb-2 font-semibold">Tỉnh / Thành phố</label>
                      <select required name="city" value={formData.city} onChange={handleInputChange} className="w-full bg-nie8-bg border border-nie8-primary/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-nie8-primary transition-colors appearance-none">
                        <option value="">Chọn Tỉnh / Thành phố</option>
                        <option value="HCM">TP. Hồ Chí Minh</option>
                        <option value="HN">Hà Nội</option>
                        <option value="DN">Đà Nẵng</option>
                        <option value="Other">Tỉnh thành khác</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-widest text-nie8-text/60 mb-2 font-semibold">Địa chỉ chi tiết</label>
                      <input required type="text" name="address" value={formData.address} onChange={handleInputChange} className="w-full bg-nie8-bg border border-nie8-primary/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-nie8-primary transition-colors" placeholder="Số nhà, tên đường, phường/xã..." />
                    </div>
                  </div>
                  
                  <div className="mt-8 pt-6 border-t border-nie8-primary/10">
                    <button type="submit" className="w-full sm:w-auto px-8 py-4 bg-nie8-primary text-white rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-nie8-secondary transition-colors active:scale-95">
                      Tiếp tục đến thanh toán
                    </button>
                  </div>
                </motion.div>
              ) : step === 2 ? (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <h2 className="text-lg font-serif italic flex items-center gap-2">
                      <CreditCard size={20} className="text-nie8-primary" />
                      Phương thức thanh toán
                    </h2>
                    
                    {/* Countdown Timer UI */}
                    <div className="flex flex-col items-end gap-1">
                      <motion.div 
                        animate={timeLeft < 60 ? { scale: [1, 1.05, 1] } : {}}
                        transition={{ duration: 1, repeat: Infinity }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full border ${timeLeft < 60 ? 'bg-red-50 border-red-200 text-red-600' : 'bg-nie8-primary/5 border-nie8-primary/10 text-nie8-primary'}`}
                      >
                        <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
                        <span className="text-[10px] uppercase tracking-widest font-bold">Hết hạn sau:</span>
                        <span className="text-sm font-mono font-bold">{formatTime(timeLeft)}</span>
                      </motion.div>
                      <p className="text-[9px] text-nie8-text/40 font-medium italic">
                        Thanh toán trước {getExpiryDate()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition-colors ${formData.paymentMethod === 'cod' ? 'border-nie8-primary bg-nie8-primary/5' : 'border-nie8-primary/10 hover:bg-nie8-bg'}`}>
                      <input type="radio" name="paymentMethod" value="cod" checked={formData.paymentMethod === 'cod'} onChange={handleInputChange} className="w-4 h-4 text-nie8-primary focus:ring-nie8-primary" />
                      <div className="ml-3">
                        <span className="block text-sm font-bold text-nie8-text">Thanh toán khi nhận hàng (COD)</span>
                        <span className="block text-xs text-nie8-text/60 mt-0.5">Thanh toán bằng tiền mặt khi shipper giao hàng tới.</span>
                      </div>
                    </label>

                    <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition-colors ${formData.paymentMethod === 'bank' ? 'border-nie8-primary bg-nie8-primary/5' : 'border-nie8-primary/10 hover:bg-nie8-bg'}`}>
                      <input type="radio" name="paymentMethod" value="bank" checked={formData.paymentMethod === 'bank'} onChange={handleInputChange} className="w-4 h-4 text-nie8-primary focus:ring-nie8-primary" />
                      <div className="ml-3">
                        <span className="block text-sm font-bold text-nie8-text">Chuyển khoản ngân hàng (VietQR)</span>
                        <span className="block text-xs text-nie8-text/60 mt-0.5">Quét mã QR để chuyển khoản nhanh chóng.</span>
                      </div>
                    </label>

                    <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition-colors ${formData.paymentMethod === 'payos' ? 'border-nie8-primary bg-nie8-primary/5' : 'border-nie8-primary/10 hover:bg-nie8-bg'}`}>
                      <input type="radio" name="paymentMethod" value="payos" checked={formData.paymentMethod === 'payos'} onChange={handleInputChange} className="w-4 h-4 text-nie8-primary focus:ring-nie8-primary" />
                      <div className="ml-3">
                        <span className="block text-sm font-bold text-nie8-text">Thanh toán qua PayOS (Thẻ/QR)</span>
                        <span className="block text-xs text-nie8-text/60 mt-0.5 italic">Link thanh toán có hiệu lực trong 15 phút.</span>
                      </div>
                    </label>
                  </div>

                  <div className="mt-8 pt-6 border-t border-nie8-primary/10 flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <button type="button" onClick={() => setStep(1)} className="text-sm font-medium text-nie8-text/60 hover:text-nie8-text transition-colors">
                      Quay lại
                    </button>
                    <button 
                      type="submit" 
                      disabled={isProcessing}
                      className="w-full sm:w-auto px-8 py-4 bg-nie8-primary text-white rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-nie8-secondary transition-colors active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isProcessing ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <CheckCircle2 size={18} />
                      )}
                      {isProcessing ? 'Đang xử lý...' : 'Hoàn tất đặt hàng'}
                    </button>
                  </div>
                </motion.div>
              ) : step === 3 ? (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 size={40} className="text-green-500" />
                  </div>
                  <h2 className="text-3xl font-serif italic text-nie8-text mb-4">Đặt hàng thành công!</h2>
                  <p className="text-nie8-text/60 mb-8 max-w-md mx-auto">
                    Cảm ơn bạn đã mua sắm tại niee8. Đơn hàng của bạn đang được xử lý và sẽ sớm được giao đến bạn.
                  </p>
                  
                  {formData.paymentMethod === 'bank' && (
                    <div className="bg-nie8-bg p-6 rounded-2xl mb-8 max-w-sm mx-auto text-left border border-nie8-primary/10 relative overflow-hidden">
                      {/* Timer background indicator */}
                      <motion.div 
                        initial={{ width: '100%' }}
                        animate={{ width: `${(timeLeft / (15 * 60)) * 100}%` }}
                        className="absolute top-0 left-0 h-1 bg-nie8-primary/20"
                      />
                      
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex flex-col">
                          <p className="text-xs uppercase tracking-widest text-nie8-text/60 font-bold">Thông tin chuyển khoản</p>
                          <p className="text-[9px] text-nie8-text/40 italic">Thanh toán trước {getExpiryDate()}</p>
                        </div>
                        <span className={`text-xs font-mono font-bold ${timeLeft < 60 ? 'text-red-500' : 'text-nie8-primary'}`}>
                          {formatTime(timeLeft)}
                        </span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-nie8-text/60">Ngân hàng:</span> <span className="font-bold">Vietcombank</span></div>
                        <div className="flex justify-between"><span className="text-nie8-text/60">Số TK:</span> <span className="font-bold">0123456789</span></div>
                        <div className="flex justify-between"><span className="text-nie8-text/60">Chủ TK:</span> <span className="font-bold">NIEE8 STORE</span></div>
                        <div className="flex justify-between"><span className="text-nie8-text/60">Số tiền:</span> <span className="font-bold text-nie8-primary">{formatVND(finalTotal)}</span></div>
                        <div className="flex justify-between"><span className="text-nie8-text/60">Nội dung:</span> <span className="font-bold">DH {Math.floor(Math.random() * 100000)}</span></div>
                      </div>
                    </div>
                  )}

                  <button 
                    type="button" 
                    onClick={() => onComplete(currentOrderId || '', formData.phone)} 
                    className="px-8 py-4 bg-nie8-primary text-white rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-nie8-secondary transition-colors active:scale-95"
                  >
                    Theo dõi đơn hàng
                  </button>
                </motion.div>
              ) : null}
            </form>
          </div>

          {/* Right Column: Order Summary */}
          <div className="lg:w-1/3">
            <div className="bg-white p-6 rounded-[32px] shadow-sm border border-nie8-primary/5 sticky top-24">
              <h3 className="text-lg font-serif italic mb-6">Tóm tắt đơn hàng</h3>
              
              <div className="space-y-4 mb-6 max-h-[40vh] overflow-y-auto scroll-hide pr-2">
                {items.map(item => (
                  <div key={`${item.id}-${item.size}`} className="flex gap-4">
                    <div className="w-16 h-20 rounded-lg overflow-hidden bg-nie8-bg flex-shrink-0 relative">
                      <img src={item.images[0]} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <span className="absolute -top-2 -right-2 w-5 h-5 bg-nie8-primary text-white text-[10px] font-bold flex items-center justify-center rounded-full z-10">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="flex-grow">
                      <h4 className="text-sm font-medium line-clamp-2 leading-tight mb-1">{item.name}</h4>
                      <p className="text-xs text-nie8-text/60 mb-1">Size: {item.size}</p>
                      <p className="text-sm font-bold">{formatVND(parseFloat(item.price.replace(/[^0-9]/g, '')) * item.quantity)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3 text-sm border-t border-nie8-primary/10 pt-4 mb-4">
                <div className="flex justify-between text-nie8-text/60">
                  <span>Tạm tính</span>
                  <span>{formatVND(total)}</span>
                </div>
                <div className="flex justify-between text-nie8-text/60">
                  <span className="flex items-center gap-1"><Truck size={14} /> Phí vận chuyển</span>
                  <span>{shippingFee === 0 ? 'Miễn phí' : formatVND(shippingFee)}</span>
                </div>
                <div className="flex justify-between text-nie8-text/60">
                  <span>Thuế VAT (8%)</span>
                  <span>Đã bao gồm</span>
                </div>
              </div>

              <div className="border-t border-nie8-primary/10 pt-4">
                <div className="flex justify-between items-end">
                  <span className="text-sm font-bold uppercase tracking-widest">Tổng cộng</span>
                  <span className="text-2xl font-serif italic text-nie8-primary">{formatVND(finalTotal)}</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
