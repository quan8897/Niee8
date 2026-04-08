import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Star, Quote } from 'lucide-react';
import { Feedback as FeedbackType } from '../types';
import { supabase } from '../lib/supabase';

const INITIAL_FEEDBACKS: FeedbackType[] = [
  {
    id: '1',
    user: 'Linh Nguyễn',
    text: 'Chất liệu lụa của NIE8 thực sự tuyệt vời! Tôi đã mua một chiếc sơ mi và nó vượt xa mong đợi của tôi về cả phom dáng lẫn cảm giác khi mặc.',
    avatar: 'https://i.pravatar.cc/150?u=linh'
  },
  {
    id: '2',
    user: 'Thảo Phạm',
    text: 'Món quà hoàn hảo cho bản thân. Những thiết kế tối giản nhưng cực kỳ sang trọng, rất dễ phối đồ cho nhiều dịp khác nhau.',
    avatar: 'https://i.pravatar.cc/150?u=thao'
  },
  {
    id: '3',
    user: 'Minh Anh',
    text: 'Tôi yêu phong cách của NIE8! Nó mang lại cảm giác thanh lịch và hiện đại. Chất lượng gia công tỉ mỉ đến từng chi tiết nhỏ nhất.',
    avatar: 'https://i.pravatar.cc/150?u=minh'
  }
];

export default function Feedback() {
  const [feedbacks, setFeedbacks] = useState<FeedbackType[]>(INITIAL_FEEDBACKS);

  useEffect(() => {
    let isMounted = true;
    const fetchFeedbacks = async () => {
      try {
        const { data, error } = await supabase
          .from('feedbacks')
          .select('*')
          .limit(10);
        
        if (error) throw error;
        if (!isMounted) return;
        
        if (data && data.length > 0) {
          setFeedbacks(data as FeedbackType[]);
        }
      } catch (error) {
        console.error('Error fetching feedbacks:', error);
      }
    };

    fetchFeedbacks();
    return () => { isMounted = false; };
  }, []);

  return (
    <section className="py-24 bg-nie8-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.span 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="text-nie8-accent text-xs font-medium tracking-[0.3em] uppercase mb-4 block"
          >
            Đánh giá từ khách hàng
          </motion.span>
          <h2 className="text-4xl md:text-5xl font-serif italic text-nie8-tan mb-6">Trải nghiệm NIE8</h2>
          <p className="text-nie8-tan/60 max-w-lg mx-auto">Những chia sẻ chân thực từ cộng đồng yêu mến phong cách tối giản của chúng tôi.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {feedbacks.map((feedback, index) => (
            <motion.div 
              key={feedback.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="bg-white p-10 rounded-[40px] shadow-2xl shadow-nie8-tan/5 relative overflow-hidden group border border-nie8-beige/10"
            >
              <div className="absolute top-0 right-0 p-6 text-nie8-beige/10 group-hover:text-nie8-beige/20 transition-colors">
                <Quote size={80} />
              </div>
              
              <div className="flex gap-1 mb-8">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={14} fill="#D2B48C" color="#D2B48C" />
                ))}
              </div>

              <p className="text-nie8-tan/80 italic mb-10 leading-relaxed relative z-10 font-serif text-lg">
                "{feedback.text}"
              </p>

              <div className="flex items-center gap-4">
                <img 
                  src={feedback.avatar} 
                  alt={feedback.user} 
                  className="w-14 h-14 rounded-full object-cover border-2 border-nie8-beige/20"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h4 className="font-serif text-nie8-tan font-semibold text-lg">{feedback.user}</h4>
                  <p className="text-[10px] text-nie8-accent uppercase tracking-widest font-bold">Khách hàng thân thiết</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
