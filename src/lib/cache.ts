/**
 * Simple in-memory + sessionStorage cache để giảm Firebase reads.
 * TTL mặc định: 5 phút cho products, 10 phút cho settings.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // ms
}

class AppCache {
  private memory = new Map<string, CacheEntry<unknown>>();

  // Ghi vào cả memory và sessionStorage
  set<T>(key: string, data: T, ttlMs = 5 * 60 * 1000): void {
    const entry: CacheEntry<T> = { data, timestamp: Date.now(), ttl: ttlMs };
    this.memory.set(key, entry as CacheEntry<unknown>);
    try {
      sessionStorage.setItem(`cache:${key}`, JSON.stringify(entry));
    } catch {
      // sessionStorage có thể bị block (incognito quota), bỏ qua
    }
  }

  // Đọc từ memory trước, fallback sessionStorage
  get<T>(key: string): T | null {
    // 1. Thử memory
    const memEntry = this.memory.get(key) as CacheEntry<T> | undefined;
    if (memEntry && Date.now() - memEntry.timestamp < memEntry.ttl) {
      return memEntry.data;
    }

    // 2. Thử sessionStorage (reload page nhưng chưa đóng tab)
    try {
      const raw = sessionStorage.getItem(`cache:${key}`);
      if (raw) {
        const entry = JSON.parse(raw) as CacheEntry<T>;
        if (Date.now() - entry.timestamp < entry.ttl) {
          // Warm lại memory
          this.memory.set(key, entry as CacheEntry<unknown>);
          return entry.data;
        }
        sessionStorage.removeItem(`cache:${key}`);
      }
    } catch {
      // ignore
    }
    return null;
  }

  invalidate(key: string): void {
    this.memory.delete(key);
    try { sessionStorage.removeItem(`cache:${key}`); } catch { /* ignore */ }
  }

  invalidatePrefix(prefix: string): void {
    for (const key of this.memory.keys()) {
      if (key.startsWith(prefix)) this.invalidate(key);
    }
    try {
      Object.keys(sessionStorage).forEach(k => {
        if (k.startsWith(`cache:${prefix}`)) sessionStorage.removeItem(k);
      });
    } catch { /* ignore */ }
  }
}

// Singleton — dùng chung toàn app
export const appCache = new AppCache();

// Cache keys cố định, tránh typo
export const CACHE_KEYS = {
  PRODUCTS: 'products:list',
  SITE_SETTINGS: 'site_settings:global',
  USER_ROLE: (uid: string) => `user:role:${uid}`,
} as const;

// TTL constants
export const CACHE_TTL = {
  PRODUCTS: 5 * 60 * 1000,      // 5 phút
  SITE_SETTINGS: 10 * 60 * 1000, // 10 phút
  USER_ROLE: 15 * 60 * 1000,     // 15 phút
} as const;
