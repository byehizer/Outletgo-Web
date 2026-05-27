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
