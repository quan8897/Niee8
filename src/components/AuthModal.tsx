import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, Loader2, User as UserIcon, ArrowRight, Chrome } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (loginError) throw loginError;
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;
        alert('Vui lòng kiểm tra email để xác nhận tài khoản!');
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Đã có lỗi xảy ra.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error: googleError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (googleError) throw googleError;
    } catch (err: any) {
      setError(err.message || 'Lỗi đăng nhập Google.');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white w-full max-w-md rounded-[40px] overflow-hidden shadow-2xl relative"
          >
            <button
              onClick={onClose}
              className="absolute top-6 right-6 w-10 h-10 bg-nie8-bg rounded-full flex items-center justify-center text-nie8-text hover:bg-nie8-primary hover:text-white transition-all z-10"
            >
              <X size={20} />
            </button>

            <div className="p-8 sm:p-12">
              <div className="flex flex-col items-center text-center mb-10">
                <div className="w-16 h-16 bg-nie8-primary/10 rounded-3xl flex items-center justify-center text-nie8-primary mb-6">
                  <UserIcon size={32} />
                </div>
                <h2 className="text-3xl font-serif italic text-nie8-text mb-2">
                  {isLogin ? 'Đăng nhập' : 'Tạo tài khoản'}
                </h2>
                <p className="text-sm text-nie8-text/50">
                  {isLogin ? 'Chào mừng bạn quay trở lại với niee8.' : 'Tham gia cộng đồng niee8 ngay hôm nay.'}
                </p>
              </div>

              <div className="space-y-4 mb-8">
                <button
                  onClick={handleGoogleLogin}
                  className="w-full py-4 bg-white border border-nie8-primary/10 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-nie8-bg transition-all flex items-center justify-center gap-3 shadow-sm"
                >
                  <Chrome size={18} className="text-red-500" />
                  Tiếp tục với Google
                </button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-nie8-primary/5"></div></div>
                  <div className="relative flex justify-center text-[10px] uppercase tracking-[0.2em]"><span className="bg-white px-4 text-nie8-text/20">Hoặc dùng Email</span></div>
                </div>
              </div>

              <form onSubmit={handleEmailAuth} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-nie8-text/40 ml-4">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-nie8-text/30" size={18} />
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-nie8-bg border border-nie8-primary/5 rounded-full pl-14 pr-6 py-4 focus:outline-none focus:border-nie8-primary transition-colors text-sm"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-nie8-text/40 ml-4">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-nie8-text/30" size={18} />
                    <input
                      required
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-nie8-bg border border-nie8-primary/5 rounded-full pl-14 pr-6 py-4 focus:outline-none focus:border-nie8-primary transition-colors text-sm"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                {error && (
                  <motion.p
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-xs text-red-500 text-center font-medium"
                  >
                    {error}
                  </motion.p>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-5 bg-nie8-text text-white rounded-full font-bold text-xs uppercase tracking-widest hover:bg-nie8-primary transition-all shadow-xl shadow-nie8-primary/10 flex items-center justify-center gap-3 group disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <>
                      {isLogin ? 'Đăng nhập' : 'Đăng ký tài khoản'}
                      <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-8 text-center">
                <button
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-[10px] font-bold uppercase tracking-widest text-nie8-primary hover:text-nie8-secondary transition-colors"
                >
                  {isLogin ? 'Chưa có tài khoản? Đăng ký ngay' : 'Đã có tài khoản? Đăng nhập'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
