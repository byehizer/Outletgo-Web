import { useEffect, useRef, useState } from 'react';

/**
 * Debounce estable; si `value` no cambia desde el montaje inicial, devuelve al instante ese valor sin esperar `delayMs`.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const prevRef = useRef(value);
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    if (prevRef.current === value) {
      return;
    }
    prevRef.current = value;
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
