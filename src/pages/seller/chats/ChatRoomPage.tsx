import { ChevronLeft, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { ChatComposer } from '../../../features/chat/ChatComposer';
import { fetchConversations, fetchMessages, sendChatMessage } from '../../../features/chat/chatApi';
import { sellerChatTransport } from '../../../features/chat/chatTransport';
import { MessageBubble } from '../../../features/chat/MessageBubble';
import { ROUTES } from '../../../lib/constants';
import { ApiError } from '../../../lib/http/apiClient';
import type { SellerChatMessage } from '../../../types/chat';

function sortBySentAtAsc(list: SellerChatMessage[]): SellerChatMessage[] {
  return [...list].sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
}

function mergeUniqueMessages(prev: SellerChatMessage[], incoming: SellerChatMessage): SellerChatMessage[] {
  const map = new Map<string, SellerChatMessage>();
  for (const m of prev) {
    map.set(m.id, m);
  }
  map.set(incoming.id, incoming);
  return sortBySentAtAsc([...map.values()]);
}

/** Genera IDs locales reproducibles sólo hasta que el servidor responde */
function pendingSellerMessageId(localKey: string): string {
  return `__pending_seller:${localKey}`;
}

export function ChatRoomPage() {
  const { conversationId: rawConversationId } = useParams<{ conversationId: string }>();
  const conversationId = rawConversationId?.trim() ?? '';

  const [buyerName, setBuyerName] = useState<string | null>(null);
  const [messages, setMessages] = useState<SellerChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const scrollViewportRef = useRef<HTMLDivElement | null>(null);

  const scrollMessagesToBottom = useCallback(() => {
    const el = scrollViewportRef.current;
    if (!el) {
      return;
    }
    el.scrollTop = el.scrollHeight;
  }, []);

  useLayoutEffect(() => {
    scrollMessagesToBottom();
  }, [messages, scrollMessagesToBottom]);

  const loadConversation = useCallback(async () => {
    if (!conversationId) {
      setErrorMessage('Conversación no encontrada.');
      setMessages([]);
      setBuyerName(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      const [convs, msgs] = await Promise.all([fetchConversations(), fetchMessages(conversationId)]);
      const match = convs.find((c) => c.id === conversationId);
      setBuyerName(match?.buyerName ?? 'Comprador');
      setMessages(sortBySentAtAsc(msgs));
    } catch (err: unknown) {
      setMessages([]);
      setBuyerName(null);
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('No se pudo cargar el chat.');
      }
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    void loadConversation();
  }, [loadConversation]);

  useEffect(() => {
    if (!conversationId) {
      return;
    }
    const onMsg = (msg: SellerChatMessage) => {
      setMessages((prev) => mergeUniqueMessages(prev, msg));
    };
    sellerChatTransport.subscribe(conversationId, onMsg);
    return () => {
      sellerChatTransport.unsubscribe();
    };
  }, [conversationId]);

  const handleSend = useCallback(
    async (text: string) => {
      if (!conversationId) {
        return;
      }
      setSendError(null);
      const localKey = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now());
      const pendingId = pendingSellerMessageId(localKey);
      const pending: SellerChatMessage = {
        id: pendingId,
        conversationId,
        senderRole: 'SELLER',
        content: text,
        sentAt: new Date().toISOString(),
      };
      setMessages((prev) => sortBySentAtAsc([...prev, pending]));

      try {
        const sent = await sendChatMessage(conversationId, text);
        sellerChatTransport.acknowledgeMessages(sent.id);
        setMessages((prev) => {
          const withoutPending = prev.filter((m) => m.id !== pendingId);
          return mergeUniqueMessages(withoutPending, sent);
        });
      } catch (err: unknown) {
        setMessages((prev) => prev.filter((m) => m.id !== pendingId));
        if (err instanceof ApiError) {
          setSendError(err.message);
        } else if (err instanceof Error) {
          setSendError(err.message);
        } else {
          setSendError('No se pudo enviar el mensaje.');
        }
      }
    },
    [conversationId],
  );

  const showLoading = loading && messages.length === 0;

  return (
    <div className="flex flex-col space-y-4">
      <header className="flex flex-wrap items-center gap-3">
        <Link
          to={ROUTES.sellerChats}
          className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-input)]"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Bandeja
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-display-sm text-[var(--text-primary)]">
            {showLoading ? 'Cargando…' : buyerName ?? 'Chat'}
          </h1>
          {!showLoading && conversationId ?
            <p className="truncate text-xs text-[var(--text-muted)]" title={conversationId}>
              Conversación · {conversationId}
            </p>
          : null}
        </div>
      </header>

      {errorMessage && !loading ?
        <p className="rounded-lg border border-danger/40 bg-danger/5 px-4 py-3 text-sm text-danger" role="alert">
          {errorMessage}
        </p>
      : null}

      <section className="flex h-[clamp(280px,min(520px,calc(100vh-13rem)),640px)] flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
        <div
          ref={scrollViewportRef}
          role="log"
          aria-live="polite"
          className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain p-4 [-webkit-overflow-scrolling:touch]"
        >
          {showLoading ?
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-[var(--text-muted)]">
              <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
              <span className="text-sm">Cargando mensajes…</span>
            </div>
          : null}

          {!showLoading ?
            <>
              {messages.map((m) => (
                <MessageBubble key={m.id} senderRole={m.senderRole} content={m.content} sentAt={m.sentAt} />
              ))}
            </>
          : null}
        </div>

        {sendError ?
          <p className="border-t border-danger/30 bg-danger/5 px-4 py-2 text-xs text-danger" role="alert">
            {sendError}
          </p>
        : null}

        <ChatComposer
          key={conversationId}
          disabled={!conversationId || showLoading === true || errorMessage !== null}
          onSend={({ content }) => void handleSend(content)}
        />
      </section>
    </div>
  );
}
