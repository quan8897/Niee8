import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Package, Truck, CheckCircle2, Clock, 
  ChevronRight, ArrowLeft, MapPin, Phone, User,
  AlertCircle, Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Order } from '../types';

interface OrderTrackingProps {
  onBack: () => void;
  initialOrderId?: string;
  initialPhone?: string;
  user?: any;
}

export default function OrderTracking({ onBack, initialOrderId, initialPhone, user }: OrderTrackingProps) {
  const [orderId, setOrderId] = useState(initialOrderId || '');
  const [phoneNumber, setPhoneNumber] = useState(initialPhone || '');
  const [order, setOrder] = useState<Order | null>(null);
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialOrderId && initialPhone) {
      fetchOrder(initialOrderId, initialPhone);
    }
  }, [initialOrderId, initialPhone]);

  useEffect(() => {
    if (user) {
      fetchUserOrders();
    }
  }, [user]);

  const fetchUserOrders = async () => {
    setIsLoadingHistory(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (fetchError) throw fetchError;
      setUserOrders(data || []);
    } catch (err) {
      console.error('Error fetching user orders:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const fetchOrder = async (id: string, phone: string) => {
    setIsLoading(true);
    setError(null);
    setOrder(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .eq('customer_phone', phone)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          throw new Error('Không tìm thấy đơn hàng. Vui lòng kiểm tra lại thông tin.');
        }
        throw fetchError;
      }

      setOrder(data as Order);
    } catch (err: any) {
      setError(err.message || 'Đã có lỗi xảy ra khi truy vấn đơn hàng.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId || !phoneNumber) {
      setError('Vui lòng nhập đầy đủ Mã đơn hàng và Số điện thoại.');
      return;
    }
    fetchOrder(orderId, phoneNumber);
  };

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
  };

  const getStatusStep = (status: Order['status']) => {
    switch (status) {
      case 'pending': return 1;
      case 'processing': return 2;
      case 'shipping': return 3;
      case 'completed': return 4;
      default: return 1;
    }
  };

  const getStatusLabel = (status: Order['status']) => {
    switch (status) {
      case 'pending': return 'Chờ xác nhận';
      case 'processing': return 'Đang xử lý';
      case 'shipping': return 'Đang giao';
      case 'completed': return 'Hoàn thành';
      case 'cancelled': return 'Đã hủy';
      default: return status;
    }
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'processing': return 'bg-blue-100 text-blue-700';
      case 'shipping': return 'bg-purple-100 text-purple-700';
      case 'completed': return 'bg-green-100 text-green-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const statusSteps = [
    { label: 'Chờ xác nhận', icon: Clock, step: 1 },
    { label: 'Đang xử lý', icon: Package, step: 2 },
    { label: 'Đang giao hàng', icon: Truck, step: 3 },
    { label: 'Hoàn thành', icon: CheckCircle2, step: 4 },
  ];

  return (
    <div className="min-h-screen bg-nie8-bg py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-nie8-text/60 hover:text-nie8-text transition-colors mb-8 group"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-bold uppercase tracking-widest">Quay lại</span>
        </button>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-serif italic text-nie8-text mb-4">
            {user ? 'Đơn hàng của bạn' : 'Theo dõi đơn hàng'}
          </h1>
          <p className="text-nie8-text/40">
            {user ? 'Xem lịch sử và trạng thái các đơn hàng đã đặt.' : 'Nhập thông tin để kiểm tra trạng thái đơn hàng của bạn.'}
          </p>
        </div>

        {!user && (
          <div className="bg-white p-8 rounded-[40px] shadow-sm border border-nie8-primary/5 mb-8">
            <form onSubmit={handleTrack} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-nie8-text/40 ml-4">Mã đơn hàng</label>
                  <input 
                    type="text" 
                    value={orderId}
                    onChange={e => setOrderId(e.target.value)}
                    placeholder="Ví dụ: 1712584930"
                    className="w-full bg-nie8-bg/50 border border-nie8-primary/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-nie8-primary transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-nie8-text/40 ml-4">Số điện thoại</label>
                  <input 
                    type="tel" 
                    value={phoneNumber}
                    onChange={e => setPhoneNumber(e.target.value)}
                    placeholder="Số điện thoại đặt hàng"
                    className="w-full bg-nie8-bg/50 border border-nie8-primary/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-nie8-primary transition-colors"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 text-red-500 p-4 rounded-2xl text-xs flex items-center gap-2">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <button 
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-nie8-primary text-white rounded-full font-bold uppercase tracking-widest shadow-xl shadow-nie8-primary/20 hover:bg-nie8-secondary transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                {isLoading ? 'Đang tìm kiếm...' : 'Kiểm tra trạng thái'}
              </button>
            </form>
          </div>
        )}

        {user && !order && (
          <div className="space-y-4 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-nie8-text/40">Lịch sử đặt hàng</h3>
              <button 
                onClick={fetchUserOrders}
                disabled={isLoadingHistory}
                className="text-[10px] font-bold uppercase tracking-widest text-nie8-primary hover:text-nie8-secondary transition-colors flex items-center gap-1"
              >
                {isLoadingHistory ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
                Làm mới
              </button>
            </div>
            {isLoadingHistory ? (
              <div className="text-center py-12">
                <Loader2 size={24} className="animate-spin mx-auto text-nie8-primary mb-2" />
                <p className="text-xs text-nie8-text/40 font-bold uppercase tracking-widest">Đang tải lịch sử đơn hàng...</p>
              </div>
            ) : userOrders.length === 0 ? (
              <div className="bg-white p-12 rounded-[40px] text-center border border-nie8-primary/5">
                <Package size={48} className="mx-auto text-nie8-text/10 mb-4" />
                <p className="text-sm text-nie8-text/40 font-medium">Bạn chưa có đơn hàng nào.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {userOrders.map(uo => (
                  <motion.div
                    key={uo.id}
                    whileHover={{ y: -4 }}
                    onClick={() => setOrder(uo)}
                    className="bg-white p-6 rounded-[32px] shadow-sm border border-nie8-primary/5 cursor-pointer hover:border-nie8-primary/20 transition-all flex justify-between items-center"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-nie8-bg rounded-2xl flex items-center justify-center text-nie8-primary">
                        <Package size={20} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-nie8-text">Đơn hàng #{uo.id.slice(-8)}</h4>
                        <p className="text-[10px] text-nie8-text/40 font-bold uppercase tracking-widest">
                          {new Date(uo.created_at).toLocaleDateString('vi-VN')} • {uo.items.length} sản phẩm
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-nie8-primary mb-1">{formatVND(uo.total_amount)}</p>
                      <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${getStatusColor(uo.status)}`}>
                        {getStatusLabel(uo.status)}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        <AnimatePresence mode="wait">
          {order && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {user && (
                <button 
                  onClick={() => setOrder(null)}
                  className="flex items-center gap-2 text-nie8-primary hover:text-nie8-secondary transition-colors text-[10px] font-bold uppercase tracking-widest"
                >
                  <ChevronRight size={14} className="rotate-180" /> Quay lại danh sách
                </button>
              )}
              {/* Order Status Stepper */}
              <div className="bg-white p-8 rounded-[40px] shadow-sm border border-nie8-primary/5">
                <div className="flex justify-between items-center mb-12">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-nie8-text/40 mb-1">Trạng thái đơn hàng</p>
                    <h3 className="text-xl font-serif italic text-nie8-text">#{order.id}</h3>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-nie8-text/40 mb-1">Ngày đặt</p>
                    <p className="text-sm font-medium">{new Date(order.created_at).toLocaleDateString('vi-VN')}</p>
                  </div>
                </div>

                <div className="relative flex justify-between">
                  <div className="absolute top-5 left-0 right-0 h-0.5 bg-nie8-bg z-0" />
                  <div 
                    className="absolute top-5 left-0 h-0.5 bg-nie8-primary z-0 transition-all duration-1000" 
                    style={{ width: `${((getStatusStep(order.status) - 1) / 3) * 100}%` }}
                  />
                  
                  {statusSteps.map((step) => {
                    const isActive = getStatusStep(order.status) >= step.step;
                    const isCurrent = getStatusStep(order.status) === step.step;
                    
                    return (
                      <div key={step.step} className="relative z-10 flex flex-col items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                          isActive ? 'bg-nie8-primary text-white shadow-lg shadow-nie8-primary/20' : 'bg-nie8-bg text-nie8-text/20'
                        } ${isCurrent ? 'scale-110 ring-4 ring-nie8-primary/10' : ''}`}>
                          <step.icon size={18} />
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-widest text-center max-w-[80px] ${
                          isActive ? 'text-nie8-text' : 'text-nie8-text/20'
                        }`}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Order Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Customer Info */}
                <div className="bg-white p-8 rounded-[40px] shadow-sm border border-nie8-primary/5 space-y-6">
                  <h4 className="text-lg font-serif italic text-nie8-text border-b border-nie8-primary/5 pb-4">Thông tin nhận hàng</h4>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <User size={16} className="text-nie8-primary mt-1" />
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-nie8-text/40">Người nhận</p>
                        <p className="text-sm font-medium">{order.customer_name}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Phone size={16} className="text-nie8-primary mt-1" />
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-nie8-text/40">Số điện thoại</p>
                        <p className="text-sm font-medium">{order.customer_phone}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin size={16} className="text-nie8-primary mt-1" />
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-nie8-text/40">Địa chỉ</p>
                        <p className="text-sm font-medium leading-relaxed">
                          {order.customer_address}, {order.customer_city}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Items Summary */}
                <div className="bg-white p-8 rounded-[40px] shadow-sm border border-nie8-primary/5 flex flex-col">
                  <h4 className="text-lg font-serif italic text-nie8-text border-b border-nie8-primary/5 pb-4 mb-6">Sản phẩm</h4>
                  <div className="flex-grow space-y-4 mb-6 max-h-[200px] overflow-y-auto scroll-hide">
                    {order.items.map((item, i) => (
                      <div key={i} className="flex gap-4">
                        <div className="w-12 h-16 rounded-xl overflow-hidden bg-nie8-bg flex-shrink-0">
                          <img src={item.images[0]} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-nie8-text line-clamp-1">{item.name}</p>
                          <p className="text-[10px] text-nie8-text/40 uppercase tracking-widest font-bold">Size: {item.size} × {item.quantity}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="pt-4 border-t border-nie8-primary/5 flex justify-between items-end">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-nie8-text/40">Tổng thanh toán</p>
                    <p className="text-2xl font-serif italic text-nie8-primary">{formatVND(order.total_amount)}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
