/** Rol del autor en el hilo seller ↔ admin (Paso 19). */
export type SupportSenderRole = 'SELLER' | 'ADMIN';

export type SupportAttachmentType = 'image' | 'pdf';

/**
 * Mensaje en el canal de soporte técnico (conversación implícita por vendedor autenticado).
 */
export interface SupportMessage {
  id: string;
  senderId: string;
  senderRole: SupportSenderRole;
  /** Puede ser vacío si el mensaje sólo lleva adjunto. */
  content: string;
  attachmentUrl: string | null;
  attachmentType: SupportAttachmentType | null;
  sentAt: string;
}

/** Preview del último mensaje en la bandeja Admin (Paso 27). */
export type SupportConversationLastMessage = {
  /** Null si el último mensaje fue sólo un adjunto. */
  content: string | null;
  attachmentType: SupportAttachmentType | null;
  sentAt: string;
  senderRole: SupportSenderRole;
};

/** Conversación permanente Admin ↔ tienda (Paso 27). */
export type SupportConversation = {
  storeId: string;
  businessName: string;
  sellerEmail: string;
  sellerName: string | null;
  lastMessage: SupportConversationLastMessage | null;
  /** Mensajes del seller no leídos por el Admin. */
  unreadCount: number;
};
