'use client';

import { createBrowserClient } from '@supabase/ssr';

// Dùng globalThis để đảm bảo chỉ tạo 1 instance duy nhất
// Tránh lỗi "Multiple GoTrueClient instances detected"
const SUPABASE_GLOBAL_KEY = '__niee8_supabase_client__';

type SupabaseClient = ReturnType<typeof createBrowserClient>;

function createClient(): SupabaseClient {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export function getSupabaseClient(): SupabaseClient {
  if (typeof window === 'undefined') {
    // Server-side: tạo mới mỗi request (không cache)
    return createClient();
  }

  // Client-side: dùng chung 1 instance lưu trên window
  const win = window as typeof window & { [SUPABASE_GLOBAL_KEY]?: SupabaseClient };
  if (!win[SUPABASE_GLOBAL_KEY]) {
    win[SUPABASE_GLOBAL_KEY] = createClient();
  }
  return win[SUPABASE_GLOBAL_KEY]!;
}

