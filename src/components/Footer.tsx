import { Instagram, Facebook, Mail, Phone, MapPin, Music } from 'lucide-react';
import ZaloIcon from './icons/ZaloIcon';
import TikTokIcon from './icons/TikTokIcon';

interface FooterProps {
  onAdminLogin?: () => void;
}

export default function Footer({ onAdminLogin }: FooterProps) {
  return (
    <footer className="bg-nie8-bg text-nie8-text py-8 border-t border-nie8-primary/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          <div className="col-span-1 md:col-span-2 lg:col-span-1">
            <h2 className="text-2xl font-serif italic text-nie8-text mb-2 tracking-tighter lowercase">nie8</h2>
            <p className="text-[10px] text-nie8-primary font-medium uppercase tracking-widest mb-4">Minimalist Romantic & Craftsmanship</p>
            <p className="text-nie8-text/80 mb-6 leading-relaxed text-xs">
              Nơi phong cách gặp gỡ sự vô tận. Chúng tôi tin vào vẻ đẹp của sự tối giản và chất lượng bền bỉ theo thời gian.
            </p>
            <div className="flex gap-4">
              <a href="https://www.instagram.com/nie8.studio/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="w-8 h-8 rounded-full border border-nie8-text/10 flex items-center justify-center hover:bg-nie8-primary hover:text-white transition-all text-nie8-text/60">
                <Instagram size={14} />
              </a>
              <a href="https://www.facebook.com/" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="w-8 h-8 rounded-full border border-nie8-text/10 flex items-center justify-center hover:bg-nie8-primary hover:text-white transition-all text-nie8-text/60">
                <Facebook size={14} />
              </a>
              <a href="https://zalo.me/" target="_blank" rel="noopener noreferrer" aria-label="Zalo" className="w-8 h-8 rounded-full border border-nie8-text/10 flex items-center justify-center hover:bg-nie8-primary hover:text-white transition-all text-nie8-text/60">
                <ZaloIcon size={14} />
              </a>
              <a href="https://www.tiktok.com/@nie8.studio" target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="w-8 h-8 rounded-full border border-nie8-text/10 flex items-center justify-center hover:bg-nie8-primary hover:text-white transition-all text-nie8-text/60">
                <TikTokIcon size={14} className="fill-current" />
              </a>
            </div>
 Broadway minimalism
          </div>

          <div>
            <h4 className="text-[10px] uppercase tracking-[0.2em] font-semibold mb-4">Bộ sưu tập</h4>
            <ul className="space-y-2 text-nie8-text/60 text-xs">
              <li><a href="#" className="hover:text-nie8-primary transition-colors">Xuân Hè 2024</a></li>
              <li><a href="#" className="hover:text-nie8-primary transition-colors">Đồ cơ bản</a></li>
              <li><a href="#" className="hover:text-nie8-primary transition-colors">Dòng sản phẩm Lụa</a></li>
              <li><a href="#" className="hover:text-nie8-primary transition-colors">Hàng mới về</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-[10px] uppercase tracking-[0.2em] font-semibold mb-4">Hỗ trợ</h4>
            <ul className="space-y-2 text-nie8-text/60 text-xs">
              <li><a href="#" className="hover:text-nie8-primary transition-colors">Giao hàng & Trả hàng</a></li>
              <li><a href="#" className="hover:text-nie8-primary transition-colors">Hướng dẫn chọn size</a></li>
              <li><a href="#" className="hover:text-nie8-primary transition-colors">Tính bền vững</a></li>
              <li><button onClick={onAdminLogin} className="hover:text-nie8-primary transition-colors">Quản trị viên</button></li>
            </ul>
          </div>

          <div>
            <h4 className="text-[10px] uppercase tracking-[0.2em] font-semibold mb-4 text-nie8-primary">Liên hệ</h4>
            <ul className="space-y-2 text-nie8-text/80 text-xs">
              <li className="flex items-start gap-2">
                <MapPin size={14} className="text-nie8-primary mt-0.5" />
                <span>123 Đường Thời Trang, Quận 1, TP. Hồ Chí Minh</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone size={14} className="text-nie8-primary" />
                <span>+84 123 456 789</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={14} className="text-nie8-primary" />
                <span>hello@nie8studio.vn</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-nie8-primary/10 flex flex-col md:flex-row justify-between items-center gap-4 text-[9px] uppercase tracking-[0.2em] text-nie8-text/70">
          <p>© 2024 nie8. Tất cả quyền được bảo lưu.</p>
          <div className="flex gap-8">
            <a href="#" className="hover:text-nie8-primary transition-colors">Chính sách bảo mật</a>
            <a href="#" className="hover:text-nie8-text transition-colors">Điều khoản dịch vụ</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

