import { ChevronLeft, Headphones, Plus } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';

import { EmptyState } from '../../../components/EmptyState';
import { Skeleton } from '../../../components/Skeleton';
import { Composer, type ComposerSendPayload } from '../../../features/chat/Composer';
import { MessageBubble } from '../../../features/chat/MessageBubble';
import {
  fetchAdminSupportMessages,
  fetchSupportConversations,
  markConversationAsRead,
  sendAdminSupportMessage,
} from '../../../features/chat/chatApi';
import { adminSupportChatTransport } from '../../../features/chat/chatTransport';
import { NewConversationModal } from '../../../features/admin/NewConversationModal';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { cn } from '../../../lib/cn';
import { formatDateTime } from '../../../lib/format';
import { ApiError } from '../../../lib/http/apiClient';
import type { SupportConversation, SupportMessage } from '../../../types/support';

type OutboxEntry = {
  localId: string;
  payload: ComposerSendPayload;
  status: 'pending' | 'failed';
  errorMessage?: string;
};

type InboxUiState = {
  conversations: SupportConversation[];
  conversationsLoading: boolean;
  conversationsError: string | null;
  selectedStoreId: string | null;
  messages: SupportMessage[];
  messagesLoading: boolean;
  messagesError: string | null;
  outbox: OutboxEntry[];
  stagingSessionId: string;
  mobileChatOpen: boolean;
  searchDraft: string;
  newModalOpen: boolean;
};

type InboxAction =
  | { type: 'CONVERSATIONS_BEGIN' }
  | { type: 'CONVERSATIONS_OK'; payload: SupportConversation[] }
  | { type: 'CONVERSATIONS_ERR'; payload: string }
  | { type: 'SELECT_STORE'; storeId: string; mobile?: boolean }
  | { type: 'MOBILE_BACK' }
  | { type: 'MESSAGES_BEGIN' }
  | { type: 'MESSAGES_OK'; payload: SupportMessage[] }
  | { type: 'MESSAGES_ERR'; payload: string }
  | { type: 'UPSERT_MESSAGE'; payload: SupportMessage }
  | { type: 'MARK_READ_LOCAL'; storeId: string }
  | { type: 'OUTBOX_ADD'; payload: OutboxEntry }
  | { type: 'OUTBOX_REMOVE'; localId: string }
  | { type: 'OUTBOX_FAIL'; localId: string; errorMessage: string }
  | { type: 'SEARCH_SET'; payload: string }
  | { type: 'MODAL_OPEN' }
  | { type: 'MODAL_CLOSE' }
  | { type: 'STAGING_REGENERATE' };

function sortMessages(list: SupportMessage[]): SupportMessage[] {
  return [...list].sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
}

function upsertMessage(prev: SupportMessage[], msg: SupportMessage): SupportMessage[] {
  const next = [...prev];
  const ix = next.findIndex((m) => m.id === msg.id);
  if (ix >= 0) {
    next[ix] = msg;
  } else {
    next.push(msg);
  }
  return sortMessages(next);
}

function newStagingSessionId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `stg-${String(Date.now())}`;
}

function createInitialState(): InboxUiState {
  return {
    conversations: [],
    conversationsLoading: true,
    conversationsError: null,
    selectedStoreId: null,
    messages: [],
    messagesLoading: false,
    messagesError: null,
    outbox: [],
    stagingSessionId: newStagingSessionId(),
    mobileChatOpen: false,
    searchDraft: '',
    newModalOpen: false,
  };
}

function inboxReducer(state: InboxUiState, action: InboxAction): InboxUiState {
  switch (action.type) {
    case 'CONVERSATIONS_BEGIN':
      return { ...state, conversationsLoading: true, conversationsError: null };
    case 'CONVERSATIONS_OK':
      return {
        ...state,
        conversations: action.payload,
        conversationsLoading: false,
        conversationsError: null,
      };
    case 'CONVERSATIONS_ERR':
      return {
        ...state,
        conversationsLoading: false,
        conversationsError: action.payload,
      };
    case 'SELECT_STORE':
      return {
        ...state,
        selectedStoreId: action.storeId,
        mobileChatOpen: action.mobile === true ? true : state.mobileChatOpen,
        messages: [],
        messagesLoading: true,
        messagesError: null,
        outbox: [],
      };
    case 'MOBILE_BACK':
      return { ...state, mobileChatOpen: false };
    case 'MESSAGES_BEGIN':
      return { ...state, messagesLoading: true, messagesError: null };
    case 'MESSAGES_OK':
      return {
        ...state,
        messages: sortMessages(action.payload),
        messagesLoading: false,
        messagesError: null,
      };
    case 'MESSAGES_ERR':
      return {
        ...state,
        messages: [],
        messagesLoading: false,
        messagesError: action.payload,
      };
    case 'UPSERT_MESSAGE':
      return {
        ...state,
        messages: upsertMessage(state.messages, action.payload),
      };
    case 'MARK_READ_LOCAL':
      return {
        ...state,
        conversations: state.conversations.map((c) =>
          c.storeId === action.storeId ? { ...c, unreadCount: 0 } : c,
        ),
      };
    case 'OUTBOX_ADD':
      return { ...state, outbox: [...state.outbox, action.payload] };
    case 'OUTBOX_REMOVE':
      return {
        ...state,
        outbox: state.outbox.filter((o) => o.localId !== action.localId),
      };
    case 'OUTBOX_FAIL':
      return {
        ...state,
        outbox: state.outbox.map((o) =>
          o.localId === action.localId
            ? { ...o, status: 'failed' as const, errorMessage: action.errorMessage }
            : o,
        ),
      };
    case 'SEARCH_SET':
      return { ...state, searchDraft: action.payload };
    case 'MODAL_OPEN':
      return { ...state, newModalOpen: true };
    case 'MODAL_CLOSE':
      return { ...state, newModalOpen: false };
    case 'STAGING_REGENERATE':
      return { ...state, stagingSessionId: newStagingSessionId() };
    default:
      return state;
  }
}

function businessInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0]?.charAt(0) ?? '';
    const b = parts[1]?.charAt(0) ?? '';
    return `${a}${b}`.toUpperCase();
  }
  return (name.trim().charAt(0) || '?').toUpperCase();
}

function truncate(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) {
    return t;
  }
  return `${t.slice(0, max - 1)}…`;
}

function previewLine(conv: SupportConversation): { text: string; italic: boolean } {
  const lm = conv.lastMessage;
  if (!lm) {
    return { text: 'Sin mensajes', italic: true };
  }
  if (lm.content) {
    const preview = truncate(lm.content, 40);
    return {
      text: lm.senderRole === 'ADMIN' ? `Vos: ${preview}` : preview,
      italic: false,
    };
  }
  if (lm.attachmentType === 'image') {
    return { text: '📎 Imagen', italic: false };
  }
  if (lm.attachmentType === 'pdf') {
    return { text: '📎 PDF', italic: false };
  }
  return { text: 'Sin mensajes', italic: true };
}

function pdfHintName(url: string | null): string | null {
  if (!url) {
    return null;
  }
  try {
    const leaf = url.split('/').pop() ?? '';
    const decoded = decodeURIComponent(leaf.replace(/\?.*$/, ''));
    return decoded.trim() !== '' ? decoded : null;
  } catch {
    return null;
  }
}

function ConversationListSkeleton() {
  return (
    <ul className="space-y-1 p-2" aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <li key={i} className="flex gap-3 rounded-lg px-3 py-3">
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-full max-w-[180px]" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function SupportInboxPage() {
  const [state, dispatch] = useReducer(inboxReducer, undefined, createInitialState);
  const scrollViewportRef = useRef<HTMLDivElement | null>(null);
  const debouncedSearch = useDebouncedValue(state.searchDraft, 400);

  const loadConversations = useCallback(() => {
    dispatch({ type: 'CONVERSATIONS_BEGIN' });
    void fetchSupportConversations()
      .then((list) => dispatch({ type: 'CONVERSATIONS_OK', payload: list }))
      .catch((err: unknown) => {
        dispatch({
          type: 'CONVERSATIONS_ERR',
          payload:
            err instanceof ApiError ? err.message
            : err instanceof Error ? err.message
            : 'No se pudieron cargar las conversaciones.',
        });
      });
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const selectedConversation = useMemo(
    () => state.conversations.find((c) => c.storeId === state.selectedStoreId) ?? null,
    [state.conversations, state.selectedStoreId],
  );

  const filteredConversations = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) {
      return state.conversations;
    }
    return state.conversations.filter(
      (c) =>
        c.businessName.toLowerCase().includes(q) ||
        c.sellerEmail.toLowerCase().includes(q),
    );
  }, [state.conversations, debouncedSearch]);

  const totalUnread = useMemo(
    () => state.conversations.reduce((acc, c) => acc + c.unreadCount, 0),
    [state.conversations],
  );

  const selectStore = useCallback((storeId: string, mobile = false) => {
    dispatch({ type: 'SELECT_STORE', storeId, mobile });
    void markConversationAsRead(storeId).then(() => {
      dispatch({ type: 'MARK_READ_LOCAL', storeId });
    });
  }, []);

  useEffect(() => {
    const sid = state.selectedStoreId;
    if (!sid) {
      return;
    }
    dispatch({ type: 'MESSAGES_BEGIN' });
    void fetchAdminSupportMessages(sid, 0)
      .then((page) => dispatch({ type: 'MESSAGES_OK', payload: page.content }))
      .catch((err: unknown) => {
        dispatch({
          type: 'MESSAGES_ERR',
          payload:
            err instanceof ApiError ? err.message
            : err instanceof Error ? err.message
            : 'No se pudieron cargar los mensajes.',
        });
      });
  }, [state.selectedStoreId]);

  useEffect(() => {
    const sid = state.selectedStoreId;
    if (!sid) {
      adminSupportChatTransport.unsubscribe();
      return;
    }

    const onMsg = (msg: SupportMessage) => {
      dispatch({ type: 'UPSERT_MESSAGE', payload: msg });
    };
    const onConvs = (conversations: SupportConversation[]) => {
      dispatch({ type: 'CONVERSATIONS_OK', payload: conversations });
    };

    adminSupportChatTransport.subscribe(sid, onMsg, onConvs);
    return () => {
      adminSupportChatTransport.unsubscribe();
    };
  }, [state.selectedStoreId]);

  const scrollToBottom = useCallback(() => {
    const el = scrollViewportRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, []);

  useLayoutEffect(() => {
    scrollToBottom();
  }, [state.messages.length, state.outbox.length, scrollToBottom]);

  const sendPayload = useCallback(
    (storeId: string, payload: ComposerSendPayload, existingLocalId?: string) => {
      const localId =
        existingLocalId ??
        (typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `local-${String(Date.now())}`);

      if (!existingLocalId) {
        dispatch({
          type: 'OUTBOX_ADD',
          payload: { localId, payload, status: 'pending' },
        });
      } else {
        dispatch({ type: 'OUTBOX_REMOVE', localId });
        dispatch({
          type: 'OUTBOX_ADD',
          payload: { localId, payload, status: 'pending' },
        });
      }

      void (async () => {
        try {
          const sent = await sendAdminSupportMessage(storeId, {
            content: payload.content,
            attachmentUrl: payload.attachmentUrl,
            attachmentType: payload.attachmentType,
          });
          adminSupportChatTransport.acknowledgeMessages(sent.id);
          dispatch({ type: 'OUTBOX_REMOVE', localId });
          dispatch({ type: 'UPSERT_MESSAGE', payload: sent });
          dispatch({ type: 'STAGING_REGENERATE' });
          const convs = await fetchSupportConversations();
          dispatch({ type: 'CONVERSATIONS_OK', payload: convs });
        } catch (err: unknown) {
          const message =
            err instanceof ApiError ? err.message
            : err instanceof Error ? err.message
            : 'No se pudo enviar el mensaje.';
          dispatch({ type: 'OUTBOX_FAIL', localId, errorMessage: message });
        }
      })();
    },
    [],
  );

  const handleSend = useCallback(
    (payload: ComposerSendPayload) => {
      const sid = state.selectedStoreId;
      if (!sid) {
        return;
      }
      sendPayload(sid, payload);
    },
    [sendPayload, state.selectedStoreId],
  );

  const emptyMessages =
    !state.messagesLoading &&
    state.messagesError === null &&
    state.messages.length === 0 &&
    state.outbox.length === 0;

  return (
    <div className="flex h-[calc(100vh-7rem)] min-h-[480px] flex-col gap-4">
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
        {/* Panel izquierdo */}
        <aside
          className={cn(
            'flex w-full shrink-0 flex-col border-[var(--border)] md:w-80 md:border-r',
            state.mobileChatOpen ? 'hidden md:flex' : 'flex',
          )}
        >
          <div className="border-b border-[var(--border)] p-4">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-lg font-semibold text-[var(--text-primary)]">Soporte</h1>
              {totalUnread > 0 ?
                <span className="inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-xs font-semibold text-white">
                  {totalUnread > 99 ? '99+' : totalUnread}
                </span>
              : null}
            </div>
            <input
              type="search"
              value={state.searchDraft}
              onChange={(e) => dispatch({ type: 'SEARCH_SET', payload: e.target.value })}
              placeholder="Buscar tienda..."
              className="mt-3 h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 text-sm outline-none focus:border-[var(--border-focus)]"
            />
            <button
              type="button"
              onClick={() => dispatch({ type: 'MODAL_OPEN' })}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)]"
            >
              <Plus className="size-4" aria-hidden />
              Nueva conversación
            </button>
          </div>

          {state.conversationsError ?
            <p className="p-4 text-sm text-danger" role="alert">
              {state.conversationsError}
            </p>
          : null}

          <div className="min-h-0 flex-1 overflow-y-auto">
            {state.conversationsLoading ?
              <ConversationListSkeleton />
            : filteredConversations.length === 0 ?
              <div className="p-4">
                <EmptyState
                  title={
                    debouncedSearch.trim()
                      ? 'No se encontraron tiendas con ese criterio'
                      : 'No hay conversaciones de soporte'
                  }
                />
              </div>
            : (
              <ul className="p-2">
                {filteredConversations.map((conv) => {
                  const preview = previewLine(conv);
                  const active = conv.storeId === state.selectedStoreId;
                  return (
                    <li key={conv.storeId}>
                      <button
                        type="button"
                        onClick={() => selectStore(conv.storeId, true)}
                        className={cn(
                          'flex w-full gap-3 rounded-lg px-3 py-3 text-left transition-colors',
                          active
                            ? 'border-l-2 border-brand bg-[var(--bg-hover)] pl-[calc(0.75rem-2px)]'
                            : 'border-l-2 border-transparent hover:bg-[var(--bg-hover)]/60',
                        )}
                      >
                        <span
                          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand/15 text-sm font-semibold text-brand"
                          aria-hidden
                        >
                          {businessInitials(conv.businessName)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="truncate font-medium text-[var(--text-primary)]">
                              {conv.businessName}
                            </p>
                            {conv.lastMessage ?
                              <time
                                dateTime={conv.lastMessage.sentAt}
                                className="shrink-0 text-[10px] text-[var(--text-muted)]"
                              >
                                {formatDateTime(conv.lastMessage.sentAt)}
                              </time>
                            : null}
                          </div>
                          <div className="mt-0.5 flex items-center justify-between gap-2">
                            <p
                              className={cn(
                                'truncate text-xs',
                                preview.italic
                                  ? 'italic text-[var(--text-muted)]'
                                  : 'text-[var(--text-muted)]',
                              )}
                            >
                              {preview.text}
                            </p>
                            {conv.unreadCount > 0 ?
                              <span className="inline-flex min-h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand px-1.5 text-[10px] font-semibold text-white">
                                {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                              </span>
                            : null}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        {/* Panel derecho */}
        <section
          className={cn(
            'min-w-0 flex-1 flex-col',
            state.selectedStoreId && state.mobileChatOpen ? 'flex'
            : state.selectedStoreId ? 'hidden md:flex'
            : 'hidden md:flex',
          )}
        >
          {!state.selectedStoreId ?
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
              <Headphones className="size-16 text-[var(--text-muted)]" aria-hidden />
              <p className="max-w-sm text-sm text-[var(--text-muted)]">
                Seleccioná una conversación para responder o iniciá una nueva con el botón de arriba
              </p>
            </div>
          : (
            <>
              <header className="flex items-start gap-3 border-b border-[var(--border)] p-4">
                <button
                  type="button"
                  className="mt-1 inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] md:hidden"
                  aria-label="Volver a la lista"
                  onClick={() => dispatch({ type: 'MOBILE_BACK' })}
                >
                  <ChevronLeft className="size-5" aria-hidden />
                </button>
                <span
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand/15 text-sm font-semibold text-brand"
                  aria-hidden
                >
                  {businessInitials(selectedConversation?.businessName ?? '')}
                </span>
                <div className="min-w-0">
                  <h2 className="font-semibold text-[var(--text-primary)]">
                    {selectedConversation?.businessName}
                  </h2>
                  <p className="text-sm text-[var(--text-muted)]">
                    {selectedConversation?.sellerEmail}
                  </p>
                </div>
              </header>

              <div
                ref={scrollViewportRef}
                role="log"
                aria-live="polite"
                className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain p-4"
              >
                {state.messagesError ?
                  <p className="rounded-lg border border-danger/40 bg-danger/5 px-4 py-3 text-sm text-danger" role="alert">
                    {state.messagesError}
                  </p>
                : null}

                {state.messagesLoading ?
                  <div className="space-y-4 py-4">
                    {[0, 1, 2].map((key) => (
                      <Skeleton key={key} className="h-20 w-[min(100%,260px)] rounded-2xl" />
                    ))}
                  </div>
                : emptyMessages ?
                  <div className="flex flex-1 flex-col justify-center py-8">
                    <EmptyState
                      title="Todavía no hay mensajes en esta conversación."
                      description="Escribí algo para iniciar el contacto."
                    />
                  </div>
                : (
                  <>
                    {state.messages.map((m) => (
                      <MessageBubble
                        key={m.id}
                        layoutPerspective="admin"
                        senderRole={m.senderRole}
                        content={m.content}
                        sentAt={m.sentAt}
                        senderLabel={m.senderRole === 'ADMIN' ? 'Vos' : 'Vendedor'}
                        attachmentUrl={m.attachmentUrl}
                        attachmentType={m.attachmentType}
                        attachmentFileName={
                          m.attachmentType === 'pdf' ? pdfHintName(m.attachmentUrl) : null
                        }
                      />
                    ))}
                    {state.outbox.map((entry) =>
                      entry.status === 'pending' ?
                        <div key={entry.localId} className="flex w-full flex-col items-end gap-1 opacity-70">
                          <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                            Vos · enviando…
                          </span>
                          <MessageBubble
                            layoutPerspective="admin"
                            senderRole="ADMIN"
                            content={entry.payload.content}
                            sentAt={new Date().toISOString()}
                            attachmentUrl={entry.payload.attachmentUrl ?? null}
                            attachmentType={entry.payload.attachmentType ?? null}
                          />
                        </div>
                      : (
                        <div
                          key={entry.localId}
                          className="flex w-full flex-col items-end gap-2 rounded-lg border border-danger/40 bg-danger/5 p-3"
                        >
                          <MessageBubble
                            layoutPerspective="admin"
                            senderRole="ADMIN"
                            content={entry.payload.content}
                            sentAt={new Date().toISOString()}
                            senderLabel="Vos · error"
                            attachmentUrl={entry.payload.attachmentUrl ?? null}
                            attachmentType={entry.payload.attachmentType ?? null}
                          />
                          <p className="text-xs text-danger">{entry.errorMessage}</p>
                          <button
                            type="button"
                            className="text-xs font-semibold text-[var(--text-link)] underline-offset-2 hover:underline"
                            onClick={() => {
                              if (state.selectedStoreId) {
                                sendPayload(state.selectedStoreId, entry.payload, entry.localId);
                              }
                            }}
                          >
                            Reintentar
                          </button>
                        </div>
                      ),
                    )}
                  </>
                )}
              </div>

              {!state.messagesLoading ?
                <Composer
                  key={state.stagingSessionId}
                  allowAttachments
                  stagingSessionId={state.stagingSessionId}
                  disabled={!state.selectedStoreId}
                  onSend={handleSend}
                />
              : null}
            </>
          )}
        </section>
      </div>

      <NewConversationModal
        open={state.newModalOpen}
        onClose={() => dispatch({ type: 'MODAL_CLOSE' })}
        onStarted={(storeId) => {
          loadConversations();
          selectStore(storeId, true);
        }}
      />
    </div>
  );
}
