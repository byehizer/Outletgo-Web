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
