import { format, isValid, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { FileText } from 'lucide-react';

import { cn } from '../../lib/cn';
import type { SellerChatSenderRole } from '../../types/chat';

export type MessageBubbleRole = SellerChatSenderRole | 'ADMIN';

export type MessageBubbleProps = {
  senderRole: MessageBubbleRole;
  content: string;
  sentAt: string;
  /** Encima de la burbuja (p. ej. "Soporte"). */
  senderLabel?: string;
  attachmentUrl?: string | null;
  attachmentType?: 'image' | 'pdf' | null;
  /** Nombre a mostrar en PDF cuando no viene del backend. */
  attachmentFileName?: string | null;
};

function shortClock(iso: string): string {
  const date = parseISO(iso);
  if (!isValid(date)) {
    return '—';
  }
  return format(date, 'HH:mm', { locale: es });
}

/** Nombre de archivo desde URL como último recurso. */
function fileNameFromUrl(url: string): string {
  try {
    const pathname = url.startsWith('http') ? new URL(url).pathname : url.replace(/^[./]+/, '');
    const leaf = pathname.split('/').pop() ?? 'archivo.pdf';
    return decodeURIComponent(leaf) || leaf;
  } catch {
    return 'Adjunto';
  }
}

function safeOpenUrl(url: string): void {
  if (typeof url !== 'string' || url.trim() === '') {
    return;
  }
  window.open(url.trim(), '_blank', 'noopener,noreferrer');
}

/**
 * Burbuja de chat presentacional — BUYER / ADMIN a la izquierda; SELLER a la derecha.
 */
export function MessageBubble({
  senderRole,
  content,
  sentAt,
  senderLabel,
  attachmentUrl,
  attachmentType,
  attachmentFileName,
}: MessageBubbleProps) {
  const isSeller = senderRole === 'SELLER';
  const trimmed = typeof content === 'string' ? content.trim() : '';
  const attach = typeof attachmentUrl === 'string' && attachmentUrl.trim() !== '' ? attachmentUrl.trim() : null;

  const displayAttachmentType =
    attach === null ?
      null
    : attachmentType !== undefined && attachmentType !== null ?
      attachmentType
    : attach.toLowerCase().endsWith('.pdf') || attach.startsWith('data:application/pdf')
      ? 'pdf'
      : ('image' as const);

  let pdfDisplayName =
    attachmentFileName && attachmentFileName.trim() !== '' ? attachmentFileName.trim() : '';
  if (attach && pdfDisplayName === '' && displayAttachmentType === 'pdf') {
    pdfDisplayName = fileNameFromUrl(attach);
  }

  return (
    <div className={cn('flex w-full flex-col gap-1', isSeller ? 'items-end' : 'items-start')}>
      {senderLabel ?
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          {senderLabel}
        </span>
      : null}

      <div className={cn('flex w-full', isSeller ? 'justify-end' : 'justify-start')}>
        <div
          className={cn(
            'max-w-[min(100%,320px)] rounded-2xl px-4 py-2 text-sm shadow-sm',
            isSeller ?
              'rounded-br-md bg-brand-dark text-white'
            : 'rounded-bl-md bg-[var(--bg-input)] text-[var(--text-primary)]',
          )}
        >
          {attach ?
            <div className="mb-2">
              {displayAttachmentType === 'image' ?
                <button
                  type="button"
                  className={cn(
                    'block overflow-hidden rounded-lg border outline-none transition-opacity focus-visible:ring-2',
                    isSeller ? 'border-white/30 focus-visible:ring-white/80' : 'border-[var(--border)] focus-visible:ring-brand',
                  )}
                  aria-label="Abrir imagen en pestaña nueva"
                  onClick={() => safeOpenUrl(attach)}
                >
                  <img src={attach} alt="" className="max-h-40 w-full object-cover" />
                </button>
              : displayAttachmentType === 'pdf' ?
                <div
                  className={cn(
                    'flex gap-3 rounded-lg border px-3 py-2',
                    isSeller ? 'border-white/30 bg-white/10' : 'border-[var(--border)] bg-[var(--bg-card)]',
                  )}
                >
                  <span
                    className={cn(
                      'flex size-10 shrink-0 items-center justify-center rounded-md',
                      isSeller ? 'bg-white/15 text-white' : 'bg-brand/10 text-brand',
                    )}
                  >
                    <FileText className="h-6 w-6" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p
                      className={cn(
                        'truncate text-xs font-semibold sm:text-sm',
                        isSeller ? 'text-white' : 'text-[var(--text-primary)]',
                      )}
                    >
                      {pdfDisplayName}
                    </p>
                    <button
                      type="button"
                      className={cn(
                        'mt-1 text-[11px] font-semibold underline-offset-4 hover:underline sm:text-xs',
                        isSeller ? 'text-white/90 hover:text-white' : 'text-[var(--text-link)]',
                      )}
                      onClick={() => safeOpenUrl(attach)}
                    >
                      Abrir PDF
                    </button>
                  </div>
                </div>
              : null}
            </div>
          : null}

          {trimmed.length > 0 ?
            <p className="whitespace-pre-wrap break-words leading-relaxed">{trimmed}</p>
          : null}

          <time
            className={cn(
              'mt-1 block text-right text-[11px]',
              isSeller ? 'text-white/70' : 'text-[var(--text-muted)]',
            )}
            dateTime={sentAt}
          >
            {shortClock(sentAt)}
          </time>
        </div>
      </div>
    </div>
  );
}
