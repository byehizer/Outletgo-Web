import { Headphones } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef } from 'react';

import { EmptyState } from '../../../components/EmptyState';
import { Skeleton } from '../../../components/Skeleton';
import { Composer, type ComposerSendPayload } from '../../../features/chat/Composer';
import { MessageBubble } from '../../../features/chat/MessageBubble';
import { fetchSupportMessages, sendSupportMessage } from '../../../features/chat/chatApi';
import { supportChatTransport } from '../../../features/chat/chatTransport';
import { ApiError } from '../../../lib/http/apiClient';
import type { SupportMessage } from '../../../types/support';

type SupportUiState = {
  messages: SupportMessage[];
  initialLoading: boolean;
  loadError: string | null;
  sendInline: string | null;
  /** Sesión staging de un solo uso por mensaje (subidas multipart). */
  stagingSessionId: string;
};

type SupportAction =
  | { type: 'FETCH_BEGIN' }
  | { type: 'FETCH_OK'; payload: SupportMessage[] }
  | { type: 'FETCH_ERR'; payload: string }
  | { type: 'UPSERT_ONE'; payload: SupportMessage }
  | { type: 'SEND_ERR'; payload: string }
  | { type: 'SEND_CLEAR' }
  | { type: 'STAGING_REGENERATE' };

function sortSupport(messages: SupportMessage[]): SupportMessage[] {
  return [...messages].sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
}

function upsertOne(prev: SupportMessage[], msg: SupportMessage): SupportMessage[] {
  const next = [...prev];
  const ix = next.findIndex((m) => m.id === msg.id);
  if (ix >= 0) {
    next[ix] = msg;
  } else {
    next.push(msg);
  }
  return sortSupport(next);
}

function supportReducer(state: SupportUiState, action: SupportAction): SupportUiState {
  switch (action.type) {
    case 'FETCH_BEGIN': {
      return {
        ...state,
        initialLoading: true,
        loadError: null,
      };
    }
    case 'FETCH_OK': {
      return {
        ...state,
        messages: sortSupport(action.payload),
        initialLoading: false,
        loadError: null,
      };
    }
    case 'FETCH_ERR': {
      return {
        ...state,
        messages: [],
        initialLoading: false,
        loadError: action.payload,
      };
    }
    case 'UPSERT_ONE': {
      return {
        ...state,
        messages: upsertOne(state.messages, action.payload),
      };
    }
    case 'SEND_ERR': {
      return {
        ...state,
        sendInline: action.payload,
      };
    }
    case 'SEND_CLEAR': {
      return {
        ...state,
        sendInline: null,
      };
    }
    case 'STAGING_REGENERATE': {
      return {
        ...state,
        stagingSessionId: newStagingSessionId(),
      };
    }
    default: {
      return state;
    }
  }
}

const initialUi: SupportUiState = {
  messages: [],
  initialLoading: true,
  loadError: null,
  sendInline: null,
  stagingSessionId: '',
};

function newStagingSessionId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `stg-${String(Date.now())}-${Math.random().toString(36).slice(2, 12)}`;
}

function createInitialSupportState(): SupportUiState {
  return {
    ...initialUi,
    stagingSessionId: newStagingSessionId(),
  };
}

/** Nombre de archivo sólo UI (mensajes pueden no tenerlo en modelo). */
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

export function SupportChatPage() {
  const [state, dispatch] = useReducer(supportReducer, undefined, createInitialSupportState);
  const scrollViewportRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = useCallback(() => {
    const el = scrollViewportRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, []);

  useLayoutEffect(() => {
    scrollToBottom();
  }, [state.messages.length, scrollToBottom]);

  useEffect(() => {
    dispatch({ type: 'FETCH_BEGIN' });
    void (async () => {
      try {
        const page = await fetchSupportMessages({ pageZero: 0, pageSize: 50 });
        dispatch({ type: 'FETCH_OK', payload: page.content });
      } catch (err: unknown) {
        dispatch({
          type: 'FETCH_ERR',
          payload:
            err instanceof ApiError ? err.message
            : err instanceof Error ? err.message
            : 'No se pudieron cargar los mensajes de soporte.',
        });
      }
    })();
  }, []);

  useEffect(() => {
    const cb = (msg: SupportMessage) => {
      dispatch({ type: 'UPSERT_ONE', payload: msg });
    };
    supportChatTransport.subscribe(cb);
    return () => {
      supportChatTransport.unsubscribe();
    };
  }, []);

  const handleSend = useCallback((payload: ComposerSendPayload) => {
    dispatch({ type: 'SEND_CLEAR' });
    void (async () => {
      try {
        const sent = await sendSupportMessage({
          content: payload.content,
          attachmentUrl: payload.attachmentUrl,
          attachmentType: payload.attachmentType,
        });
        supportChatTransport.acknowledgeMessages(sent.id);
        dispatch({ type: 'UPSERT_ONE', payload: sent });
        dispatch({ type: 'STAGING_REGENERATE' });
      } catch (err: unknown) {
        dispatch({
          type: 'SEND_ERR',
          payload:
            err instanceof ApiError ? err.message
            : err instanceof Error ? err.message
            : 'No se pudo enviar el mensaje.',
        });
      }
    })();
  }, []);

  const emptyAfterLoad =
    state.initialLoading !== true &&
    state.loadError === null &&
    state.messages.length === 0;

  const skeletonRow = useMemo(
    () => (
      <>
        {[0, 1, 2].map((key) => (
          <div key={key} className="flex w-full gap-3">
            <Skeleton className="h-24 w-[min(100%,260px)] rounded-2xl" />
          </div>
        ))}
      </>
    ),
    [],
  );

  return (
    <div className="flex flex-col space-y-4">
      <header className="flex flex-wrap items-start gap-3 border-b border-[var(--border)] pb-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
          <Headphones className="size-7" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-display-md text-[var(--text-primary)]">Soporte técnico</h1>
          <p className="mt-1 max-w-xl text-sm text-[var(--text-muted)]">
            El equipo de OutletGo responde en horario laboral.
          </p>
        </div>
      </header>

      <section className="flex h-[clamp(280px,min(520px,calc(100vh-13rem)),640px)] flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
        <div
          ref={scrollViewportRef}
          role="log"
          aria-live="polite"
          className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain p-4 [-webkit-overflow-scrolling:touch]"
        >
          {state.loadError ?
            <p className="rounded-lg border border-danger/40 bg-danger/5 px-4 py-3 text-sm text-danger" role="alert">
              {state.loadError}
            </p>
          : null}

          {state.initialLoading === true ?
            <div className="flex flex-1 flex-col gap-4 py-4">{skeletonRow}</div>
          : emptyAfterLoad ?
            <div className="flex flex-1 flex-col justify-center py-8">
              <EmptyState title="Aún no hay mensajes." description="Contanos en qué podemos ayudarte." />
            </div>
          :
            <>
              {state.messages.map((m) => (
                <MessageBubble
                  key={m.id}
                  senderRole={m.senderRole}
                  content={m.content}
                  sentAt={m.sentAt}
                  senderLabel={m.senderRole === 'ADMIN' ? 'Soporte' : undefined}
                  attachmentUrl={m.attachmentUrl}
                  attachmentType={m.attachmentType}
                  attachmentFileName={m.attachmentType === 'pdf' ? pdfHintName(m.attachmentUrl) : null}
                />
              ))}
            </>
          }
        </div>

        {state.sendInline ?
          <p className="border-t border-danger/30 bg-danger/5 px-4 py-2 text-xs text-danger" role="alert">
            {state.sendInline}
          </p>
        : null}

        {!state.initialLoading ?
          <Composer
            key={state.stagingSessionId}
            allowAttachments
            stagingSessionId={state.stagingSessionId}
            disabled={false}
            onSend={handleSend}
          />
        : null}
      </section>
    </div>
  );
}
