import type { Page } from './api';

/**
 * Conversación en panel seller ↔ compradores (Paso 18).
 */
export interface SellerChatConversation {
  id: string;
  buyerName: string;
  lastMessageContent: string;
  lastMessageAt: string;
  unreadCount: number;
}

/** Rol del autor del mensaje en la conversación seller–buyer */
export type SellerChatSenderRole = 'BUYER' | 'SELLER';

/** Mensaje de chat dentro de una conversación. */
export interface SellerChatMessage {
  id: string;
  conversationId: string;
  senderRole: SellerChatSenderRole;
  content: string;
  sentAt: string;
}

/** Hilo de mensajes paginado (Spring `Page<SellerChatMessage>`). */
export type SellerChatMessagesPage = Page<SellerChatMessage>;

/** Listado de conversaciones paginado (Spring `Page<SellerChatConversation>`). */
export type SellerChatConversationsPage = Page<SellerChatConversation>;
