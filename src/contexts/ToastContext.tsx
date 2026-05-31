import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

import { ToastContainer } from '../components/Toast/ToastContainer';
import type { ToastContextType, ToastItem, ToastVariant } from '../types/toast';

const DEFAULT_DURATION_MS = 4000;
const MAX_TOASTS = 5;

export const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const clearToastTimeout = useCallback((id: string) => {
    const timer = timeoutsRef.current.get(id);
    if (timer != null) {
      clearTimeout(timer);
      timeoutsRef.current.delete(id);
    }
  }, []);

  const dismiss = useCallback(
    (id: string) => {
      clearToastTimeout(id);
      setToasts((prev) => prev.filter((t) => t.id !== id));
    },
    [clearToastTimeout],
  );

  const scheduleDismiss = useCallback(
    (id: string, duration: number) => {
      clearToastTimeout(id);
      const timer = setTimeout(() => dismiss(id), duration);
      timeoutsRef.current.set(id, timer);
    },
    [clearToastTimeout, dismiss],
  );

  const toast = useCallback(
    (message: string, variant: ToastVariant = 'success', duration: number = DEFAULT_DURATION_MS) => {
      const id = crypto.randomUUID();
      const item: ToastItem = { id, message, variant, duration };

      setToasts((prev) => {
        const next = [...prev, item];
        if (next.length <= MAX_TOASTS) {
          return next;
        }
        const discarded = next.slice(0, next.length - MAX_TOASTS);
        for (const discardedItem of discarded) {
          clearToastTimeout(discardedItem.id);
        }
        return next.slice(-MAX_TOASTS);
      });

      scheduleDismiss(id, duration);
    },
    [clearToastTimeout, scheduleDismiss],
  );

  useEffect(() => {
    const timeouts = timeoutsRef.current;
    return () => {
      for (const timer of timeouts.values()) {
        clearTimeout(timer);
      }
      timeouts.clear();
    };
  }, []);

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <ToastContainer toasts={toasts} onDismiss={dismiss} />,
        document.body,
      )}
    </ToastContext.Provider>
  );
}
