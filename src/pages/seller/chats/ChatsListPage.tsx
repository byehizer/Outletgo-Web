import { format, isValid, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { Skeleton } from '../../../components/Skeleton';
import { findConversationForBuyer, fetchConversations } from '../../../features/chat/chatApi';
import { fetchSellerOrderDetail } from '../../../features/orders/ordersApi';
import { ROUTES, sellerChatRoomPath, SELLER_CHATS_CONVERSATIONS_PAGE_SIZE } from '../../../lib/constants';
import { cn } from '../../../lib/cn';
import { ApiError } from '../../../lib/http/apiClient';
import { buildStockIssueChatMessage, findStockIssueForItem } from '../../../types/order';
import type { SellerChatConversation } from '../../../types/chat';

function previewTime(iso: string): string {
  const date = parseISO(iso);
  if (!isValid(date)) {
    return '';
  }
  return format(date, "d MMM · HH:mm", { locale: es });
}

function truncate(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) {
    return t;
  }
  return `${t.slice(0, max - 1)}…`;
}

export function ChatsListPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [rows, setRows] = useState<SellerChatConversation[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [openingContext, setOpeningContext] = useState(false);

  const openWithContext = searchParams.get('openWithContext') === 'true';
  const contextSliceId = searchParams.get('orderId')?.trim() ?? '';
  const contextItemId =
    searchParams.get('item')?.trim() ?? searchParams.get('itemId')?.trim() ?? '';

  useEffect(() => {
    if (!openWithContext || !contextSliceId || !contextItemId) {
      return;
    }

    let cancelled = false;
    setOpeningContext(true);
    setErrorMessage(null);

    void (async () => {
      try {
        const [order, convsPage] = await Promise.all([
          fetchSellerOrderDetail(contextSliceId),
          fetchConversations({ page: 0, size: SELLER_CHATS_CONVERSATIONS_PAGE_SIZE }),
        ]);
        if (cancelled) {
          return;
        }
        const convs = convsPage.content ?? [];
        const issue = findStockIssueForItem(order, contextItemId);
        if (!issue) {
          setErrorMessage('No hay un problema de stock activo para ese ítem.');
          setOpeningContext(false);
          navigate(ROUTES.sellerChats, { replace: true });
          return;
        }
        const conv = findConversationForBuyer(convs, order.buyer.displayName);
        if (!conv) {
          setErrorMessage('No encontramos una conversación con este cliente.');
          setOpeningContext(false);
          navigate(ROUTES.sellerChats, { replace: true });
          return;
        }
        const draft = buildStockIssueChatMessage(order.orderId, issue);
        navigate(sellerChatRoomPath(conv.id), {
          replace: true,
          state: { draftMessage: draft },
        });
      } catch (err: unknown) {
        if (cancelled) {
          return;
        }
        if (err instanceof ApiError) {
          setErrorMessage(err.message);
        } else if (err instanceof Error) {
          setErrorMessage(err.message);
        } else {
          setErrorMessage('No se pudo abrir el chat con el cliente.');
        }
        setOpeningContext(false);
        navigate(ROUTES.sellerChats, { replace: true });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [openWithContext, contextSliceId, contextItemId, navigate]);

  useEffect(() => {
    if (openWithContext && contextSliceId && contextItemId) {
      return;
    }

    let cancelled = false;
    setErrorMessage(null);
    void (async () => {
      try {
        const page = await fetchConversations({ page: 0, size: SELLER_CHATS_CONVERSATIONS_PAGE_SIZE });
        if (!cancelled) {
          setRows(page.content ?? []);
        }
      } catch (err: unknown) {
        if (cancelled) {
          return;
        }
        if (err instanceof ApiError) {
          setErrorMessage(err.message);
        } else if (err instanceof Error) {
          setErrorMessage(err.message);
        } else {
          setErrorMessage('No se pudo cargar las conversaciones.');
        }
        setRows([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [openWithContext, contextSliceId, contextItemId]);

  const loading = rows === null && !openingContext;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-display-md text-[var(--text-primary)]">Mensajes</h1>
        <p className="mt-2 max-w-xl text-sm text-[var(--text-muted)]">
          Bandeja de conversaciones con compradores independientes (Paso&nbsp;18).
        </p>
      </header>

      <section className="space-y-3">
        {openingContext ?
          <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-6 text-sm text-[var(--text-muted)]">
            <Loader2 className="size-5 animate-spin text-brand motion-reduce:animate-none" aria-hidden />
            Abriendo chat con el cliente…
          </div>
        : null}

        {errorMessage ?
          <p className="rounded-lg border border-danger/40 bg-danger/5 px-4 py-3 text-sm text-danger" role="alert">
            {errorMessage}
          </p>
        : null}

        {loading ?
          <div className="space-y-3">
            {[0, 1, 2].map((key) => (
              <article
                key={key}
                className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-4 w-full max-w-md" />
              </article>
            ))}
          </div>
        : null}

        {!loading && !openingContext && !errorMessage && rows !== null && rows.length === 0 ?
          <p className="text-sm text-[var(--text-muted)]">No tenés conversaciones todavía.</p>
        : null}

        {!loading && !openingContext && rows !== null ?
          rows.map((c) => (
            <Link
              key={c.id}
              to={sellerChatRoomPath(c.id)}
              className={cn(
                'block rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 transition-colors',
                'hover:border-[var(--border-focus)] hover:bg-[var(--bg-input)]/40',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[var(--text-primary)]">{c.buyerName}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-[var(--text-secondary)]">
                    {truncate(c.lastMessageContent, 120)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                  <span className="text-xs text-[var(--text-muted)]">{previewTime(c.lastMessageAt)}</span>
                  {c.unreadCount > 0 ?
                    <span
                      className="inline-flex min-h-6 min-w-6 items-center justify-center rounded-full bg-brand px-2 text-xs font-semibold text-white"
                      aria-label={`${c.unreadCount} sin leer`}
                    >
                      {c.unreadCount > 99 ? '99+' : c.unreadCount}
                    </span>
                  : null}
                </div>
              </div>
            </Link>
          ))
        : null}

        <p className="text-xs text-[var(--text-muted)]">
          <Link to={ROUTES.sellerRoot} className="text-[var(--text-link)] underline-offset-4 hover:underline">
            Volver al resumen
          </Link>
        </p>
      </section>
    </div>
  );
}
