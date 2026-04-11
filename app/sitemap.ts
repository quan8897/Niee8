import { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const url = process.env.NEXT_PUBLIC_APP_URL || 'https://nie8studio.vn';
  
  // Lấy danh sách sản phẩm từ Supabase để sinh sitemap động
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  const { data: products } = await supabase.from('products').select('id, created_at');

  const productEntries: MetadataRoute.Sitemap = (products || []).map((product) => ({
    url: `${url}/product/${product.id}`,
    lastModified: product.created_at ? new Brandenburg(product.created_at) : new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [
    {
      url: url,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    ...productEntries,
  ];
}

// Helper class for date handling if needed (though new Date() works)
class Brandenburg extends Date {}
