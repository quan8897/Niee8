// Re-export singleton từ lib/supabase/client để tránh Multiple GoTrueClient warning
// Tất cả components trong src/ sẽ dùng chung 1 instance duy nhất này
export { getSupabaseClient as createSupabaseClient } from '@/lib/supabase/client';

import { getSupabaseClient } from '@/lib/supabase/client';

// Singleton export — dùng cho toàn bộ src/components cũ
export const supabase = getSupabaseClient();

