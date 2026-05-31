import { fetchAdminSupportMessages, fetchMessages, fetchSupportConversations, fetchSupportMessages } from './chatApi';

import type { SellerChatMessage } from '../../types/chat';
import type { SupportConversation, SupportMessage } from '../../types/support';

const POLL_MS = 5000;

/**
 * Transporte desacoplado de React — V1: short polling al API cada 5s (DEV muestra ticks en consola).
 */
export class SellerChatTransport {
  private pollTimer: ReturnType<typeof window.setInterval> | null = null;
  /** Generación aumenta en cada unsubscribe / nuevo subscribe para ignorar trabajo obsoleto. */
  private gen = 0;
  private seenMessageIds = new Set<string>();

  unsubscribe(): void {
    this.gen += 1;
    if (this.pollTimer !== null) {
      window.clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.seenMessageIds.clear();
  }

  /** Marca mensajes ya mostrados (p. ej. envío optimistic) para no re-notificarlos al poll. */
  acknowledgeMessages(...messageIds: string[]): void {
    for (const id of messageIds) {
      if (id.trim() !== '') {
        this.seenMessageIds.add(id);
      }
    }
  }

  subscribe(
    conversationId: string,
    onMessageReceived: (msg: SellerChatMessage) => void,
  ): void {
    const cid = conversationId.trim();
    if (cid === '') {
      return;
    }

    this.unsubscribe();
    const myGen = this.gen;

    const sortAsc = (a: SellerChatMessage, b: SellerChatMessage): number =>
      new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime();

    const runPollCycle = (): void => {
      if (import.meta.env.DEV) {
        console.log('[SellerChatTransport] short poll', cid);
      }
      void (async () => {
        if (myGen !== this.gen) {
          return;
        }
        try {
          const list = await fetchMessages(cid);
          if (myGen !== this.gen) {
            return;
          }
          const sorted = [...list].sort(sortAsc);
          for (const msg of sorted) {
            if (this.seenMessageIds.has(msg.id)) {
              continue;
            }
            this.seenMessageIds.add(msg.id);
            onMessageReceived(msg);
          }
        } catch {
          // Errores de red: siguiente tick reintenta sin tumbar React.
        }
      })();
    };

    void (async () => {
      try {
        const initial = await fetchMessages(cid);
        if (myGen !== this.gen) {
          return;
        }
        for (const m of initial) {
          this.seenMessageIds.add(m.id);
        }
      } catch {
        /* seed fallido: primera vuelta de poll igual intentará */
      }
      if (myGen !== this.gen) {
        return;
      }
      this.pollTimer = window.setInterval(runPollCycle, POLL_MS);
    })();
  }
}

/** Instancia singleton usada desde las pantallas seller. */
export const sellerChatTransport = new SellerChatTransport();

const SUPPORT_POLL_PAGE_SIZE = 100;

/** Polling del hilo soporte seller ↔ Admin (sin `conversationId`; backend por auth). */
export class SupportChatTransport {
  private pollTimer: ReturnType<typeof window.setInterval> | null = null;
  private gen = 0;
  private seenMessageIds = new Set<string>();

  unsubscribe(): void {
    this.gen += 1;
    if (this.pollTimer !== null) {
      window.clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.seenMessageIds.clear();
  }

  acknowledgeMessages(...messageIds: string[]): void {
    for (const id of messageIds) {
      if (id.trim() !== '') {
        this.seenMessageIds.add(id);
      }
    }
  }

  subscribe(onMessageReceived: (msg: SupportMessage) => void): void {
    this.unsubscribe();
    const myGen = this.gen;

    const sortAsc = (a: SupportMessage, b: SupportMessage): number =>
      new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime();

    const fetchSorted = async (): Promise<SupportMessage[]> => {
      const page = await fetchSupportMessages({
        pageZero: 0,
        pageSize: SUPPORT_POLL_PAGE_SIZE,
      });
      return [...page.content].sort(sortAsc);
    };

    const runPollCycle = (): void => {
      if (import.meta.env.DEV) {
        console.log('[SupportChatTransport] short poll');
      }
      void (async () => {
        if (myGen !== this.gen) {
          return;
        }
        try {
          const sorted = await fetchSorted();
          if (myGen !== this.gen) {
            return;
          }
          for (const msg of sorted) {
            if (this.seenMessageIds.has(msg.id)) {
              continue;
            }
            this.seenMessageIds.add(msg.id);
            onMessageReceived(msg);
          }
        } catch {
          /* siguiente ciclo */
        }
      })();
    };

    void (async () => {
      try {
        const sorted = await fetchSorted();
        if (myGen !== this.gen) {
          return;
        }
        for (const m of sorted) {
          this.seenMessageIds.add(m.id);
        }
      } catch {
        /* primer ciclo igual reintenta */
      }
      if (myGen !== this.gen) {
        return;
      }
      this.pollTimer = window.setInterval(runPollCycle, POLL_MS);
    })();
  }
}

export const supportChatTransport = new SupportChatTransport();

/** Polling del hilo soporte Admin ↔ tienda (Paso 27). */
export class AdminSupportChatTransport {
  private pollTimer: ReturnType<typeof window.setInterval> | null = null;
  private gen = 0;
  private seenMessageIds = new Set<string>();

  unsubscribe(): void {
    this.gen += 1;
    if (this.pollTimer !== null) {
      window.clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.seenMessageIds.clear();
  }

  acknowledgeMessages(...messageIds: string[]): void {
    for (const id of messageIds) {
      if (id.trim() !== '') {
        this.seenMessageIds.add(id);
      }
    }
  }

  subscribe(
    storeId: string,
    onMessageReceived: (msg: SupportMessage) => void,
    onConversationsRefresh?: (conversations: SupportConversation[]) => void,
  ): void {
    const sid = storeId.trim();
    if (sid === '') {
      return;
    }

    this.unsubscribe();
    const myGen = this.gen;

    const sortAsc = (a: SupportMessage, b: SupportMessage): number =>
      new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime();

    const fetchSorted = async (): Promise<SupportMessage[]> => {
      const page = await fetchAdminSupportMessages(sid, 0);
      return [...page.content].sort(sortAsc);
    };

    const runPollCycle = (): void => {
      if (import.meta.env.DEV) {
        console.log('[AdminSupportChatTransport] short poll', sid);
      }
      void (async () => {
        if (myGen !== this.gen) {
          return;
        }
        try {
          const sorted = await fetchSorted();
          if (myGen !== this.gen) {
            return;
          }
          for (const msg of sorted) {
            if (this.seenMessageIds.has(msg.id)) {
              continue;
            }
            this.seenMessageIds.add(msg.id);
            onMessageReceived(msg);
          }
          if (onConversationsRefresh) {
            const convs = await fetchSupportConversations();
            if (myGen === this.gen) {
              onConversationsRefresh(convs);
            }
          }
        } catch {
          /* siguiente ciclo */
        }
      })();
    };

    void (async () => {
      try {
        const sorted = await fetchSorted();
        if (myGen !== this.gen) {
          return;
        }
        for (const m of sorted) {
          this.seenMessageIds.add(m.id);
        }
      } catch {
        /* primer ciclo reintenta */
      }
      if (myGen !== this.gen) {
        return;
      }
      this.pollTimer = window.setInterval(runPollCycle, POLL_MS);
    })();
  }
}

export const adminSupportChatTransport = new AdminSupportChatTransport();
