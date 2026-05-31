import {
  ADMIN_SUPPORT_API_PATH,
  ADMIN_SUPPORT_CONVERSATIONS_PAGE_SIZE,
  SUPPORT_MESSAGES_API_PATH,
  SUPPORT_MESSAGES_PAGE_SIZE,
  SELLER_CHATS_API_PATH,
  SELLER_CHATS_CONVERSATIONS_PAGE_SIZE,
  SELLER_CHAT_MESSAGES_PAGE_SIZE,
} from '../../lib/constants';
import { apiClient } from '../../lib/http/apiClient';

import type { Page } from '../../types/api';
import type { SellerChatConversation, SellerChatMessage } from '../../types/chat';
import type {
  SupportConversation,
  SupportConversationLastMessage,
  SupportMessage,
} from '../../types/support';

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

function normalizeBuyerName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

/** Busca conversación por nombre del comprador (tolerante a acentos y apellido). */
export function findConversationForBuyer(
  conversations: SellerChatConversation[],
  buyerDisplayName: string | null,
): SellerChatConversation | undefined {
  const target = buyerDisplayName?.trim();
  if (!target) {
    return undefined;
  }
  const normalizedTarget = normalizeBuyerName(target);
  const exact = conversations.find((c) => normalizeBuyerName(c.buyerName) === normalizedTarget);
  if (exact) {
    return exact;
  }
  const firstToken = normalizedTarget.split(/\s+/)[0] ?? '';
  if (!firstToken) {
    return undefined;
  }
  return conversations.find((c) => {
    const normalizedConv = normalizeBuyerName(c.buyerName);
    return (
      normalizedConv === firstToken ||
      normalizedConv.startsWith(`${firstToken} `) ||
      normalizedTarget.startsWith(`${normalizedConv.split(/\s+/)[0] ?? ''} `)
    );
  });
}

export type FetchSellerChatConversationsParams = {
  page?: number;
  size?: number;
};

function parseSellerChatConversationRow(row: unknown): SellerChatConversation | undefined {
  const o =
    typeof row === 'object' && row !== null ?
      row as Record<string, unknown>
    : null;
  if (!o) {
    return undefined;
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

  if (!id || !buyerName) {
    return undefined;
  }
  return {
    id,
    buyerName,
    lastMessageContent: last,
    lastMessageAt: lastAt,
    unreadCount: Math.max(0, Math.floor(Number.isFinite(unread) ? unread : 0)),
  };
}

export async function fetchConversations(
  params?: FetchSellerChatConversationsParams,
): Promise<Page<SellerChatConversation>> {
  const pageZero = Math.max(0, params?.page ?? 0);
  const size = Math.max(1, params?.size ?? SELLER_CHATS_CONVERSATIONS_PAGE_SIZE);

  if (import.meta.env.DEV) {
    await devDelay(undefined);
    const sorted = [...devState.conversations]
      .map((c) => ({ ...c }))
      .sort(
        (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
      );
    const start = pageZero * size;
    const slice = sorted.slice(start, start + size);
    return {
      content: slice,
      totalElements: sorted.length,
      number: pageZero,
      size,
    };
  }

  const qs = new URLSearchParams({
    page: String(pageZero),
    size: String(size),
  });
  const raw = await apiClient.get<unknown>(`${SELLER_CHATS_API_PATH}?${qs.toString()}`);
  if (typeof raw !== 'object' || raw === null) {
    return { content: [], totalElements: 0, number: pageZero, size };
  }
  const root = raw as Record<string, unknown>;
  const contentRaw = Array.isArray(root.content) ? root.content : [];
  const out: SellerChatConversation[] = [];
  for (const row of contentRaw) {
    const conv = parseSellerChatConversationRow(row);
    if (conv) {
      out.push(conv);
    }
  }
  out.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

  const totalElements =
    typeof root.totalElements === 'number' ? root.totalElements
    : typeof root.total_elements === 'number' ? root.total_elements
    : out.length;

  return {
    content: out,
    totalElements: Number.isFinite(totalElements) ? totalElements : out.length,
    number: typeof root.number === 'number' ? root.number : pageZero,
    size: typeof root.size === 'number' ? root.size : size,
  };
}

export async function fetchMessages(
  conversationId: string,
  options?: { page?: number; size?: number },
): Promise<Page<SellerChatMessage>> {
  const cid = conversationId.trim();
  const pageZero = Math.max(0, options?.page ?? 0);
  const size = Math.max(1, options?.size ?? SELLER_CHAT_MESSAGES_PAGE_SIZE);

  if (cid === '') {
    return { content: [], totalElements: 0, number: pageZero, size };
  }

  if (import.meta.env.DEV) {
    await devDelay(undefined);
    const list = devState.messages.get(cid);
    const sorted = list ? sortMessagesBySentAtAsc(list.map((m) => ({ ...m }))) : [];
    const start = pageZero * size;
    const slice = sorted.slice(start, start + size);
    return {
      content: slice,
      totalElements: sorted.length,
      number: pageZero,
      size,
    };
  }

  const qs = new URLSearchParams({
    page: String(pageZero),
    size: String(size),
  });
  const raw = await apiClient.get<unknown>(
    `${sellerChatsConversationMessagesPath(cid)}?${qs.toString()}`,
  );
  if (typeof raw !== 'object' || raw === null) {
    return { content: [], totalElements: 0, number: pageZero, size };
  }
  const root = raw as Record<string, unknown>;
  const contentRaw = Array.isArray(root.content) ? root.content : [];
  const out: SellerChatMessage[] = [];
  for (const row of contentRaw) {
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
  out.sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());

  const totalElements =
    typeof root.totalElements === 'number' ? root.totalElements
    : typeof root.total_elements === 'number' ? root.total_elements
    : out.length;

  return {
    content: out,
    totalElements: Number.isFinite(totalElements) ? totalElements : out.length,
    number: typeof root.number === 'number' ? root.number : pageZero,
    size: typeof root.size === 'number' ? root.size : size,
  };
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

// ---- Soporte técnico seller ↔ admin (Pasos 19 + 27) ----

/** Tienda del seller autenticado en DEV (mismo hilo que /seller/support). */
const DEV_SELLER_SUPPORT_STORE_ID = 'store-001';

/** URL de objeto local DEV (no hardcodear CDN de producción). */
let devSupportPdfObjectUrl: string | undefined;

function getDevSupportPdfSeedUrl(): string {
  devSupportPdfObjectUrl ??= URL.createObjectURL(new Blob(['%PDF-1.4'], { type: 'application/pdf' }));
  return devSupportPdfObjectUrl;
}

const DEV_SUPPORT_IMAGE_SEED_PATH = '/Isotipewhitemode.png';

function createStore001SeedMessages(): SupportMessage[] {
  return sortSupportBySentAt([
    {
      id: 'support-dev-1',
      senderId: 'seller-001',
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
      senderId: 'seller-001',
      senderRole: 'SELLER',
      content: 'Te mando captura del error.',
      attachmentUrl: DEV_SUPPORT_IMAGE_SEED_PATH,
      attachmentType: 'image',
      sentAt: devIso(-300),
    },
    {
      id: 'support-dev-4',
      senderId: 'seller-001',
      senderRole: 'SELLER',
      content: 'Adjunto también el PDF con el detalle.',
      attachmentUrl: getDevSupportPdfSeedUrl(),
      attachmentType: 'pdf',
      sentAt: devIso(-260),
    },
  ]);
}

function lastMessageFromThread(messages: SupportMessage[]): SupportConversationLastMessage | null {
  if (messages.length === 0) {
    return null;
  }
  const sorted = sortSupportBySentAt(messages);
  const last = sorted[sorted.length - 1];
  if (!last) {
    return null;
  }
  const trimmed = last.content.trim();
  return {
    content: trimmed.length > 0 ? trimmed : null,
    attachmentType: last.attachmentType,
    sentAt: last.sentAt,
    senderRole: last.senderRole,
  };
}

function sortSupportConversations(list: SupportConversation[]): SupportConversation[] {
  return [...list].sort((a, b) => {
    const ta = a.lastMessage?.sentAt ? Date.parse(a.lastMessage.sentAt) : NaN;
    const tb = b.lastMessage?.sentAt ? Date.parse(b.lastMessage.sentAt) : NaN;
    const aHas = Number.isFinite(ta);
    const bHas = Number.isFinite(tb);
    if (aHas && bHas) {
      return tb - ta;
    }
    if (aHas && !bHas) {
      return -1;
    }
    if (!aHas && bHas) {
      return 1;
    }
    return a.businessName.localeCompare(b.businessName, 'es');
  });
}

function ensureDevConversation(storeId: string): SupportConversation {
  const existing = devSupportConversations.find((c) => c.storeId === storeId);
  if (existing) {
    return existing;
  }
  const created: SupportConversation = {
    storeId,
    businessName: `Tienda ${storeId}`,
    sellerEmail: 'vendedor@ejemplo.ar',
    sellerName: null,
    lastMessage: null,
    unreadCount: 0,
  };
  devSupportConversations.push(created);
  return created;
}

function devApplySupportMessage(storeId: string, msg: SupportMessage, incrementUnread: boolean): void {
  const list = devSupportMessagesByStore[storeId] ?? [];
  devSupportMessagesByStore[storeId] = sortSupportBySentAt([...list, msg]);
  const conv = ensureDevConversation(storeId);
  conv.lastMessage = lastMessageFromThread(devSupportMessagesByStore[storeId] ?? []);
  if (incrementUnread && msg.senderRole === 'SELLER') {
    conv.unreadCount += 1;
  }
}

let devSupportMessagesByStore: Record<string, SupportMessage[]> = {
  'store-001': createStore001SeedMessages(),
  'store-002': sortSupportBySentAt([
    {
      id: 'support-s2-1',
      senderId: 'seller-002',
      senderRole: 'SELLER',
      content: '¿Cuándo habilitan pagos con tarjeta en el panel?',
      attachmentUrl: null,
      attachmentType: null,
      sentAt: devIso(-120),
    },
  ]),
  'store-005': sortSupportBySentAt([
    {
      id: 'support-s5-1',
      senderId: 'seller-005',
      senderRole: 'SELLER',
      content: 'Consulta sobre stock mínimo.',
      attachmentUrl: null,
      attachmentType: null,
      sentAt: devIso(-500),
    },
    {
      id: 'support-s5-2',
      senderId: 'admin-dev',
      senderRole: 'ADMIN',
      content: 'Te confirmamos que el mínimo es 3 unidades por variación.',
      attachmentUrl: null,
      attachmentType: null,
      sentAt: devIso(-90),
    },
    {
      id: 'support-s5-3',
      senderId: 'seller-005',
      senderRole: 'SELLER',
      content: '',
      attachmentUrl: DEV_SUPPORT_IMAGE_SEED_PATH,
      attachmentType: 'image',
      sentAt: devIso(-40),
    },
  ]),
};

let devSupportConversations: SupportConversation[] = sortSupportConversations([
  {
    storeId: 'store-001',
    businessName: 'Outlet Avellaneda Norte',
    sellerEmail: 'mariana.lopez@outletgo.demo',
    sellerName: 'Mariana López',
    lastMessage: lastMessageFromThread(devSupportMessagesByStore['store-001'] ?? []),
    unreadCount: 2,
  },
  {
    storeId: 'store-002',
    businessName: 'Moda Flores Local',
    sellerEmail: 'carlos.benitez@outletgo.demo',
    sellerName: 'Carlos Benítez',
    lastMessage: lastMessageFromThread(devSupportMessagesByStore['store-002'] ?? []),
    unreadCount: 1,
  },
  {
    storeId: 'store-004',
    businessName: 'Nuevo Local Palermo',
    sellerEmail: 'nueva.cuenta@outletgo.demo',
    sellerName: null,
    lastMessage: null,
    unreadCount: 0,
  },
  {
    storeId: 'store-005',
    businessName: 'Jean & Remera Outlet',
    sellerEmail: 'lucia.herrera@outletgo.demo',
    sellerName: 'Lucía Herrera',
    lastMessage: lastMessageFromThread(devSupportMessagesByStore['store-005'] ?? []),
    unreadCount: 0,
  },
  {
    storeId: 'store-003',
    businessName: 'Tienda Pausada Demo',
    sellerEmail: 'inactivo.demo@outletgo.com',
    sellerName: null,
    lastMessage: lastMessageFromThread([]),
    unreadCount: 0,
  },
]);

let devSupportSendCounter = 20;

function sortSupportBySentAt(list: SupportMessage[]): SupportMessage[] {
  return [...list].sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
}

function parseSupportConversationRow(row: unknown): SupportConversation | null {
  const o = typeof row === 'object' && row !== null ? (row as Record<string, unknown>) : null;
  if (!o) {
    return null;
  }
  const storeId = typeof o.storeId === 'string' ? o.storeId : typeof o.store_id === 'string' ? o.store_id : '';
  const businessName =
    typeof o.businessName === 'string' ? o.businessName
    : typeof o.business_name === 'string' ? o.business_name
    : '';
  const sellerEmail =
    typeof o.sellerEmail === 'string' ? o.sellerEmail
    : typeof o.seller_email === 'string' ? o.seller_email
    : '';
  const sellerNameRaw = o.sellerName ?? o.seller_name;
  const sellerName =
    typeof sellerNameRaw === 'string' && sellerNameRaw.trim() !== '' ? sellerNameRaw.trim() : null;
  const unreadCount =
    typeof o.unreadCount === 'number' ? Math.max(0, Math.floor(o.unreadCount))
    : typeof o.unread_count === 'number' ? Math.max(0, Math.floor(o.unread_count))
    : 0;
  const lastRaw = o.lastMessage ?? o.last_message;
  let lastMessage: SupportConversationLastMessage | null = null;
  if (typeof lastRaw === 'object' && lastRaw !== null) {
    const lm = lastRaw as Record<string, unknown>;
    const sentAt =
      typeof lm.sentAt === 'string' ? lm.sentAt
      : typeof lm.sent_at === 'string' ? lm.sent_at
      : '';
    const roleRaw =
      typeof lm.senderRole === 'string' ? lm.senderRole.toUpperCase()
      : typeof lm.sender_role === 'string' ? lm.sender_role.toUpperCase()
      : '';
    const senderRole = roleRaw === 'ADMIN' ? 'ADMIN' : roleRaw === 'SELLER' ? 'SELLER' : null;
    if (sentAt && senderRole) {
      const contentRaw = lm.content;
      const content =
        contentRaw === null || contentRaw === undefined
          ? null
          : typeof contentRaw === 'string' && contentRaw.trim() !== ''
            ? contentRaw.trim()
            : null;
      const attRaw =
        typeof lm.attachmentType === 'string' ? lm.attachmentType.toLowerCase()
        : typeof lm.attachment_type === 'string' ? lm.attachment_type.toLowerCase()
        : null;
      const attachmentType = attRaw === 'pdf' ? 'pdf' : attRaw === 'image' ? 'image' : null;
      lastMessage = { content, attachmentType, sentAt, senderRole };
    }
  }
  if (!storeId || !businessName || !sellerEmail) {
    return null;
  }
  return { storeId, businessName, sellerEmail, sellerName, lastMessage, unreadCount };
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
    const sorted = sortSupportBySentAt(devSupportMessagesByStore[DEV_SELLER_SUPPORT_STORE_ID] ?? []);
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
    devApplySupportMessage(DEV_SELLER_SUPPORT_STORE_ID, msg, true);
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

// ---- Soporte Admin (Paso 27) ----

export type FetchSupportConversationsParams = {
  page?: number;
  size?: number;
};

export async function fetchSupportConversations(
  params?: FetchSupportConversationsParams,
): Promise<Page<SupportConversation>> {
  const pageZero = Math.max(0, params?.page ?? 0);
  const size = Math.max(1, params?.size ?? ADMIN_SUPPORT_CONVERSATIONS_PAGE_SIZE);

  if (import.meta.env.DEV) {
    await devDelay(undefined);
    const sorted = sortSupportConversations(devSupportConversations.map((c) => ({ ...c })));
    const start = pageZero * size;
    const slice = sorted.slice(start, start + size);
    return {
      content: slice,
      totalElements: sorted.length,
      number: pageZero,
      size,
    };
  }

  const qs = new URLSearchParams({
    page: String(pageZero),
    size: String(size),
  });
  const raw = await apiClient.get<unknown>(
    `${ADMIN_SUPPORT_API_PATH}/conversations?${qs.toString()}`,
  );
  if (typeof raw !== 'object' || raw === null) {
    return { content: [], totalElements: 0, number: pageZero, size };
  }
  const root = raw as Record<string, unknown>;
  const contentRaw = Array.isArray(root.content) ? root.content : [];
  const out: SupportConversation[] = [];
  for (const row of contentRaw) {
    const conv = parseSupportConversationRow(row);
    if (conv) {
      out.push(conv);
    }
  }
  const totalElements =
    typeof root.totalElements === 'number' ? root.totalElements
    : typeof root.total_elements === 'number' ? root.total_elements
    : out.length;
  return {
    content: sortSupportConversations(out),
    totalElements: Number.isFinite(totalElements) ? totalElements : out.length,
    number: typeof root.number === 'number' ? root.number : pageZero,
    size: typeof root.size === 'number' ? root.size : size,
  };
}

export async function fetchAdminSupportMessages(
  storeId: string,
  pageZero: number,
): Promise<Page<SupportMessage>> {
  const sid = storeId.trim();
  if (!sid) {
    return { content: [], totalElements: 0, number: 0, size: SUPPORT_MESSAGES_PAGE_SIZE };
  }
  const page = Number.isFinite(pageZero) && pageZero >= 0 ? Math.floor(pageZero) : 0;
  const size = SUPPORT_MESSAGES_PAGE_SIZE;

  if (import.meta.env.DEV) {
    await devDelay(undefined);
    const sorted = sortSupportBySentAt(devSupportMessagesByStore[sid] ?? []);
    const start = page * size;
    const slice = sorted.slice(start, start + size);
    return {
      content: slice.map((m) => ({ ...m })),
      totalElements: sorted.length,
      number: page,
      size,
    };
  }

  const qs = new URLSearchParams({ page: String(page), size: String(size) });
  const raw = await apiClient.get<unknown>(
    `${ADMIN_SUPPORT_API_PATH}/conversations/${encodeURIComponent(sid)}/messages?${qs.toString()}`,
  );
  if (typeof raw !== 'object' || raw === null) {
    return { content: [], totalElements: 0, number: page, size };
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
  out.sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
  const totalElements =
    typeof root.totalElements === 'number' ? root.totalElements
    : typeof root.total_elements === 'number' ? root.total_elements
    : out.length;
  return {
    content: out,
    totalElements,
    number: typeof root.number === 'number' ? root.number : page,
    size: typeof root.size === 'number' ? root.size : size,
  };
}

export type SendAdminSupportPayload = SendSupportPayload;

export async function sendAdminSupportMessage(
  storeId: string,
  payload: SendAdminSupportPayload,
): Promise<SupportMessage> {
  const sid = storeId.trim();
  const text = payload.content.trim();
  const attachmentUrlTrim = typeof payload.attachmentUrl === 'string' ? payload.attachmentUrl.trim() : '';
  const hasAttach = attachmentUrlTrim.length > 0;
  const kind = payload.attachmentType;

  if (!sid) {
    throw new Error('Tienda inválida.');
  }
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
      id: `support-admin-${String(devSupportSendCounter)}-${String(Date.now())}`,
      senderId: 'admin-dev',
      senderRole: 'ADMIN',
      content: text,
      attachmentUrl: hasAttach ? attachmentUrlTrim : null,
      attachmentType: hasAttach && kind !== undefined ? kind : null,
      sentAt: new Date().toISOString(),
    };
    if (!devSupportMessagesByStore[sid]) {
      devSupportMessagesByStore[sid] = [];
    }
    devApplySupportMessage(sid, msg, false);
    return { ...msg };
  }

  const raw = await apiClient.post<unknown>(
    `${ADMIN_SUPPORT_API_PATH}/conversations/${encodeURIComponent(sid)}/messages`,
    {
      content: text,
      ...(hasAttach ?
        {
          attachmentUrl: attachmentUrlTrim,
          ...(kind !== undefined ? { attachmentType: kind } : {}),
        }
      : {}),
    },
  );
  const m = parseSupportMessageRow(raw);
  if (!m) {
    throw new Error('Respuesta de soporte inválida.');
  }
  return m;
}

export async function markConversationAsRead(storeId: string): Promise<void> {
  const sid = storeId.trim();
  if (!sid) {
    return;
  }

  if (import.meta.env.DEV) {
    await devDelay(undefined, 80);
    const conv = devSupportConversations.find((c) => c.storeId === sid);
    if (conv) {
      conv.unreadCount = 0;
    }
    return;
  }

  await apiClient.post<void>(
    `${ADMIN_SUPPORT_API_PATH}/conversations/${encodeURIComponent(sid)}/read`,
  );
}

/** Registra o actualiza metadata de conversación DEV (Admin). */
export function registerDevSupportConversation(
  meta: Pick<SupportConversation, 'storeId' | 'businessName' | 'sellerEmail' | 'sellerName'>,
): void {
  if (!import.meta.env.DEV) {
    return;
  }
  const messages = devSupportMessagesByStore[meta.storeId] ?? [];
  const ix = devSupportConversations.findIndex((c) => c.storeId === meta.storeId);
  if (ix < 0) {
    devSupportConversations.push({
      ...meta,
      lastMessage: lastMessageFromThread(messages),
      unreadCount: 0,
    });
  } else {
    const cur = devSupportConversations[ix];
    if (!cur) {
      return;
    }
    devSupportConversations[ix] = {
      ...cur,
      businessName: meta.businessName,
      sellerEmail: meta.sellerEmail,
      sellerName: meta.sellerName,
      lastMessage: lastMessageFromThread(messages),
    };
  }
  devSupportConversations = sortSupportConversations(devSupportConversations);
}
