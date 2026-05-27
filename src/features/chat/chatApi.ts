import {
  SUPPORT_MESSAGES_API_PATH,
  SUPPORT_MESSAGES_PAGE_SIZE,
  SELLER_CHATS_API_PATH,
} from '../../lib/constants';
import { apiClient } from '../../lib/http/apiClient';

import type { Page } from '../../types/api';
import type { SellerChatConversation, SellerChatMessage } from '../../types/chat';
import type { SupportMessage } from '../../types/support';

export function sellerChatsConversationMessagesPath(conversationId: string): string {
  return `${SELLER_CHATS_API_PATH}/${encodeURIComponent(conversationId.trim())}/messages`;
}

function devIso(offsetMinutesFromNow: number): string {
  return new Date(Date.now() + offsetMinutesFromNow * 60_000).toISOString();
}

/** Estado demo en memoria (DEV). */
function createDevSeed(): {
  conversations: SellerChatConversation[];
  messages: Map<string, SellerChatMessage[]>;
  counters: Record<string, number>;
} {
  const convJuan: SellerChatConversation = {
    id: 'conv-juan-perez',
    buyerName: 'Juan Pérez',
    lastMessageContent: 'Perfecto, te espero cuando me confirmés el cambio.',
    lastMessageAt: devIso(-8),
    unreadCount: 2,
  };
  const convSofia: SellerChatConversation = {
    id: 'conv-sofia-gomez',
    buyerName: 'Sofía Gomez',
    lastMessageContent: '¿El jean modelo recto viene en otro lavado?',
    lastMessageAt: devIso(-2),
    unreadCount: 0,
  };

  const msgsJuan: SellerChatMessage[] = [
    {
      id: 'msg-juan-1',
      conversationId: convJuan.id,
      senderRole: 'BUYER',
      content: 'Hola, consulto si el pedido puede retirarlo mi hermana.',
      sentAt: devIso(-720),
    },
    {
      id: 'msg-juan-2',
      conversationId: convJuan.id,
      senderRole: 'SELLER',
      content: 'Hola Juan, sí, con tu DNI ella también puede.',
      sentAt: devIso(-700),
    },
    {
      id: 'msg-juan-3',
      conversationId: convJuan.id,
      senderRole: 'BUYER',
      content: 'Perfecto, te espero cuando me confirmés el cambio.',
      sentAt: devIso(-8),
    },
  ];

  const msgsSofia: SellerChatMessage[] = [
    {
      id: 'msg-sofia-1',
      conversationId: convSofia.id,
      senderRole: 'SELLER',
      content: '¡Hola Sofía! ¿En qué te puedo ayudar?',
      sentAt: devIso(-60),
    },
    {
      id: 'msg-sofia-2',
      conversationId: convSofia.id,
      senderRole: 'BUYER',
      content: 'Estoy mirando los jeans del catálogo.',
      sentAt: devIso(-40),
    },
    {
      id: 'msg-sofia-3',
      conversationId: convSofia.id,
      senderRole: 'BUYER',
      content: '¿El jean modelo recto viene en otro lavado?',
      sentAt: devIso(-2),
    },
  ];

  const map = new Map<string, SellerChatMessage[]>();
  map.set(convJuan.id, [...msgsJuan]);
  map.set(convSofia.id, [...msgsSofia]);

  return {
    conversations: [convJuan, convSofia],
    messages: map,
    counters: { [convJuan.id]: 3, [convSofia.id]: 3 },
  };
}

const devState = createDevSeed();

function devDelay<T>(value: T, ms = 120): Promise<T> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(value), ms);
  });
}

function sortMessagesBySentAtAsc(messages: SellerChatMessage[]): SellerChatMessage[] {
  return [...messages].sort(
    (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime(),
  );
}

/** Actualiza vista preliminar del listado después de enviar/recibir. */
function devUpsertConversationPreview(conversationId: string): void {
  const list = devState.messages.get(conversationId);
  if (!list || list.length === 0) {
    return;
  }
  const last = list[list.length - 1];
  if (!last) {
    return;
  }
  const ix = devState.conversations.findIndex((c) => c.id === conversationId);
  if (ix < 0) {
    return;
  }
  const cur = devState.conversations[ix];
  if (!cur) {
    return;
  }
  const updated: SellerChatConversation = {
    id: cur.id,
    buyerName: cur.buyerName,
    unreadCount: cur.unreadCount,
    lastMessageContent: last.content,
    lastMessageAt: last.sentAt,
  };
  const nextConv = [...devState.conversations.slice(0, ix), updated, ...devState.conversations.slice(ix + 1)];
  nextConv.sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
  );
  devState.conversations = nextConv;
}

export async function fetchConversations(): Promise<SellerChatConversation[]> {
  if (import.meta.env.DEV) {
    await devDelay(undefined);
    return devState.conversations.map((c) => ({ ...c }));
  }

  const raw = await apiClient.get<unknown>(SELLER_CHATS_API_PATH);
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: SellerChatConversation[] = [];
  for (const row of raw) {
    const o =
      typeof row === 'object' && row !== null ?
        row as Record<string, unknown>
      : null;
    if (!o) {
      continue;
    }
    const id = typeof o.id === 'string' ? o.id : '';
    const buyerName =
      typeof o.buyerName === 'string'
        ? o.buyerName
        : typeof o.buyer_name === 'string'
          ? o.buyer_name
          : '';
    const last =
      typeof o.lastMessageContent === 'string'
        ? o.lastMessageContent
        : typeof o.last_message_content === 'string'
          ? o.last_message_content
          : '';
    const lastAt =
      typeof o.lastMessageAt === 'string'
        ? o.lastMessageAt
        : typeof o.last_message_at === 'string'
          ? o.last_message_at
          : '';
    const unread =
      typeof o.unreadCount === 'number'
        ? o.unreadCount
        : typeof o.unread_count === 'number'
          ? o.unread_count
          : 0;

    if (id && buyerName) {
      out.push({
        id,
        buyerName,
        lastMessageContent: last,
        lastMessageAt: lastAt,
        unreadCount: Math.max(0, Math.floor(Number.isFinite(unread) ? unread : 0)),
      });
    }
  }
  out.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  return out;
}

export async function fetchMessages(conversationId: string): Promise<SellerChatMessage[]> {
  const cid = conversationId.trim();
  if (cid === '') {
    return [];
  }
  if (import.meta.env.DEV) {
    await devDelay(undefined);
    const list = devState.messages.get(cid);
    return list ? sortMessagesBySentAtAsc(list.map((m) => ({ ...m }))) : [];
  }

  const raw = await apiClient.get<unknown>(sellerChatsConversationMessagesPath(cid));
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: SellerChatMessage[] = [];
  for (const row of raw) {
    const o =
      typeof row === 'object' && row !== null ?
        row as Record<string, unknown>
      : null;
    if (!o) {
      continue;
    }
    const id = typeof o.id === 'string' ? o.id : '';
    const conv =
      typeof o.conversationId === 'string'
        ? o.conversationId
        : typeof o.conversation_id === 'string'
          ? o.conversation_id
          : cid;
    const sender =
      typeof o.senderRole === 'string' ? o.senderRole.toUpperCase()
      : typeof o.sender_role === 'string' ? o.sender_role.toUpperCase()
      : '';
    const content = typeof o.content === 'string' ? o.content : '';
    const sentAt =
      typeof o.sentAt === 'string' ? o.sentAt
      : typeof o.sent_at === 'string' ? o.sent_at
      : '';

    const roleOk = sender === 'BUYER' || sender === 'SELLER';
    if (id && conv && roleOk && content && sentAt) {
      out.push({
        id,
        conversationId: conv,
        senderRole: sender === 'SELLER' ? 'SELLER' : 'BUYER',
        content,
        sentAt,
      });
    }
  }
  return sortMessagesBySentAtAsc(out);
}

export async function sendChatMessage(
  conversationId: string,
  content: string,
): Promise<SellerChatMessage> {
  const cid = conversationId.trim();
  const text = content.trim();
  if (cid === '' || text === '') {
    throw new Error('Mensaje o conversación inválidos.');
  }

  if (import.meta.env.DEV) {
    await devDelay(undefined);
    const n = (devState.counters[cid] ?? 0) + 1;
    devState.counters[cid] = n;
    const msg: SellerChatMessage = {
      id: `msg-${cid}-${n}-${Date.now()}`,
      conversationId: cid,
      senderRole: 'SELLER',
      content: text,
      sentAt: new Date().toISOString(),
    };
    const prev = devState.messages.get(cid) ?? [];
    devState.messages.set(cid, [...prev, msg]);
    devUpsertConversationPreview(cid);
    return { ...msg };
  }

  const raw = await apiClient.post<unknown>(sellerChatsConversationMessagesPath(cid), {
    content: text,
  });
  const o =
    typeof raw === 'object' && raw !== null ?
      raw as Record<string, unknown>
    : {};
  const id = typeof o.id === 'string' ? o.id : '';
  const conv =
    typeof o.conversationId === 'string'
      ? o.conversationId
      : typeof o.conversation_id === 'string'
        ? o.conversation_id
        : cid;
  const sender =
    typeof o.senderRole === 'string' ? o.senderRole.toUpperCase()
    : typeof o.sender_role === 'string' ? o.sender_role.toUpperCase()
    : 'SELLER';
  const ct = typeof o.content === 'string' ? o.content : text;
  const sentAt =
    typeof o.sentAt === 'string' ? o.sentAt
    : typeof o.sent_at === 'string'
      ? o.sent_at
      : new Date().toISOString();

  if (!id || (sender !== 'SELLER' && sender !== 'BUYER')) {
    throw new Error('Respuesta de envío inválida.');
  }
  return {
    id,
    conversationId: conv,
    senderRole: sender === 'BUYER' ? 'BUYER' : 'SELLER',
    content: ct,
    sentAt,
  };
}

// ---- Soporte técnico seller ↔ admin (Paso 19) ----

/** URL de objeto local DEV (no hardcodear CDN de producción). */
let devSupportPdfObjectUrl: string | undefined;

function getDevSupportPdfSeedUrl(): string {
  devSupportPdfObjectUrl ??= URL.createObjectURL(new Blob(['%PDF-1.4'], { type: 'application/pdf' }));
  return devSupportPdfObjectUrl;
}

const DEV_SUPPORT_IMAGE_SEED_PATH = '/vite.svg';

function createSupportDevSeedMessages(): SupportMessage[] {
  return sortSupportBySentAt([
    {
      id: 'support-dev-1',
      senderId: 'seller-dev',
      senderRole: 'SELLER',
      content: 'Hola, tengo un problema al subir las fotos del catálogo desde el panel.',
      attachmentUrl: null,
      attachmentType: null,
      sentAt: devIso(-400),
    },
    {
      id: 'support-dev-2',
      senderId: 'admin-dev',
      senderRole: 'ADMIN',
      content:
        '¡Hola! Gracias por avisar. ¿Podés confirmar el navegador y si ves algún error en la consola?',
      attachmentUrl: null,
      attachmentType: null,
      sentAt: devIso(-350),
    },
    {
      id: 'support-dev-3',
      senderId: 'seller-dev',
      senderRole: 'SELLER',
      content: 'Te mando captura del error.',
      attachmentUrl: DEV_SUPPORT_IMAGE_SEED_PATH,
      attachmentType: 'image',
      sentAt: devIso(-300),
    },
    {
      id: 'support-dev-4',
      senderId: 'seller-dev',
      senderRole: 'SELLER',
      content: 'Adjunto también el PDF con el detalle.',
      attachmentUrl: getDevSupportPdfSeedUrl(),
      attachmentType: 'pdf',
      sentAt: devIso(-260),
    },
  ]);
}

let devSupportMessages: SupportMessage[] = createSupportDevSeedMessages();
let devSupportSendCounter = devSupportMessages.length;

function sortSupportBySentAt(list: SupportMessage[]): SupportMessage[] {
  return [...list].sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
}

function parseSupportMessageRow(row: unknown): SupportMessage | null {
  const o = typeof row === 'object' && row !== null ? (row as Record<string, unknown>) : null;
  if (!o) {
    return null;
  }
  const id = typeof o.id === 'string' ? o.id : '';
  const senderId =
    typeof o.senderId === 'string' ? o.senderId
    : typeof o.sender_id === 'string' ? o.sender_id
    : '';
  const roleRaw =
    typeof o.senderRole === 'string' ? o.senderRole.toUpperCase()
    : typeof o.sender_role === 'string' ? o.sender_role.toUpperCase()
    : '';
  const senderRole = roleRaw === 'ADMIN' ? 'ADMIN'
    : roleRaw === 'SELLER' ? 'SELLER'
    : null;
  const content = typeof o.content === 'string' ? o.content : '';
  const attachmentUrlRaw =
    typeof o.attachmentUrl === 'string' ? o.attachmentUrl.trim()
    : typeof o.attachment_url === 'string' ? o.attachment_url.trim()
    : '';
  const attachmentUrl = attachmentUrlRaw.length > 0 ? attachmentUrlRaw : null;
  const attachmentTypeRaw =
    typeof o.attachmentType === 'string' ? o.attachmentType.toLowerCase()
    : typeof o.attachment_type === 'string' ? o.attachment_type.toLowerCase()
    : '';
  const sentAt =
    typeof o.sentAt === 'string' ? o.sentAt
    : typeof o.sent_at === 'string' ? o.sent_at
    : '';
  if (!id || !senderId || senderRole === null || !sentAt) {
    return null;
  }
  let attachmentType: SupportMessage['attachmentType'] = null;
  if (attachmentUrl) {
    if (attachmentTypeRaw === 'pdf' || attachmentTypeRaw === 'image') {
      attachmentType = attachmentTypeRaw === 'pdf' ? 'pdf' : 'image';
    } else if (attachmentUrl.toLowerCase().endsWith('.pdf')) {
      attachmentType = 'pdf';
    } else {
      attachmentType = 'image';
    }
  }
  return {
    id,
    senderId,
    senderRole,
    content,
    attachmentUrl,
    attachmentType,
    sentAt,
  };
}

export type FetchSupportMessagesParams = {
  pageZero: number;
  pageSize?: number;
};

export async function fetchSupportMessages(params: FetchSupportMessagesParams): Promise<Page<SupportMessage>> {
  const pageZero = Number.isFinite(params.pageZero) && params.pageZero >= 0 ? Math.floor(params.pageZero) : 0;
  const pageSizeRaw = params.pageSize ?? SUPPORT_MESSAGES_PAGE_SIZE;
  const size = Math.min(500, Math.max(1, Math.floor(pageSizeRaw)));

  if (import.meta.env.DEV) {
    await devDelay(undefined);
    const sorted = sortSupportBySentAt(devSupportMessages);
    const totalElements = sorted.length;
    const start = pageZero * size;
    const slice = sorted.slice(start, start + size);
    return {
      content: slice.map((m) => ({ ...m })),
      totalElements,
      number: pageZero,
      size,
    };
  }

  const qs = new URLSearchParams({
    page: String(pageZero),
    size: String(size),
  });
  const raw = await apiClient.get<unknown>(`${SUPPORT_MESSAGES_API_PATH}?${qs.toString()}`);
  if (typeof raw !== 'object' || raw === null) {
    return { content: [], totalElements: 0, number: pageZero, size };
  }
  const root = raw as Record<string, unknown>;
  const contentRaw = Array.isArray(root.content) ? root.content : [];

  const out: SupportMessage[] = [];
  for (const row of contentRaw) {
    const m = parseSupportMessageRow(row);
    if (m) {
      out.push(m);
    }
  }

  let totalElements = typeof root.totalElements === 'number' ? root.totalElements
    : typeof root.total_elements === 'number' ? root.total_elements
    : out.length;
  if (!Number.isFinite(totalElements)) {
    totalElements = out.length;
  }

  const numberPg = typeof root.number === 'number' ? root.number : pageZero;

  const sizePg = typeof root.size === 'number' ? root.size : size;

  out.sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());

  return {
    content: out,
    totalElements,
    number: numberPg,
    size: sizePg,
  };
}

export type SendSupportPayload = {
  content: string;
  attachmentUrl?: string;
  attachmentType?: 'image' | 'pdf';
};

export async function sendSupportMessage(payload: SendSupportPayload): Promise<SupportMessage> {
  const text = payload.content.trim();
  const attachmentUrlTrim = typeof payload.attachmentUrl === 'string' ? payload.attachmentUrl.trim() : '';
  const hasAttach = attachmentUrlTrim.length > 0;
  const kind = payload.attachmentType;

  if (text === '' && !hasAttach) {
    throw new Error('Mensaje o adjunto obligatorio.');
  }
  if (hasAttach && kind !== 'image' && kind !== 'pdf') {
    throw new Error('Tipo de adjunto no válido.');
  }

  if (import.meta.env.DEV) {
    await devDelay(undefined);
    devSupportSendCounter += 1;
    const msg: SupportMessage = {
      id: `support-out-${String(devSupportSendCounter)}-${String(Date.now())}`,
      senderId: 'seller-self',
      senderRole: 'SELLER',
      content: text,
      attachmentUrl: hasAttach ? attachmentUrlTrim : null,
      attachmentType: hasAttach && kind !== undefined ? kind : null,
      sentAt: new Date().toISOString(),
    };
    devSupportMessages = sortSupportBySentAt([...devSupportMessages, msg]);
    return { ...msg };
  }

  const raw = await apiClient.post<unknown>(SUPPORT_MESSAGES_API_PATH, {
    content: text,
    ...(hasAttach ?
      {
        attachmentUrl: attachmentUrlTrim,
        ...(kind !== undefined ? { attachmentType: kind } : {}),
      }
    : {}),
  });

  const m = parseSupportMessageRow(raw);
  if (!m) {
    throw new Error('Respuesta de soporte inválida.');
  }
  return m;
}
