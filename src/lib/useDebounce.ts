import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * Trả về một hàm debounced — chỉ gọi `fn` sau khi ngừng gọi trong `delay` ms.
 * Dùng cho: ghi localStorage, search input, resize handler...
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useDebounce<T extends (...args: any[]) => void>(fn: T, delay: number): T {
  const fnRef = useRef(fn);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { fnRef.current = fn; });

  const debounced = useCallback((...args: Parameters<T>) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      fnRef.current(...args);
    }, delay);
  }, [delay]) as T;

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return debounced;
}

/**
 * Debounce một giá trị state — trả về giá trị chỉ sau khi ngừng thay đổi trong `delay` ms.
 * Dùng cho: filter/search không muốn re-render mỗi keystroke.
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
