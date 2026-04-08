import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Music, ShoppingBag, RefreshCw, Heart, Pause, Play as PlayIcon } from 'lucide-react';

interface MoodOption {
  id: string;
  label: string;
  emoji: string;
  description: string;
  outfit: {
    name: string;
    image: string;
    price: string;
  };
  playlist: {
    title: string;
    url: string;
    audioSrc: string;
  };
}

const moods: MoodOption[] = [
  {
    id: 'peaceful',
    label: 'Bình yên',
    emoji: '🌿',
    description: 'Một ngày nhẹ nhàng, tĩnh lặng để kết nối với bản thân.',
    outfit: {
      name: 'Váy Trắng Hai Dây Yjia',
      image: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?q=80&w=600&auto=format&fit=crop',
      price: '450000'
    },
    playlist: {
      title: 'Acoustic Morning Coffee',
      url: '#',
      audioSrc: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
    }
  },
  {
    id: 'excited',
    label: 'Hào hứng',
    emoji: '✨',
    description: 'Năng lượng tràn đầy cho những cuộc gặp gỡ mới.',
    outfit: {
      name: 'Len Lông Thỏ & Chân Váy Xếp Ly',
      image: 'https://images.unsplash.com/photo-1539109132314-34a77ae68c44?q=80&w=600&auto=format&fit=crop',
      price: '520000'
    },
    playlist: {
      title: 'Upbeat Indie Pop Vibes',
      url: '#',
      audioSrc: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3'
    }
  },
  {
    id: 'nostalgic',
    label: 'Hoài niệm',
    emoji: '📜',
    description: 'Tìm về những ký ức xưa cũ qua từng nếp vải.',
    outfit: {
      name: 'Sơ Mi Ren Hoa Nhí Vintage',
      image: 'https://images.unsplash.com/photo-1551163943-3f6a855d1153?q=80&w=600&auto=format&fit=crop',
      price: '380000'
    },
    playlist: {
      title: 'Classic Jazz & Soul',
      url: '#',
      audioSrc: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3'
    }
  }
];

export default function MoodConsultant() {
  const [selectedMood, setSelectedMood] = useState<MoodOption | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Format tiền VND
  const formatVND = (priceStr: string) => {
    const amount = parseFloat(priceStr.replace(/[^0-9]/g, ''));
    if (isNaN(amount)) return priceStr;
    return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
  };

  const handleMoodSelect = (mood: MoodOption) => {
    setIsProcessing(true);
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
    // Simulate AI processing
    setTimeout(() => {
      setSelectedMood(mood);
      setIsProcessing(false);
    }, 800);
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <section className="py-24 bg-nie8-bg relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.span 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="text-nie8-secondary text-xs font-medium tracking-[0.3em] uppercase mb-4 block"
          >
            Trải nghiệm Cá nhân hóa
          </motion.span>
          <h2 className="text-4xl md:text-5xl font-serif italic text-nie8-text mb-6">Tâm trạng của bạn hôm nay?</h2>
          <p className="text-nie8-text/60 max-w-lg mx-auto">Hãy chọn một cảm xúc, nie8 sẽ giúp bạn tìm thấy bộ trang phục và giai điệu hoàn hảo nhất.</p>
        </div>

        <div className="flex flex-wrap justify-center gap-6 mb-16">
          {moods.map((mood) => (
            <button
              key={mood.id}
              onClick={() => handleMoodSelect(mood)}
              className={`px-8 py-4 rounded-full border transition-all duration-500 flex items-center gap-3 ${
                selectedMood?.id === mood.id 
                ? 'bg-nie8-primary text-white border-nie8-primary shadow-xl' 
                : 'bg-white text-nie8-text border-nie8-primary/10 hover:border-nie8-primary'
              }`}
            >
              <span className="text-xl">{mood.emoji}</span>
              <span className="font-medium">{mood.label}</span>
            </button>
          ))}
        </div>

        <div className="min-h-[500px] flex items-center justify-center">
          <AnimatePresence mode="wait">
            {isProcessing ? (
              <motion.div 
                key="loader"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4"
              >
                <RefreshCw className="animate-spin text-nie8-primary" size={40} />
                <p className="text-sm font-serif italic text-nie8-text/40 tracking-widest">Đang tìm kiếm cảm hứng...</p>
              </motion.div>
            ) : selectedMood ? (
              <motion.div 
                key="result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center w-full"
              >
                <div className="relative aspect-[3/4] rounded-[40px] overflow-hidden shadow-2xl">
                  <img 
                    src={selectedMood.outfit.image} 
                    alt={selectedMood.outfit.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-nie8-text/40 to-transparent"></div>
                  <div className="absolute bottom-8 left-8 right-8 text-white">
                    <p className="text-xs uppercase tracking-widest mb-2 opacity-80">Gợi ý cho bạn</p>
                    <h3 className="text-2xl font-serif italic">{selectedMood.outfit.name}</h3>
                  </div>
                </div>

                <div className="space-y-8">
                  <div>
                    <h3 className="text-3xl font-serif italic text-nie8-text mb-4">{selectedMood.label}</h3>
                    <p className="text-nie8-text/60 leading-relaxed">{selectedMood.description}</p>
                  </div>

                  <div className="bg-white p-8 rounded-[30px] border border-nie8-primary/10 shadow-xl shadow-nie8-text/5">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-nie8-primary/10 rounded-full flex items-center justify-center text-nie8-primary">
                        <Music size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-nie8-secondary mb-1">Giai điệu đi kèm</p>
                        <h4 className="font-medium text-nie8-text">{selectedMood.playlist.title}</h4>
                      </div>
                    </div>
                    
                    <audio 
                      ref={audioRef} 
                      src={selectedMood.playlist.audioSrc} 
                      onEnded={() => setIsPlaying(false)}
                    />
                    
                    <button 
                      onClick={togglePlay}
                      className="w-full py-3 border border-nie8-primary/20 rounded-xl text-sm font-medium hover:bg-nie8-primary hover:text-white transition-all flex items-center justify-center gap-2"
                    >
                      {isPlaying ? (
                        <><Pause size={16} /> Tạm dừng nhạc</>
                      ) : (
                        <><PlayIcon size={16} /> Nghe nhạc ngay</>
                      )}
                    </button>
                  </div>

                  <div className="flex gap-4">
                    <button className="flex-grow py-4 bg-nie8-primary text-white rounded-full font-medium hover:bg-nie8-secondary transition-all flex items-center justify-center gap-2 shadow-xl shadow-nie8-primary/20">
                      <ShoppingBag size={18} />
                      Thêm vào giỏ hàng • {formatVND(selectedMood.outfit.price)}
                    </button>
                    <button className="w-14 h-14 border border-nie8-primary/20 rounded-full flex items-center justify-center text-nie8-text hover:bg-nie8-primary hover:text-white transition-all">
                      <Heart size={20} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center opacity-20"
              >
                <Sparkles size={80} className="mx-auto mb-4" />
                <p className="font-serif italic text-xl">Chọn một cảm xúc để bắt đầu</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

function Sparkles({ size, className }: { size: number, className?: string }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );
}
