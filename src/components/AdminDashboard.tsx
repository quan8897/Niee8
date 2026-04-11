import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Plus, Trash2, Edit2, Save, Upload, Image as ImageIcon, 
  Settings, Package, Loader2, LogOut, LayoutDashboard, 
  Instagram, Calendar, TrendingUp, Users, MessageSquare, 
  ArrowRight, CheckCircle2, Clock, Sparkles, Send, Heart, ShoppingBag, PackagePlus
} from 'lucide-react';
import { Product, SiteSettings, Order } from '../types';
import { supabase } from '../lib/supabase';
import { generateInstagramCaption } from '../services/geminiService';


interface AdminDashboardProps {
  products: Product[];
  siteSettings: SiteSettings | null;
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
  onUpdateSettings: (settings: SiteSettings) => void;
  onClose: () => void;
  onLogout?: () => void;
}

type AdminTab = 'overview' | 'products' | 'orders' | 'stock-ledger' | 'create-post' | 'schedule' | 'settings' | 'technical' | 'uat';

export default function AdminDashboard({ 
  products, 
  siteSettings,
  onAddProduct, 
  onUpdateProduct, 
  onDeleteProduct, 
  onUpdateSettings,
  onClose,
  onLogout
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [isAdding, setIsAdding] = useState(false);
  const [isBulkAdding, setIsBulkAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [bulkData, setBulkData] = useState('');
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isUploadingHero, setIsUploadingHero] = useState(false);
  const [uploadingImagesCount, setUploadingImagesCount] = useState(0);
  
  const [showSuccess, setShowSuccess] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Restock Modal State
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [restockProduct, setRestockProduct] = useState<Product | null>(null);
  const [restockSize, setRestockSize] = useState<string>('M');
  const [restockQuantity, setRestockQuantity] = useState<number>(0);
  const [isRestocking, setIsRestocking] = useState(false);

  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    price: '',
    images: [],
    description: '',
    category: 'Áo',
    stock_quantity: 0,
    stock_by_size: { S: 0, M: 0, L: 0, XL: 0 },
    is_set: true,
    story_content: ''
  });

  const [settingsForm, setSettingsForm] = useState<SiteSettings>(siteSettings || {
    heroImage: '',
    heroTitle: '',
    heroSubtitle: '',
    heroDescription: '',
    theme_mode: 'warm',
    grid_mode: 'full-lookbook',
    show_story: true
  });

  // Instagram Post State
  const [instaPost, setInstaPost] = useState({
    productId: '',
    caption: '',
    scheduledDate: '',
    isGeneratingCaption: false
  });


  const openRestockModal = (product: Product) => {
    setRestockProduct(product);
    setRestockSize('M');
    setRestockQuantity(0);
    setShowRestockModal(true);
  };



  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockProduct || restockQuantity <= 0) return;
    
    setIsRestocking(true);
    try {
      // 1. Update product stock
      const currentStockBySize = restockProduct.stock_by_size || { S: 0, M: 0, L: 0, XL: 0 };
      const newStockBySize = {
        ...currentStockBySize,
        [restockSize]: (currentStockBySize[restockSize] || 0) + restockQuantity
      };
      const newTotalStock = Object.values(newStockBySize).reduce((a, b) => a + b, 0);
      
      const { error: updateError } = await supabase
        .from('products')
        .update({
          stock_by_size: newStockBySize,
          stock_quantity: newTotalStock
        })
        .eq('id', restockProduct.id);
        
      if (updateError) throw updateError;

      // 2. Insert into stock_movements
      const { error: movementError } = await supabase
        .from('stock_movements')
        .insert({
          product_id: restockProduct.id,
          size: restockSize,
          quantity: restockQuantity,
          type: 'import',
          note: `Nhập kho thủ công từ Dashboard`
        });
        
      if (movementError) console.error('Error logging stock movement:', movementError);


      onUpdateProduct({
        ...restockProduct,
        stock_by_size: newStockBySize,
        stock_quantity: newTotalStock
      });

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      setShowRestockModal(false);
    } catch (error: any) {
      console.error('Error restocking:', error);
      alert(`Lỗi nhập kho: ${error.message}`);
    } finally {
      setIsRestocking(false);
    }
  };


  const formatVND = (priceStr: string) => {
    const amount = parseFloat(priceStr.replace(/[^0-9]/g, ''));
    if (isNaN(amount)) return priceStr;
    return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
  };

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setBulkError(null);
    try {
      const parsed = JSON.parse(bulkData);
      if (!Array.isArray(parsed)) throw new Error('Dữ liệu phải là một mảng các sản phẩm.');
      
      parsed.forEach((item: any, index: number) => {
        if (!item.name || !item.price) {
          throw new Error(`Sản phẩm thứ ${index + 1} thiếu tên hoặc giá.`);
        }
        onAddProduct({
          ...item,
          id: (Date.now() + index).toString(),
          images: Array.isArray(item.images) ? item.images : (item.image ? [item.image] : []),
          category: item.category || 'Áo',
          description: item.description || ''
        } as Product);
      });
      
      setIsBulkAdding(false);
      setBulkData('');
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : 'Định dạng JSON không hợp lệ.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadingImagesCount > 0) {
      setImageError('Vui lòng chờ ảnh tải lên xong trước khi lưu.');
      return;
    }
    if (editingId) {
      onUpdateProduct({ ...formData, id: editingId } as Product);
      setEditingId(null);
    } else {
      onAddProduct({ ...formData, id: Date.now().toString() } as Product);
      setIsAdding(false);
    }
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
    setFormData({ name: '', price: '', images: [], description: '', category: 'Áo', stock_quantity: 0, stock_by_size: { S: 0, M: 0, L: 0, XL: 0 } });
  };

  const handleSettingsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isUploadingHero) {
      setImageError('Vui lòng chờ ảnh tải lên xong trước khi lưu.');
      return;
    }
    onUpdateSettings(settingsForm);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  // Image processing logic (same as before)
  const processImage = async (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(file); return; }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) resolve(new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", { type: 'image/webp' }));
          else resolve(file);
        }, 'image/webp', 0.85);
      };
      img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file); };
      img.src = objectUrl;
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isHero = false) => {
    setImageError(null);
    const files = e.target.files;
    if (!files) return;

    if (isHero) setIsUploadingHero(true);
    else setUploadingImagesCount(prev => prev + files.length);

    for (const file of Array.from(files)) {
      try {
        const optimizedFile = await processImage(file);
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.webp`;
        const filePath = `${isHero ? 'settings' : 'products'}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('image')
          .upload(filePath, optimizedFile);

        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('image').getPublicUrl(filePath);

        if (isHero) {
          setSettingsForm(prev => ({ ...prev, heroImage: data.publicUrl }));
        } else {
          setFormData(prev => ({ ...prev, images: [...(prev.images || []), data.publicUrl] }));
        }
      } catch (error) {
        console.error('Upload error:', error);
        setImageError('Lỗi khi tải ảnh lên.');
      } finally {
        if (isHero) setIsUploadingHero(false);
        else setUploadingImagesCount(prev => prev - 1);
      }
    }
  };

  const generateAICaption = async () => {
    const product = products.find(p => p.id === instaPost.productId);
    if (!product) return;

    setInstaPost(prev => ({ ...prev, isGeneratingCaption: true }));
    try {
      const caption = await generateInstagramCaption(product.name);
      setInstaPost(prev => ({ ...prev, caption }));
    } catch (error) {
      console.error('Error generating caption:', error);
    } finally {
      setInstaPost(prev => ({ ...prev, isGeneratingCaption: false }));
    }
  };

  const fetchOrders = async () => {
    setIsLoadingOrders(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: Order['status']) => {
    try {
      // Nếu trạng thái mới là cancelled và trạng thái cũ không phải cancelled
      const orderToUpdate = orders.find(o => o.id === orderId);
      if (status === 'cancelled' && orderToUpdate && orderToUpdate.status !== 'cancelled') {
        // Hoàn kho cho từng sản phẩm trong đơn hàng
        for (const item of orderToUpdate.items) {
          const { error: restoreError } = await supabase.rpc('restore_stock', {
            p_product_id: item.id,
            p_size: item.size || 'M',
            p_quantity: item.quantity,
            p_order_id: orderId
          });
          if (restoreError) {
            console.error('Error restoring stock:', restoreError);
          }
        }
      }

      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);
      if (error) throw error;
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, status } : null);
      }
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  React.useEffect(() => {
    if (activeTab === 'orders') {
      fetchOrders();
    }
  }, [activeTab]);

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

  const sidebarItems = [
    { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'products', label: 'Quản lý sản phẩm', icon: Package },
    { id: 'stock-ledger', label: 'Lịch sử kho', icon: Package },
    { id: 'orders', label: 'Đơn hàng', icon: ShoppingBag },
    { id: 'create-post', label: 'Tạo bài đăng', icon: Instagram },
    { id: 'schedule', label: 'Lịch đăng', icon: Calendar },
    { id: 'settings', label: 'Cài đặt', icon: Settings },
  ];

  return (
    <div className="fixed inset-0 z-[100] bg-white flex overflow-hidden">
      {/* Success Notification */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-8 left-1/2 z-[250] bg-nie8-primary text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 font-bold text-sm"
          >
            <CheckCircle2 size={18} />
            <span>Thao tác thành công!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Order Detail Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedOrder(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-nie8-primary/10 flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-serif italic text-nie8-text">Chi tiết đơn hàng</h3>
                  <p className="text-xs font-mono text-nie8-text/40 mt-1">#{selectedOrder.id}</p>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="w-10 h-10 rounded-full bg-nie8-bg flex items-center justify-center text-nie8-text/40 hover:text-nie8-text transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-grow overflow-y-auto p-8 space-y-8 scroll-hide">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-nie8-text/40">Thông tin khách hàng</h4>
                    <div className="space-y-2 text-sm">
                      <p><span className="text-nie8-text/40">Họ tên:</span> <span className="font-bold">{selectedOrder.customer_name}</span></p>
                      <p><span className="text-nie8-text/40">SĐT:</span> <span className="font-bold">{selectedOrder.customer_phone}</span></p>
                      <p><span className="text-nie8-text/40">Địa chỉ:</span> <span className="font-bold">{selectedOrder.customer_address}, {selectedOrder.customer_city}</span></p>
                      {selectedOrder.user_id && (
                        <p><span className="text-nie8-text/40">User ID:</span> <span className="font-mono text-[10px] bg-nie8-bg px-2 py-0.5 rounded-md">{selectedOrder.user_id}</span></p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-nie8-text/40">Thanh toán</h4>
                    <div className="space-y-2 text-sm">
                      <p><span className="text-nie8-text/40">Phương thức:</span> <span className="font-bold uppercase">{selectedOrder.payment_method}</span></p>
                      <p><span className="text-nie8-text/40">Tổng cộng:</span> <span className="font-bold text-nie8-primary">{new Intl.NumberFormat('vi-VN').format(selectedOrder.total_amount)}đ</span></p>
                      <p><span className="text-nie8-text/40">Ngày đặt:</span> <span className="font-bold">{new Date(selectedOrder.created_at).toLocaleString('vi-VN')}</span></p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-nie8-text/40">Sản phẩm</h4>
                  <div className="space-y-3">
                    {selectedOrder.items.map((item, i) => (
                      <div key={i} className="flex items-center gap-4 bg-nie8-bg/30 p-3 rounded-2xl">
                        <div className="w-12 h-16 rounded-xl overflow-hidden flex-shrink-0">
                          <img src={item.images[0]} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                        <div className="flex-grow">
                          <p className="text-sm font-bold">{item.name}</p>
                          <p className="text-[10px] text-nie8-text/40 font-bold uppercase tracking-widest">Size: {item.size} × {item.quantity}</p>
                        </div>
                        <p className="text-sm font-bold text-nie8-primary">{new Intl.NumberFormat('vi-VN').format(parseFloat(item.price.replace(/[^0-9]/g, '')) * item.quantity)}đ</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-nie8-text/40">Cập nhật trạng thái</h4>
                  <div className="flex flex-wrap gap-2">
                    {(['pending', 'processing', 'shipping', 'completed', 'cancelled'] as Order['status'][]).map(status => (
                      <button
                        key={status}
                        onClick={() => updateOrderStatus(selectedOrder.id, status)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${
                          selectedOrder.status === status 
                            ? getStatusColor(status) + ' ring-2 ring-current ring-offset-2'
                            : 'bg-nie8-bg text-nie8-text/40 hover:bg-nie8-bg/80'
                        }`}
                      >
                        {getStatusLabel(status)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-nie8-primary/10 flex flex-col bg-nie8-bg/30 hidden lg:flex">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-nie8-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-nie8-primary/20">
              <Instagram size={20} />
            </div>
            <span className="text-2xl font-serif italic text-nie8-text">niee8 <span className="text-nie8-primary">Admin.</span></span>
          </div>

          <nav className="space-y-2">
            {sidebarItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as AdminTab)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                  activeTab === item.id 
                    ? 'bg-white text-nie8-primary shadow-sm' 
                    : 'text-nie8-text/40 hover:text-nie8-text hover:bg-white/50'
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-8 space-y-4">
          <button 
            onClick={onClose}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-nie8-text/60 hover:text-nie8-text hover:bg-white/50 transition-all"
          >
            <ArrowRight size={18} className="rotate-180" />
            Về trang chủ
          </button>
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-red-500 hover:bg-red-50 transition-all"
          >
            <LogOut size={18} />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-grow flex flex-col overflow-hidden bg-white">
        {/* Mobile Header */}
        <header className="lg:hidden p-4 border-b border-nie8-primary/10 flex items-center justify-between bg-white sticky top-0 z-10">
          <span className="text-xl font-serif italic text-nie8-text">niee8.</span>
          <div className="flex gap-2">
            <button onClick={() => setActiveTab('overview')} className={`p-2 rounded-xl ${activeTab === 'overview' ? 'text-nie8-primary bg-nie8-primary/10' : 'text-nie8-text/40'}`}><LayoutDashboard size={20} /></button>
            <button onClick={() => setActiveTab('products')} className={`p-2 rounded-xl ${activeTab === 'products' ? 'text-nie8-primary bg-nie8-primary/10' : 'text-nie8-text/40'}`}><Package size={20} /></button>
            <button onClick={() => setActiveTab('create-post')} className={`p-2 rounded-xl ${activeTab === 'create-post' ? 'text-nie8-primary bg-nie8-primary/10' : 'text-nie8-text/40'}`}><Instagram size={20} /></button>
            <button onClick={onClose} className="p-2 text-nie8-text/40"><X size={20} /></button>
          </div>
        </header>

        <div className="flex-grow overflow-y-auto p-6 sm:p-12 scroll-hide">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div 
                key="overview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-12"
              >
                <div>
                  <h1 className="text-4xl font-serif italic text-nie8-text mb-2">Tổng quan</h1>
                  <p className="text-nie8-text/40">Theo dõi hiệu suất và lịch đăng bài của bạn.</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { label: 'Bài đã đăng', value: '124', change: '+12%', icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50' },
                    { label: 'Đang chờ lịch', value: '12', change: '3 bài tuần này', icon: Clock, color: 'text-orange-500', bg: 'bg-orange-50' },
                    { label: 'Lượt tương tác', value: '45.2K', change: '+18.2%', icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-50' },
                    { label: 'Tăng trưởng', value: '1,240', change: '+4.3%', icon: Users, color: 'text-purple-500', bg: 'bg-purple-50' },
                  ].map((stat, i) => (
                    <div key={i} className="bg-nie8-bg/30 p-6 rounded-[32px] border border-nie8-primary/5">
                      <div className="flex justify-between items-start mb-4">
                        <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center`}>
                          <stat.icon size={24} />
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${stat.color}`}>{stat.change}</span>
                      </div>
                      <p className="text-3xl font-bold text-nie8-text mb-1">{stat.value}</p>
                      <p className="text-xs text-nie8-text/40 uppercase tracking-widest font-bold">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* Upcoming Posts & Restock Demand */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-nie8-bg/30 rounded-[40px] p-8 border border-nie8-primary/5">
                    <div className="flex justify-between items-center mb-8">
                      <h3 className="text-2xl font-serif italic text-nie8-text">Bài đăng sắp tới</h3>
                      <button className="text-xs font-bold uppercase tracking-widest text-nie8-primary hover:underline">Xem tất cả</button>
                    </div>
                    <div className="space-y-4">
                      {products.slice(0, 3).map((product, i) => (
                        <div key={i} className="bg-white p-4 rounded-3xl flex items-center gap-6 group hover:shadow-lg transition-all">
                          <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0">
                            <img src={product.images[0]} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                          <div className="flex-grow">
                            <h4 className="font-bold text-nie8-text text-sm mb-1">{product.name}</h4>
                            <div className="flex items-center gap-2 text-[10px] text-nie8-text/40 uppercase tracking-widest font-bold">
                              <Clock size={12} />
                              Hôm nay, 19:00
                            </div>
                          </div>
                          <div className="px-4 py-2 bg-nie8-bg rounded-xl text-[10px] font-bold uppercase tracking-widest text-nie8-text/40">
                            Scheduled
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-nie8-bg/30 rounded-[40px] p-8 border border-nie8-primary/5">
                    <div className="flex justify-between items-center mb-8">
                      <h3 className="text-2xl font-serif italic text-nie8-text">Hoạt động gần đây</h3>
                      <button className="text-xs font-bold uppercase tracking-widest text-nie8-primary hover:underline">Xem tất cả</button>
                    </div>
                    <div className="space-y-4">
                      <p className="text-center text-sm text-nie8-text/40 py-8 italic">Đang cập nhật luồng hoạt động mới...</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'products' && (
              <motion.div 
                key="products"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8 pb-12"
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-nie8-primary/5 pb-8">
                  <div>
                    <h1 className="text-4xl font-serif italic text-nie8-text mb-2">Sản phẩm</h1>
                    <p className="text-nie8-text/40">Quản lý kho hàng và thông tin sản phẩm.</p>
                  </div>
                  <div className="flex gap-3 w-full md:w-auto">
                    <button 
                      onClick={() => setIsAdding(true)}
                      className="flex-grow md:flex-none px-8 py-3.5 bg-nie8-primary text-white rounded-full font-bold text-xs uppercase tracking-widest hover:bg-nie8-secondary transition-all shadow-lg shadow-nie8-primary/20 flex items-center justify-center gap-2"
                    >
                      <Plus size={16} /> Thêm mới
                    </button>
                    <button 
                      onClick={() => setIsBulkAdding(true)}
                      className="flex-grow md:flex-none px-8 py-3.5 bg-nie8-text text-white rounded-full font-bold text-xs uppercase tracking-widest hover:bg-nie8-primary transition-all shadow-lg flex items-center justify-center gap-2"
                    >
                      <Upload size={16} /> Bulk
                    </button>
                  </div>
                </div>

                {isAdding || isBulkAdding ? (
                  <div className="bg-nie8-bg/30 p-8 rounded-[40px] border border-nie8-primary/5">
                    {/* Form logic remains similar to previous version but styled for full page */}
                    {isBulkAdding ? (
                      <form onSubmit={handleBulkSubmit} className="space-y-6">
                        <textarea 
                          required rows={10} value={bulkData}
                          onChange={(e) => setBulkData(e.target.value)}
                          className="w-full bg-white border border-nie8-primary/10 rounded-3xl px-6 py-4 font-mono text-sm focus:outline-none focus:border-nie8-primary transition-colors resize-none"
                          placeholder="JSON array of products..."
                        />
                        <div className="flex gap-4">
                          <button type="submit" className="flex-grow py-4 bg-nie8-primary text-white rounded-full font-bold uppercase tracking-widest">Lưu tất cả</button>
                          <button type="button" onClick={() => setIsBulkAdding(false)} className="px-8 py-4 bg-white text-nie8-text rounded-full font-bold uppercase tracking-widest border border-nie8-primary/10">Hủy</button>
                        </div>
                      </form>
                    ) : (
                      <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <input required type="text" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Tên sản phẩm" className="w-full bg-white border border-nie8-primary/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-nie8-primary" />
                          <input required type="text" value={formData.price || ''} onChange={e => setFormData({...formData, price: e.target.value})} placeholder="Giá (VND)" className="w-full bg-white border border-nie8-primary/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-nie8-primary" />
                          <select value={formData.category || 'Áo'} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-white border border-nie8-primary/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-nie8-primary">
                            <option value="Áo">Áo</option><option value="Quần">Quần</option><option value="Váy">Váy</option>
                          </select>
                          <div className="col-span-1 md:col-span-2 grid grid-cols-4 gap-4 bg-nie8-primary/5 p-4 rounded-2xl border border-nie8-primary/10">
                            <div className="col-span-4 text-[10px] font-bold uppercase tracking-widest text-nie8-text/40 mb-2">Tồn kho theo Size</div>
                            {['S', 'M', 'L', 'XL'].map(size => (
                              <div key={size} className="space-y-1">
                                <label className="text-xs font-medium text-nie8-text/60">Size {size}</label>
                                <input 
                                  type="number" 
                                  min="0"
                                  value={formData.stock_by_size?.[size] ?? 0} 
                                  onChange={e => {
                                    const val = parseInt(e.target.value) || 0;
                                    const newStockBySize = { ...(formData.stock_by_size || {S:0,M:0,L:0,XL:0}), [size]: val };
                                    const total = Object.values(newStockBySize).reduce((a, b) => a + b, 0);
                                    setFormData({...formData, stock_by_size: newStockBySize, stock_quantity: total});
                                  }} 
                                  className="w-full bg-white border border-nie8-primary/10 rounded-xl px-4 py-2 focus:outline-none focus:border-nie8-primary" 
                                />
                              </div>
                            ))}
                          </div>
                          
                          <div className="col-span-1 md:col-span-2 space-y-4">
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-nie8-text/40 ml-2">Hình ảnh sản phẩm</label>
                            <div className="flex flex-wrap gap-4">
                              {formData.images?.map((url, i) => (
                                <div key={i} className="relative w-24 h-32 rounded-xl overflow-hidden border-2 border-green-500 shadow-sm">
                                  <img src={url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  <button 
                                    type="button"
                                    onClick={() => setFormData({...formData, images: formData.images?.filter((_, idx) => idx !== i)})}
                                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg"
                                  >
                                    <X size={12} />
                                  </button>
                                  <div className="absolute bottom-0 left-0 right-0 bg-green-500 text-white text-[8px] font-bold text-center py-0.5">
                                    THÀNH CÔNG
                                  </div>
                                </div>
                              ))}
                              <label className="w-24 h-32 bg-nie8-bg border-2 border-dashed border-nie8-primary/20 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-nie8-primary/5 transition-all text-nie8-text/40 hover:text-nie8-primary">
                                <Plus size={20} />
                                <span className="text-[8px] font-bold uppercase tracking-widest">Thêm ảnh</span>
                                <input type="file" multiple className="hidden" onChange={e => handleImageUpload(e)} />
                              </label>
                            </div>
                            {uploadingImagesCount > 0 && (
                              <div className="flex items-center gap-2 text-xs text-nie8-primary font-bold animate-pulse">
                                <Loader2 size={14} className="animate-spin" />
                                Đang tải lên {uploadingImagesCount} ảnh...
                              </div>
                            )}
                          </div>
                        </div>
                        <textarea required rows={4} value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Mô tả sản phẩm" className="w-full bg-white border border-nie8-primary/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-nie8-primary resize-none" />
                        
                        {/* Lifestyle & Editorial Fields */}
                        <div className="space-y-4 pt-4 border-t border-nie8-primary/5">
                          <div className="flex items-center gap-3">
                            <input 
                              type="checkbox" 
                              id="is_set"
                              checked={formData.is_set}
                              onChange={(e) => setFormData({...formData, is_set: e.target.checked})}
                              className="w-4 h-4 rounded border-nie8-primary/20 text-nie8-primary focus:ring-nie8-primary"
                            />
                            <label htmlFor="is_set" className="text-sm font-medium text-nie8-text">Đây là một Set đồ phối sẵn</label>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-nie8-text/40">Câu chuyện bộ đồ (Story Content)</label>
                            <textarea 
                              placeholder="Cảm hứng của Stylist về bộ đồ này (Vibe, bối cảnh mặc đẹp...)"
                              className="w-full bg-nie8-bg/50 border border-nie8-primary/10 rounded-2xl p-4 text-sm focus:border-nie8-primary/30 outline-none transition-all min-h-[100px] italic"
                              value={formData.story_content}
                              onChange={(e) => setFormData({...formData, story_content: e.target.value})}
                            />
                          </div>
                        </div>

                        <div className="flex gap-4">
                          <button type="submit" className="flex-grow py-4 bg-nie8-primary text-white rounded-full font-bold uppercase tracking-widest">{editingId ? 'Cập nhật' : 'Đăng bài'}</button>
                          <button type="button" onClick={() => {setIsAdding(false); setEditingId(null);}} className="px-8 py-4 bg-white text-nie8-text rounded-full font-bold uppercase tracking-widest border border-nie8-primary/10">Hủy</button>
                        </div>
                      </form>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {products.map(product => (
                      <div key={product.id} className="bg-nie8-bg/30 p-2 rounded-2xl border border-nie8-primary/5 group hover:shadow-md transition-all relative">
                        <div className="aspect-[3/4] rounded-xl overflow-hidden mb-2 relative">
                          <img src={product.images[0]} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button onClick={() => openRestockModal(product)} className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-green-500 shadow-lg hover:bg-green-500 hover:text-white transition-all" title="Nhập kho"><PackagePlus size={14} /></button>
                            <button onClick={() => {setEditingId(product.id); setFormData(product); setIsAdding(true);}} className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-nie8-text shadow-lg hover:bg-nie8-primary hover:text-white transition-all"><Edit2 size={14} /></button>
                            <button onClick={() => onDeleteProduct(product.id)} className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-red-500 shadow-lg hover:bg-red-500 hover:text-white transition-all"><Trash2 size={14} /></button>
                          </div>
                        </div>
                        <h4 className="font-medium text-xs text-nie8-text truncate px-1" title={product.name}>{product.name}</h4>
                        <p className="text-nie8-primary font-bold text-[10px] px-1">{formatVND(product.price)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'stock-ledger' && (
              <motion.div 
                key="stock-ledger"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div>
                  <h1 className="text-4xl font-serif italic text-nie8-text mb-2">Lịch sử kho</h1>
                  <p className="text-nie8-text/40">Theo dõi chi tiết các giao dịch xuất, nhập, hoàn kho.</p>
                </div>
                <div className="bg-white rounded-[32px] p-8 shadow-sm border border-nie8-primary/5">
                  <p className="text-nie8-text/60 italic text-sm">Tính năng đang được cập nhật giao diện hiển thị. Dữ liệu đã được lưu trữ an toàn trên hệ thống.</p>
                </div>
              </motion.div>
            )}

            {activeTab === 'create-post' && (
              <motion.div 
                key="create-post"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-4xl space-y-12"
              >
                <div>
                  <h1 className="text-4xl font-serif italic text-nie8-text mb-2">Tạo bài đăng Instagram</h1>
                  <p className="text-nie8-text/40">Tự động hóa việc đăng bài từ kho sản phẩm của bạn.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <label className="text-xs font-bold uppercase tracking-widest text-nie8-text/40">Chọn sản phẩm</label>
                      <select 
                        value={instaPost.productId}
                        onChange={e => setInstaPost({...instaPost, productId: e.target.value})}
                        className="w-full bg-nie8-bg/50 border border-nie8-primary/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-nie8-primary"
                      >
                        <option value="">-- Chọn sản phẩm --</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold uppercase tracking-widest text-nie8-text/40">Caption</label>
                        <button 
                          onClick={generateAICaption}
                          disabled={!instaPost.productId || instaPost.isGeneratingCaption}
                          className="text-[10px] font-bold uppercase tracking-widest text-nie8-primary flex items-center gap-1 hover:underline disabled:opacity-50"
                        >
                          {instaPost.isGeneratingCaption ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                          Gợi ý bởi AI
                        </button>
                      </div>
                      <textarea 
                        rows={8}
                        value={instaPost.caption}
                        onChange={e => setInstaPost({...instaPost, caption: e.target.value})}
                        className="w-full bg-nie8-bg/50 border border-nie8-primary/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-nie8-primary resize-none text-sm leading-relaxed"
                        placeholder="Viết caption cho bài đăng..."
                      />
                    </div>

                    <div className="space-y-4">
                      <label className="text-xs font-bold uppercase tracking-widest text-nie8-text/40">Lịch đăng</label>
                      <input 
                        type="datetime-local"
                        value={instaPost.scheduledDate}
                        onChange={e => setInstaPost({...instaPost, scheduledDate: e.target.value})}
                        className="w-full bg-nie8-bg/50 border border-nie8-primary/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-nie8-primary"
                      />
                    </div>

                    <div className="flex gap-4">
                      <button className="flex-grow py-4 bg-nie8-primary text-white rounded-full font-bold uppercase tracking-widest shadow-xl shadow-nie8-primary/20 flex items-center justify-center gap-2">
                        <Calendar size={18} /> Lên lịch đăng
                      </button>
                      <button className="px-8 py-4 bg-nie8-text text-white rounded-full font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                        <Send size={18} /> Đăng ngay
                      </button>
                    </div>
                  </div>

                  {/* Preview Section */}
                  <div className="space-y-6">
                    <label className="text-xs font-bold uppercase tracking-widest text-nie8-text/40">Xem trước bài đăng</label>
                    <div className="bg-white border border-nie8-primary/10 rounded-[40px] overflow-hidden shadow-2xl max-w-[350px] mx-auto">
                      <div className="p-4 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 to-purple-600 p-[2px]">
                          <div className="w-full h-full rounded-full bg-white p-[1px]">
                            <div className="w-full h-full rounded-full bg-nie8-bg flex items-center justify-center text-[10px] font-bold">N8</div>
                          </div>
                        </div>
                        <span className="text-xs font-bold">niee8.official</span>
                      </div>
                      <div className="aspect-square bg-nie8-bg">
                        {instaPost.productId ? (
                          <img 
                            src={products.find(p => p.id === instaPost.productId)?.images[0]} 
                            alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" 
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-nie8-text/10"><ImageIcon size={48} /></div>
                        )}
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="flex gap-4">
                          <Heart size={20} /><MessageSquare size={20} /><Send size={20} />
                        </div>
                        <div className="text-xs leading-relaxed">
                          <span className="font-bold mr-2">niee8.official</span>
                          {instaPost.caption || 'Caption sẽ hiển thị ở đây...'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'orders' && (
              <motion.div 
                key="orders"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div className="flex justify-between items-end">
                  <div>
                    <h1 className="text-4xl font-serif italic text-nie8-text mb-2">Quản lý đơn hàng</h1>
                    <p className="text-nie8-text/40">Theo dõi và cập nhật trạng thái đơn hàng của khách.</p>
                  </div>
                  <button 
                    onClick={fetchOrders}
                    className="p-3 bg-white border border-nie8-primary/10 rounded-2xl text-nie8-text/60 hover:text-nie8-primary transition-colors"
                  >
                    <TrendingUp size={20} />
                  </button>
                </div>

                <div className="bg-white border border-nie8-primary/10 rounded-[40px] overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-nie8-bg/50 border-b border-nie8-primary/10">
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-nie8-text/40">Mã đơn</th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-nie8-text/40">Khách hàng</th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-nie8-text/40">Tổng tiền</th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-nie8-text/40">Trạng thái</th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-nie8-text/40 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-nie8-primary/5">
                      {isLoadingOrders ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center">
                            <Loader2 size={24} className="animate-spin mx-auto text-nie8-primary mb-2" />
                            <span className="text-xs text-nie8-text/40">Đang tải đơn hàng...</span>
                          </td>
                        </tr>
                      ) : orders.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-xs text-nie8-text/40">
                            Chưa có đơn hàng nào.
                          </td>
                        </tr>
                      ) : (
                        orders.map(order => (
                          <tr key={order.id} className="hover:bg-nie8-bg/20 transition-colors">
                            <td className="px-6 py-4 font-mono text-xs font-bold">#{order.id.slice(-8)}</td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="text-sm font-bold">{order.customer_name}</span>
                                <span className="text-[10px] text-nie8-text/40">{order.customer_phone}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm font-bold text-nie8-primary">
                              {new Intl.NumberFormat('vi-VN').format(order.total_amount)}đ
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(order.status)}`}>
                                {getStatusLabel(order.status)}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button 
                                onClick={() => setSelectedOrder(order)}
                                className="text-xs font-bold text-nie8-primary hover:underline"
                              >
                                Chi tiết
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div 
                key="settings"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-4xl space-y-12"
              >
                <div>
                  <h1 className="text-4xl font-serif italic text-nie8-text mb-2">Cài đặt</h1>
                  <p className="text-nie8-text/40">Tùy chỉnh giao diện và thông tin cửa hàng.</p>
                </div>

                <form onSubmit={handleSettingsSubmit} className="space-y-8">
                  <div className="bg-nie8-bg/30 p-8 rounded-[40px] border border-nie8-primary/5 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <label className="text-xs font-bold uppercase tracking-widest text-nie8-text/40">Hero Image</label>
                        <div className="aspect-video rounded-3xl overflow-hidden bg-white border border-nie8-primary/10 relative group">
                          {settingsForm.heroImage && <img src={settingsForm.heroImage} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />}
                          <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                            <Upload size={24} className="text-white" />
                            <input type="file" className="hidden" onChange={e => handleImageUpload(e, true)} />
                          </label>
                        </div>
                      </div>
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-nie8-text/40">Hero Title</label>
                          <input type="text" value={settingsForm.heroTitle || ''} onChange={e => setSettingsForm({...settingsForm, heroTitle: e.target.value})} className="w-full bg-white border border-nie8-primary/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-nie8-primary" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-nie8-text/40">Hero Subtitle</label>
                          <input type="text" value={settingsForm.heroSubtitle || ''} onChange={e => setSettingsForm({...settingsForm, heroSubtitle: e.target.value})} className="w-full bg-white border border-nie8-primary/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-nie8-primary" />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-nie8-text/40">Mô tả giới thiệu</label>
                      <textarea rows={4} value={settingsForm.heroDescription || ''} onChange={e => setSettingsForm({...settingsForm, heroDescription: e.target.value})} className="w-full bg-white border border-nie8-primary/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-nie8-primary resize-none" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-nie8-text/40">Tông màu chủ đạo (Theme)</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <button 
                            type="button"
                            onClick={() => setSettingsForm({...settingsForm, theme_mode: 'warm'})}
                            className={`p-4 rounded-2xl border-2 flex flex-col gap-2 transition-all ${settingsForm.theme_mode === 'warm' ? 'border-nie8-primary bg-white' : 'border-nie8-primary/10 hover:border-nie8-primary/30'}`}
                          >
                            <div className="w-full h-8 bg-[#F5EEE5] rounded-lg border border-black/5" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Warm Coffee</span>
                          </button>
                          <button 
                            type="button"
                            onClick={() => setSettingsForm({...settingsForm, theme_mode: 'slate'})}
                            className={`p-4 rounded-2xl border-2 flex flex-col gap-2 transition-all ${settingsForm.theme_mode === 'slate' ? 'border-[#3D4E61] bg-white' : 'border-nie8-primary/10 hover:border-nie8-primary/30'}`}
                          >
                            <div className="w-full h-8 bg-[#FAF3EB] rounded-lg border border-[#3D4E61]/20 flex gap-1 p-1">
                               <div className="w-full h-full bg-[#3D4E61] rounded" />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider">Slate Editorial</span>
                          </button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-nie8-text/40">Bố cục trang chủ (Layout)</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <button 
                            type="button"
                            onClick={() => setSettingsForm({...settingsForm, grid_mode: 'full-lookbook'})}
                            className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${settingsForm.grid_mode === 'full-lookbook' ? 'border-nie8-primary bg-white' : 'border-nie8-primary/10 hover:border-nie8-primary/30'}`}
                          >
                             <div className="w-12 h-10 border border-nie8-primary/20 rounded flex gap-1 p-1">
                                <div className="w-1/2 h-full bg-nie8-primary/20 rounded" />
                                <div className="flex flex-col gap-1 w-1/2">
                                   <div className="h-1/2 bg-nie8-primary/10 rounded" />
                                   <div className="h-1/2 bg-nie8-primary/10 rounded" />
                                </div>
                             </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-center">Full Lookbook</span>
                          </button>
                          <button 
                            type="button"
                            onClick={() => setSettingsForm({...settingsForm, grid_mode: 'mixed'})}
                            className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${settingsForm.grid_mode === 'mixed' ? 'border-nie8-primary bg-white' : 'border-nie8-primary/10 hover:border-nie8-primary/30'}`}
                          >
                             <div className="w-12 h-10 border border-nie8-primary/20 rounded grid grid-cols-2 gap-1 p-1">
                                <div className="bg-nie8-primary/20 rounded" />
                                <div className="bg-nie8-primary/20 rounded" />
                                <div className="bg-nie8-primary/10 rounded" />
                                <div className="bg-nie8-primary/10 rounded" />
                             </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-center">Mixed Grid</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                       <input 
                         type="checkbox" 
                         id="show_story"
                         checked={settingsForm.show_story}
                         onChange={(e) => setSettingsForm({...settingsForm, show_story: e.target.checked})}
                         className="w-4 h-4 rounded border-nie8-primary/20 text-nie8-primary focus:ring-nie8-primary"
                       />
                       <label htmlFor="show_story" className="text-sm font-medium text-nie8-text/70">Hiển thị trích dẫn Story trên lưới sản phẩm</label>
                    </div>
                  </div>
                  <button type="submit" className="px-12 py-4 bg-nie8-primary text-white rounded-full font-bold uppercase tracking-widest shadow-xl shadow-nie8-primary/20">Lưu thay đổi</button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Restock Modal */}
      <AnimatePresence>
        {showRestockModal && restockProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          >
            <div className="absolute inset-0 bg-nie8-text/20 backdrop-blur-sm" onClick={() => setShowRestockModal(false)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-nie8-primary/10 flex justify-between items-center">
                <h3 className="text-2xl font-serif italic text-nie8-text">Nhập kho</h3>
                <button onClick={() => setShowRestockModal(false)} className="w-10 h-10 bg-nie8-bg rounded-full flex items-center justify-center text-nie8-text/40 hover:text-nie8-text transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-8 overflow-y-auto scroll-hide">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden bg-nie8-bg flex-shrink-0">
                    <img src={restockProduct.images[0]} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div>
                    <h4 className="font-bold text-nie8-text">{restockProduct.name}</h4>
                    <p className="text-xs text-nie8-text/60 mt-1">Tồn kho hiện tại: {restockProduct.stock_quantity}</p>
                  </div>
                </div>

                <form id="restock-form" onSubmit={handleRestockSubmit} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-nie8-text/40">Size</label>
                      <select 
                        value={restockSize} 
                        onChange={e => setRestockSize(e.target.value)}
                        className="w-full bg-nie8-bg border border-nie8-primary/10 rounded-2xl px-4 py-3 focus:outline-none focus:border-nie8-primary text-sm font-medium"
                      >
                        {['S', 'M', 'L', 'XL'].map(s => (
                          <option key={s} value={s}>Size {s} (Hiện còn: {restockProduct.stock_by_size?.[s] || 0})</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-nie8-text/40">Số lượng nhập</label>
                      <input 
                        type="number" 
                        min="1"
                        required
                        value={restockQuantity || ''} 
                        onChange={e => setRestockQuantity(parseInt(e.target.value) || 0)}
                        className="w-full bg-nie8-bg border border-nie8-primary/10 rounded-2xl px-4 py-3 focus:outline-none focus:border-nie8-primary text-sm font-medium"
                        placeholder="VD: 50"
                      />
                    </div>
                  </div>

                </form>
              </div>
              
              <div className="p-8 border-t border-nie8-primary/10 bg-nie8-bg/30 flex gap-4">
                <button type="button" onClick={() => setShowRestockModal(false)} className="flex-1 py-4 bg-white text-nie8-text rounded-full font-bold uppercase tracking-widest border border-nie8-primary/10">Hủy</button>
                <button 
                  type="submit" 
                  form="restock-form"
                  disabled={isRestocking || restockQuantity <= 0}
                  className="flex-1 py-4 bg-green-500 text-white rounded-full font-bold uppercase tracking-widest shadow-lg shadow-green-500/30 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isRestocking ? <Loader2 size={16} className="animate-spin" /> : <PackagePlus size={16} />}
                  Xác nhận
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
