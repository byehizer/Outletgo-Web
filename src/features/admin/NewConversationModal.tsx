import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Search, X } from 'lucide-react';
import { useEffect, useId, useReducer, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { registerDevSupportConversation, sendAdminSupportMessage } from '../chat/chatApi';
import { fetchSellerAccounts } from './sellersApi';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useToast } from '../../hooks/useToast';
import { ApiError } from '../../lib/http/apiClient';

const formSchema = z.object({
  message: z.string().trim().min(1, 'Escribí el primer mensaje.'),
});

type FormValues = z.infer<typeof formSchema>;

type StoreOption = {
  storeId: string;
  businessName: string;
  sellerEmail: string;
  sellerName: string | null;
};

type StoreSearchUiState = {
  options: StoreOption[];
  loading: boolean;
  hasSearched: boolean;
};

type StoreSearchAction =
  | { type: 'FETCH_BEGIN' }
  | { type: 'FETCH_OK'; payload: StoreOption[] }
  | { type: 'FETCH_ERR' }
  | { type: 'RESET' };

function storeSearchReducer(state: StoreSearchUiState, action: StoreSearchAction): StoreSearchUiState {
  switch (action.type) {
    case 'FETCH_BEGIN':
      return { ...state, loading: true, hasSearched: false };
    case 'FETCH_OK':
      return { options: action.payload, loading: false, hasSearched: true };
    case 'FETCH_ERR':
      return { options: [], loading: false, hasSearched: true };
    case 'RESET':
      return { options: [], loading: false, hasSearched: false };
    default:
      return state;
  }
}

export type NewConversationModalProps = {
  open: boolean;
  onClose: () => void;
  onStarted: (storeId: string, businessName: string) => void;
};

export function NewConversationModal({
  open,
  onClose,
  onStarted,
}: NewConversationModalProps) {
  const { success } = useToast();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  const [selectedStore, setSelectedStore] = useState<StoreOption | null>(null);
  const [storeDraft, setStoreDraft] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchState, dispatchSearch] = useReducer(storeSearchReducer, {
    options: [],
    loading: false,
    hasSearched: false,
  });
  const [submitError, setSubmitError] = useState<string | null>(null);

  const debouncedDraft = useDebouncedValue(storeDraft, 400);
  const hasSelection = selectedStore !== null;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { message: '' },
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    setSelectedStore(null);
    setStoreDraft('');
    setDropdownOpen(false);
    dispatchSearch({ type: 'RESET' });
    reset({ message: '' });
    setSubmitError(null);
  }, [open, reset]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const previous = document.activeElement as HTMLElement | null;
    const root = panelRef.current;
    root?.querySelector<HTMLElement>('input, textarea, button')?.focus({ preventScroll: true });

    const onDocKeyDown = (ev: globalThis.KeyboardEvent) => {
      if (ev.key === 'Escape' && !isSubmitting) {
        ev.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onDocKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onDocKeyDown);
      document.body.style.overflow = prevOverflow;
      previous?.focus?.({ preventScroll: true });
    };
  }, [open, isSubmitting, onClose]);

  useEffect(() => {
    if (!open || hasSelection || !dropdownOpen) {
      return;
    }
    const query = debouncedDraft.trim();
    if (query.length === 0) {
      dispatchSearch({ type: 'RESET' });
      return;
    }
    let cancelled = false;
    dispatchSearch({ type: 'FETCH_BEGIN' });
    void fetchSellerAccounts({ page: 0, size: 20, search: query, isActive: true })
      .then((page) => {
        if (cancelled) {
          return;
        }
        const options: StoreOption[] = page.content.map((s) => ({
          storeId: s.store.id,
          businessName: s.store.businessName,
          sellerEmail: s.email,
          sellerName: null,
        }));
        dispatchSearch({ type: 'FETCH_OK', payload: options });
      })
      .catch(() => {
        if (!cancelled) {
          dispatchSearch({ type: 'FETCH_ERR' });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, debouncedDraft, dropdownOpen, hasSelection]);

  useEffect(() => {
    const onDocMouseDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  if (!open) {
    return null;
  }

  const showDropdown = dropdownOpen && !hasSelection && debouncedDraft.trim().length > 0;

  const onSubmit = async (values: FormValues) => {
    if (!selectedStore) {
      setSubmitError('Seleccioná una tienda.');
      return;
    }
    setSubmitError(null);
    try {
      await sendAdminSupportMessage(selectedStore.storeId, { content: values.message.trim() });
      registerDevSupportConversation({
        storeId: selectedStore.storeId,
        businessName: selectedStore.businessName,
        sellerEmail: selectedStore.sellerEmail,
        sellerName: selectedStore.sellerName,
      });
      success(`Conversación iniciada con ${selectedStore.businessName}`);
      onStarted(selectedStore.storeId, selectedStore.businessName);
      onClose();
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        setSubmitError(error.message);
      } else if (error instanceof Error) {
        setSubmitError(error.message);
      } else {
        setSubmitError('No se pudo iniciar la conversación.');
      }
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-xl"
      >
        <h2 id={titleId} className="font-display text-lg font-semibold text-[var(--text-primary)]">
          Nueva conversación
        </h2>

        <form className="mt-5 space-y-4" onSubmit={(e) => void handleSubmit(onSubmit)(e)}>
          <label className="block text-sm">
            <span className="font-medium text-[var(--text-primary)]">Vendedor</span>
            <div ref={rootRef} className="relative mt-2">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]"
                aria-hidden
              />
              <input
                type="search"
                value={storeDraft}
                disabled={isSubmitting}
                onChange={(e) => {
                  setStoreDraft(e.target.value);
                  if (hasSelection) {
                    setSelectedStore(null);
                  }
                  setDropdownOpen(true);
                }}
                onFocus={() => {
                  if (!hasSelection && storeDraft.trim()) {
                    setDropdownOpen(true);
                  }
                }}
                onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                  if (event.key === 'Escape') {
                    setDropdownOpen(false);
                  }
                }}
                placeholder="Buscar tienda..."
                className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] py-2 pl-10 pr-10 text-sm outline-none focus:border-[var(--border-focus)]"
              />
              {(storeDraft.trim() || hasSelection) ?
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"
                  onClick={() => {
                    setStoreDraft('');
                    setSelectedStore(null);
                    dispatchSearch({ type: 'RESET' });
                  }}
                  aria-label="Limpiar tienda"
                >
                  <X className="size-4" aria-hidden />
                </button>
              : null}
              {showDropdown ?
                <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-10 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-card)] shadow-lg">
                  {searchState.loading ?
                    <p className="px-3 py-3 text-sm text-[var(--text-muted)]">Buscando…</p>
                  : searchState.hasSearched && searchState.options.length === 0 ?
                    <p className="px-3 py-3 text-sm text-[var(--text-muted)]">No se encontró ninguna tienda</p>
                  : (
                    <ul id={listboxId} className="max-h-48 overflow-y-auto py-1">
                      {searchState.options.map((store) => (
                        <li key={store.storeId}>
                          <button
                            type="button"
                            className="w-full px-3 py-2.5 text-left text-sm hover:bg-[var(--bg-hover)]"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setSelectedStore(store);
                              setStoreDraft(store.businessName);
                              setDropdownOpen(false);
                            }}
                          >
                            {store.businessName}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              : null}
            </div>
          </label>

          <label className="block text-sm">
            <span className="font-medium text-[var(--text-primary)]">Mensaje inicial</span>
            <textarea
              {...register('message')}
              rows={4}
              disabled={isSubmitting}
              placeholder="Escribí el primer mensaje..."
              className="mt-2 w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm outline-none focus:border-[var(--border-focus)] disabled:opacity-60"
            />
            {errors.message ?
              <span className="mt-1 block text-xs text-danger">{errors.message.message}</span>
            : null}
          </label>

          {submitError ?
            <p className="text-sm text-danger" role="alert">
              {submitError}
            </p>
          : null}

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-input)] disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedStore}
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ?
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
              : null}
              Iniciar
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
