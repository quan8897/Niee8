import { createClient } from '@/lib/supabase/server';
import { Product, SiteSettings } from '@/types';
import StoreClient from './StoreClient';

// Server Component — fetch data trực tiếp, không cần useEffect
export default async function HomePage() {
  const supabase = await createClient();

  // Fetch products & settings song song trên Server
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

  const products: Product[] = productsRes.data || [];
  const settings: SiteSettings | null = settingsRes.data || null;

  return <StoreClient initialProducts={products} initialSettings={settings} />;
}
