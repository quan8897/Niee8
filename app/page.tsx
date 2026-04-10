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

    return <StoreClient initialProducts={products} initialSettings={settings} />;
  } catch (error) {
    console.error('Core Page Error:', error);
    // Trả về giao diện trống an toàn thay vì crash 500
    return <StoreClient initialProducts={[]} initialSettings={null} />;
  }
}
