import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Trash2, Edit2, Save, Upload, Image as ImageIcon, Settings, Package, Loader2 } from 'lucide-react';
import { Product, SiteSettings } from '../types';
import { supabase } from '../lib/supabase';

interface AdminDashboardProps {
  products: Product[];
  siteSettings: SiteSettings | null;
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
  onUpdateSettings: (settings: SiteSettings) => void;
  onClose: () => void;
}

export default function AdminDashboard({ 
  products, 
  siteSettings,
  onAddProduct, 
  onUpdateProduct, 
  onDeleteProduct, 
  onUpdateSettings,
  onClose 
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'products' | 'settings'>('products');
  const [isAdding, setIsAdding] = useState(false);
  const [isBulkAdding, setIsBulkAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [bulkData, setBulkData] = useState('');
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isUploadingHero, setIsUploadingHero] = useState(false);
  const [uploadingImagesCount, setUploadingImagesCount] = useState(0);
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    price: '',
    images: [],
    description: '',
    category: 'Áo'
  });

  const [settingsForm, setSettingsForm] = useState<SiteSettings>(siteSettings || {
    heroImage: '',
    heroTitle: '',
    heroSubtitle: '',
    heroDescription: ''
  });

  // Format tiền VND
  const formatVND = (priceStr: string) => {
    const amount = parseFloat(priceStr.replace(/[^0-9]/g, ''));
    if (isNaN(amount)) return priceStr;
    return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
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
    setFormData({ name: '', price: '', images: [], description: '', category: 'Áo' });
  };

  const handleSettingsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isUploadingHero) {
      setImageError('Vui lòng chờ ảnh tải lên xong trước khi lưu.');
      return;
    }
    onUpdateSettings(settingsForm);
  };

  // ===== IMAGE OPTIMIZATION (AVIF/WebP) =====
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
        if (!ctx) {
          resolve(file);
          return;
        }
        ctx.drawImage(img, 0, 0);

        // Try AVIF first (Chrome 114+, Firefox 113+)
        canvas.toBlob((blobAvif) => {
          if (blobAvif && blobAvif.type === 'image/avif') {
            resolve(new File([blobAvif], file.name.replace(/\.[^/.]+$/, "") + ".avif", { type: 'image/avif' }));
          } else {
            // Fallback to WebP
            canvas.toBlob((blobWebp) => {
              if (blobWebp) {
                resolve(new File([blobWebp], file.name.replace(/\.[^/.]+$/, "") + ".webp", { type: 'image/webp' }));
              } else {
                resolve(file); // Fallback to original
              }
            }, 'image/webp', 0.85); // 85% quality
          }
        }, 'image/avif', 0.85);
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(file);
      };
      img.src = objectUrl;
    });
  };

  const handleHeroImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setImageError(`Ảnh ${file.name} quá lớn. Vui lòng chọn ảnh dưới 5MB.`);
      return;
    }

    setIsUploadingHero(true);
    try {
      // Optimize image before upload
      const optimizedFile = await processImage(file);
      const fileExt = optimizedFile.name.split('.').pop();
      const fileName = `hero_${Date.now()}.${fileExt}`;
      const filePath = `settings/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('image')
        .upload(filePath, optimizedFile);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('image').getPublicUrl(filePath);
      setSettingsForm(prev => ({ ...prev, heroImage: data.publicUrl }));
    } catch (error) {
      console.error('Upload error:', error);
      setImageError('Lỗi khi tải ảnh lên. Vui lòng thử lại.');
    } finally {
      setIsUploadingHero(false);
    }
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

  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setFormData(product);
    setIsAdding(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError(null);
    const files = e.target.files;
    if (!files) return;

    const validFiles = Array.from(files).filter((file: File) => {
      if (file.size > 5 * 1024 * 1024) {
        setImageError(prev => prev ? `${prev}\nẢnh ${file.name} quá lớn (>5MB).` : `Ảnh ${file.name} quá lớn (>5MB).`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setUploadingImagesCount(prev => prev + validFiles.length);

    for (const file of validFiles as File[]) {
      try {
        // Optimize image before upload
        const optimizedFile = await processImage(file);
        const fileExt = optimizedFile.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `products/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('image')
          .upload(filePath, optimizedFile);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('image').getPublicUrl(filePath);

        setFormData(prev => ({
          ...prev,
          images: [...(prev.images || []), data.publicUrl]
        }));
      } catch (error) {
        console.error('Upload error:', error);
        setImageError(prev => prev ? `${prev}\nLỗi tải ảnh ${file.name}.` : `Lỗi tải ảnh ${file.name}.`);
      } finally {
        setUploadingImagesCount(prev => prev - 1);
      }
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: (prev.images || []).filter((_, i) => i !== index)
    }));
  };

  const addImageUrl = (url: string) => {
    if (url.trim()) {
      setFormData(prev => ({
        ...prev,
        images: [...(prev.images || []), url.trim()]
      }));
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-nie8-bg w-full max-w-4xl rounded-[40px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div className="p-4 sm:p-8 border-b border-nie8-primary/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 relative">
          <div className="pr-12 sm:pr-0">
            <h2 className="text-2xl sm:text-3xl font-serif italic text-nie8-text">Quản trị <span className="text-nie8-primary">Website.</span></h2>
            <p className="text-xs sm:text-sm text-nie8-text/60 mt-1">Quản lý sản phẩm và nội dung hiển thị trên website.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <div className="bg-nie8-bg p-1 rounded-2xl flex gap-1 w-full sm:w-auto overflow-x-auto scroll-hide">
              <button 
                onClick={() => setActiveTab('products')}
                className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex-1 sm:flex-none whitespace-nowrap ${activeTab === 'products' ? 'bg-white text-nie8-primary shadow-sm' : 'text-nie8-text/40 hover:text-nie8-text'}`}
              >
                <Package size={14} />
                Sản phẩm
              </button>
              <button 
                onClick={() => setActiveTab('settings')}
                className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex-1 sm:flex-none whitespace-nowrap ${activeTab === 'settings' ? 'bg-white text-nie8-primary shadow-sm' : 'text-nie8-text/40 hover:text-nie8-text'}`}
              >
                <Settings size={14} />
                Cài đặt
              </button>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 sm:relative sm:top-auto sm:right-auto w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-full flex items-center justify-center text-nie8-text hover:bg-nie8-primary hover:text-white transition-all shadow-lg flex-shrink-0"
          >
            <X size={20} className="sm:w-6 sm:h-6" />
          </button>
        </div>

        <div className="flex-grow overflow-y-auto p-4 sm:p-8 scroll-hide">
          <AnimatePresence mode="wait">
            {activeTab === 'settings' ? (
              <motion.form 
                key="settings-form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onSubmit={handleSettingsSubmit}
                className="space-y-8"
              >
                <div className="bg-white p-8 rounded-3xl border border-nie8-primary/10 shadow-sm space-y-8">
                  <div>
                    <h3 className="text-xl font-serif italic text-nie8-text mb-6">Ảnh nền đầu trang (Hero Image)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="aspect-video rounded-3xl overflow-hidden bg-nie8-bg border border-nie8-primary/10 relative group">
                        {settingsForm.heroImage ? (
                          <img src={settingsForm.heroImage} alt="Hero Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-nie8-text/20">
                            <ImageIcon size={48} />
                          </div>
                        )}
                        <label className={`absolute inset-0 bg-black/40 ${isUploadingHero ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity flex items-center justify-center cursor-pointer`}>
                          <div className="bg-white px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                            {isUploadingHero ? (
                              <><Loader2 size={14} className="animate-spin" /> Đang tải lên...</>
                            ) : (
                              <><Upload size={14} /> Thay đổi ảnh</>
                            )}
                          </div>
                          <input type="file" className="hidden" accept="image/*" onChange={handleHeroImageUpload} disabled={isUploadingHero} />
                        </label>
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-nie8-text/40">URL Ảnh nền</label>
                          <input 
                            type="text" 
                            value={settingsForm.heroImage}
                            onChange={(e) => setSettingsForm({ ...settingsForm, heroImage: e.target.value })}
                            className="w-full bg-nie8-bg/50 border border-nie8-primary/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-nie8-primary transition-colors"
                            placeholder="Nhập URL ảnh hoặc tải lên"
                          />
                        </div>
                        <p className="text-xs text-nie8-text/40 leading-relaxed italic">
                          * Khuyên dùng ảnh có độ phân giải cao (1920x1080) để hiển thị tốt nhất trên mọi thiết bị.
                        </p>
                      </div>
                    </div>
                  </div>

                  {imageError && (
                    <div className="bg-red-50 text-red-500 p-4 rounded-2xl text-sm border border-red-100">
                      {imageError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-nie8-text/40">Tiêu đề chính (Title)</label>
                      <input 
                        type="text" 
                        value={settingsForm.heroTitle}
                        onChange={(e) => setSettingsForm({ ...settingsForm, heroTitle: e.target.value })}
                        className="w-full bg-nie8-bg/50 border border-nie8-primary/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-nie8-primary transition-colors"
                        placeholder="Ví dụ: niee8."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-nie8-text/40">Tiêu đề phụ (Subtitle)</label>
                      <input 
                        type="text" 
                        value={settingsForm.heroSubtitle}
                        onChange={(e) => setSettingsForm({ ...settingsForm, heroSubtitle: e.target.value })}
                        className="w-full bg-nie8-bg/50 border border-nie8-primary/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-nie8-primary transition-colors"
                        placeholder="Ví dụ: Minimalist Romantic & Craftsmanship"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-nie8-text/40">Mô tả giới thiệu</label>
                    <textarea 
                      rows={4}
                      value={settingsForm.heroDescription}
                      onChange={(e) => setSettingsForm({ ...settingsForm, heroDescription: e.target.value })}
                      className="w-full bg-nie8-bg/50 border border-nie8-primary/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-nie8-primary transition-colors resize-none"
                      placeholder="Viết đoạn giới thiệu ngắn về thương hiệu..."
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button 
                    type="submit"
                    className="px-12 py-4 bg-nie8-primary text-white rounded-full font-medium hover:bg-nie8-secondary transition-all flex items-center gap-2 shadow-xl shadow-nie8-primary/20"
                  >
                    <Save size={20} />
                    Lưu cài đặt website
                  </button>
                </div>
              </motion.form>
            ) : isBulkAdding ? (
              <motion.form 
                key="bulk-form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onSubmit={handleBulkSubmit}
                className="space-y-6 bg-white p-8 rounded-3xl border border-nie8-primary/10 shadow-sm"
              >
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-nie8-text/40">Dữ liệu JSON (Mảng sản phẩm)</label>
                  <textarea 
                    required
                    rows={10}
                    value={bulkData}
                    onChange={(e) => setBulkData(e.target.value)}
                    className="w-full bg-nie8-bg/50 border border-nie8-primary/10 rounded-2xl px-6 py-4 font-mono text-sm focus:outline-none focus:border-nie8-primary transition-colors resize-none"
                    placeholder={`[
  {
    "name": "Sản phẩm 1",
    "price": "250.000",
    "images": ["url1", "url2"],
    "category": "Áo",
    "description": "Mô tả..."
  }
]`}
                  />
                  {bulkError && <p className="text-red-500 text-xs mt-2">{bulkError}</p>}
                </div>
                <div className="flex gap-4">
                  <button 
                    type="submit"
                    className="flex-grow py-4 bg-nie8-primary text-white rounded-full font-medium hover:bg-nie8-secondary transition-all flex items-center justify-center gap-2 shadow-xl shadow-nie8-primary/20"
                  >
                    <Plus size={20} />
                    Thêm tất cả sản phẩm
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setIsBulkAdding(false);
                      setBulkData('');
                      setBulkError(null);
                    }}
                    className="px-10 py-4 border border-nie8-primary/20 text-nie8-text rounded-full font-medium hover:bg-white transition-all"
                  >
                    Hủy bỏ
                  </button>
                </div>
              </motion.form>
            ) : isAdding ? (
              <motion.form 
                key="form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onSubmit={handleSubmit}
                className="space-y-6 bg-white p-8 rounded-3xl border border-nie8-primary/10 shadow-sm"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-nie8-text/40">Tên sản phẩm</label>
                    <input 
                      required
                      type="text" 
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-nie8-bg/50 border border-nie8-primary/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-nie8-primary transition-colors"
                      placeholder="Ví dụ: Áo Sơ Mi Linen"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-nie8-text/40">Giá (VND)</label>
                    <input 
                      required
                      type="text" 
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-full bg-nie8-bg/50 border border-nie8-primary/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-nie8-primary transition-colors"
                      placeholder="Ví dụ: 250.000"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-nie8-text/40">Danh mục</label>
                    <select 
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full bg-nie8-bg/50 border border-nie8-primary/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-nie8-primary transition-colors appearance-none"
                    >
                      <option value="Áo">Áo</option>
                      <option value="Quần">Quần</option>
                      <option value="Váy">Váy</option>
                      <option value="Áo khoác">Áo khoác</option>
                      <option value="Phụ kiện">Phụ kiện</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-nie8-text/40">Hình ảnh (Thêm nhiều ảnh)</label>
                    <div className="space-y-4">
                      <div className="flex gap-4">
                        <input 
                          type="text" 
                          className="flex-grow bg-nie8-bg/50 border border-nie8-primary/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-nie8-primary transition-colors"
                          placeholder="Nhập URL hình ảnh và nhấn Enter"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addImageUrl((e.target as HTMLInputElement).value);
                              (e.target as HTMLInputElement).value = '';
                            }
                          }}
                        />
                        <label className={`cursor-pointer w-14 h-14 ${uploadingImagesCount > 0 ? 'bg-nie8-primary/50 cursor-not-allowed' : 'bg-nie8-primary hover:bg-nie8-secondary'} text-white rounded-2xl flex items-center justify-center transition-all flex-shrink-0`}>
                          {uploadingImagesCount > 0 ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
                          <input type="file" className="hidden" accept="image/*" multiple onChange={handleImageUpload} disabled={uploadingImagesCount > 0} />
                        </label>
                      </div>
                      
                      {uploadingImagesCount > 0 && (
                        <p className="text-xs text-nie8-primary animate-pulse">Đang tải lên {uploadingImagesCount} ảnh...</p>
                      )}

                      <div className="grid grid-cols-4 gap-4">
                        {formData.images?.map((img, idx) => (
                          <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group border border-nie8-primary/10">
                            <img src={img} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            <button 
                              type="button"
                              onClick={() => removeImage(idx)}
                              className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                      
                      {imageError && (
                        <div className="bg-red-50 text-red-500 p-4 rounded-2xl text-sm border border-red-100 mt-2">
                          {imageError}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-nie8-text/40">Mô tả sản phẩm</label>
                  <textarea 
                    required
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-nie8-bg/50 border border-nie8-primary/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-nie8-primary transition-colors resize-none"
                    placeholder="Viết mô tả ngắn gọn và cảm xúc về sản phẩm..."
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button 
                    type="submit"
                    className="flex-grow py-4 bg-nie8-primary text-white rounded-full font-medium hover:bg-nie8-secondary transition-all flex items-center justify-center gap-2 shadow-xl shadow-nie8-primary/20"
                  >
                    <Save size={20} />
                    {editingId ? 'Cập nhật sản phẩm' : 'Đăng sản phẩm'}
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setIsAdding(false);
                      setEditingId(null);
                      setFormData({ name: '', price: '', images: [], description: '', category: 'Áo' });
                    }}
                    className="px-10 py-4 border border-nie8-primary/20 text-nie8-text rounded-full font-medium hover:bg-white transition-all"
                  >
                    Hủy bỏ
                  </button>
                </div>
              </motion.form>
            ) : (
              <motion.div 
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                <div className="flex gap-4">
                  <button 
                    onClick={() => setIsAdding(true)}
                    className="flex-grow py-6 border-2 border-dashed border-nie8-primary/20 rounded-[30px] flex flex-col items-center justify-center gap-3 text-nie8-text/40 hover:border-nie8-primary/40 hover:text-nie8-primary transition-all group"
                  >
                    <div className="w-12 h-12 bg-nie8-primary/5 rounded-full flex items-center justify-center group-hover:bg-nie8-primary/10 transition-all">
                      <Plus size={24} />
                    </div>
                    <span className="font-medium">Thêm sản phẩm</span>
                  </button>
                  <button 
                    onClick={() => setIsBulkAdding(true)}
                    className="flex-grow py-6 border-2 border-dashed border-nie8-primary/20 rounded-[30px] flex flex-col items-center justify-center gap-3 text-nie8-text/40 hover:border-nie8-primary/40 hover:text-nie8-primary transition-all group"
                  >
                    <div className="w-12 h-12 bg-nie8-primary/5 rounded-full flex items-center justify-center group-hover:bg-nie8-primary/10 transition-all">
                      <Upload size={24} />
                    </div>
                    <span className="font-medium">Đăng nhiều sản phẩm</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {products.map((product) => (
                    <div 
                      key={product.id}
                      className="bg-white p-5 rounded-[30px] border border-nie8-primary/10 flex flex-col sm:flex-row items-start sm:items-center gap-6 group hover:shadow-xl hover:border-nie8-primary/30 transition-all"
                    >
                      {/* Hiển thị ảnh đại diện sản phẩm rõ ràng hơn */}
                      <div className="w-full sm:w-32 h-32 rounded-2xl overflow-hidden bg-nie8-bg flex-shrink-0 relative shadow-sm">
                        {product.images && product.images.length > 0 ? (
                          <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-nie8-text/20">
                            <ImageIcon size={32} />
                          </div>
                        )}
                        <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest text-nie8-primary shadow-sm">
                          {product.images?.length || 0} Ảnh
                        </div>
                      </div>

                      {/* Thông tin sản phẩm */}
                      <div className="flex-grow w-full">
                        <p className="text-[10px] text-nie8-secondary font-bold uppercase tracking-widest mb-1">{product.category}</p>
                        <h4 className="text-xl font-serif italic text-nie8-text mb-2">{product.name}</h4>
                        <p className="text-lg font-medium text-nie8-primary">{formatVND(product.price)}</p>
                      </div>

                      {/* Khu vực nút hành động được tách biệt rõ ràng */}
                      <div className="w-full sm:w-auto flex sm:flex-col gap-2 pt-4 sm:pt-0 border-t sm:border-t-0 sm:border-l border-nie8-primary/10 sm:pl-6">
                        <button 
                          onClick={() => handleEdit(product)}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-nie8-primary/5 text-nie8-primary rounded-xl hover:bg-nie8-primary hover:text-white transition-all text-sm font-medium"
                        >
                          <Edit2 size={16} />
                          <span>Chỉnh sửa</span>
                        </button>
                        <button 
                          onClick={() => onDeleteProduct(product.id)}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all text-sm font-medium"
                        >
                          <Trash2 size={16} />
                          <span>Xóa</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
