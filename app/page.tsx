import { createClient } from '@/lib/supabase/server';
import { Product, SiteSettings } from '@/types';
import StoreClient from './StoreClient';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  try {
    const supabase = await createClient();

    // Fetch dữ liệu an toàn
    const [productsRes, settingsRes] = await Promise.all([
      supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(24),
      supabase
        .from('site_settings')
        .select('*')
        .eq('id', 'global')
        .single(),
    ]);

    const products: Product[] = productsRes?.data || [];
    const settings: SiteSettings | null = settingsRes?.data || null;

    // Dữ liệu cấu trúc JSON-LD cho toàn bộ danh mục sản phẩm (Tối ưu SEO)
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      'name': 'Bộ sưu tập Thời trang NIE8 Studio',
      'description': 'Khám phá các thiết kế Minimalist thanh lịch, tinh tế dành cho phái đẹp tại NIE8.',
      'itemListElement': products.map((product, index) => ({
        '@type': 'ListItem',
        'position': index + 1,
        'item': {
          '@type': 'Product',
          'url': `https://nie8studio.vn/product/${product.id}`,
          'name': product.name,
          'image': product.images[0],
          'description': product.description,
          'offers': {
            '@type': 'Offer',
            'price': product.price,
            'priceCurrency': 'VND',
            'availability': 'https://schema.org/InStock'
          }
        }
      }))
    };

    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <StoreClient initialProducts={products} initialSettings={settings} />
      </>
    );
  } catch (error) {
    console.error('Core Page Error:', error);
    // Trả về giao diện trống an toàn thay vì crash 500
    return <StoreClient initialProducts={[]} initialSettings={null} />;
  }
}
