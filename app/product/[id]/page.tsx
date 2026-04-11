import { createClient } from '@/lib/supabase/server';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Product } from '@/types';

interface ProductPageProps {
  params: { id: string };
}

// 1. Sinh Metadata động chuẩn SEO cho từng sản phẩm
export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const supabase = await createClient();
  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!product) return { title: 'Sản phẩm không tồn tại — NIE8' };

  const cleanPrice = new Intl.NumberFormat('vi-VN').format(Number(product.price)) + 'đ';

  return {
    title: `${product.name} — Thời trang Minimalist`,
    description: `${product.description} · Giá: ${cleanPrice}. Khám phá tinh thần Minimalism tại NIE8.`,
    openGraph: {
      title: `${product.name} | NIE8 studio`,
      description: product.description,
      images: [product.images[0]],
      type: 'article',
    },
    alternates: {
      canonical: `https://nie8studio.vn/product/${product.id}`,
    }
  };
}

// 2. Trang Rendering (SSR) - Tối ưu cho Google Bot
export default async function ProductPage({ params }: ProductPageProps) {
  const supabase = await createClient();
  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!product) notFound();

  // Dữ liệu cấu trúc JSON-LD giúp hiển thị Rich Snippets (Giá, Ảnh) trên Google
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: product.images,
    description: product.description,
    brand: {
      '@type': 'Brand',
      name: 'NIE8'
    },
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'VND',
      availability: (product.stock_quantity || 0) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `https://nie8studio.vn/product/${product.id}`
    }
  };

  return (
    <main className="min-h-screen bg-nie8-bg py-24 px-4 overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Gallery */}
        <div className="space-y-4">
          {product.images.map((img: string, i: number) => (
            <div key={i} className="aspect-[3/4] rounded-[40px] overflow-hidden shadow-sm">
              <img src={img} alt={`${product.name} - View ${i+1}`} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="space-y-8 sticky top-24 h-fit">
          <div className="space-y-2">
            <h1 className="text-4xl sm:text-5xl font-serif italic text-nie8-text">{product.name}</h1>
            <p className="text-2xl font-bold text-nie8-primary">
              {new Intl.NumberFormat('vi-VN').format(Number(product.price))}đ
            </p>
          </div>

          <div className="prose prose-stone">
            <p className="text-nie8-text/70 leading-relaxed italic border-l-4 border-nie8-primary pl-4">
              "{product.story_content}"
            </p>
            <p className="text-nie8-text/60 leading-relaxed">
              {product.description}
            </p>
          </div>

          <a 
            href="/" 
            className="inline-block px-12 py-5 bg-nie8-text text-white rounded-full font-bold uppercase tracking-widest text-xs hover:bg-nie8-primary transition-all shadow-xl shadow-nie8-text/10"
          >
            Về Trang Chủ để Mua Hàng
          </a>
          
          <p className="text-[10px] text-nie8-text/30 uppercase tracking-[0.2em]">
            Free Shipping · 7 Days Returns · Minimalist Lifestyle
          </p>
        </div>
      </div>
    </main>
  );
}
