import { zodResolver } from '@hookform/resolvers/zod';
import { FileText, Loader2, Paperclip, Send, X } from 'lucide-react';
import type { MutableRefObject, ReactNode } from 'react';
import { useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { cn } from '../../lib/cn';
import { ApiError } from '../../lib/http/apiClient';
import { backendImageUploader } from '../../lib/uploads/backendImageUploader';
import { devMockImageUploader } from '../../lib/uploads/devMockImageUploader';
import type { ImageUploader } from '../../lib/uploads/imageUploader';

export const SUPPORT_ATTACHMENT_ACCEPT =
  'image/jpeg,image/png,image/webp,application/pdf' as const;

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

const composerSchema = z.object({
  text: z.string(),
});

export type ComposerSendPayload = {
  /** Texto opcional cuando hay adjunto. */
  content: string;
  attachmentUrl?: string;
  attachmentType?: 'image' | 'pdf';
};

export type ComposerProps = {
  disabled?: boolean;
  imageUploader?: ImageUploader;
  allowAttachments?: boolean;
  /** Si existe, se pasa al `multipart` como `stagingSessionId` (mismo contrato que productos). */
  stagingSessionId?: string;
  onSend: (payload: ComposerSendPayload) => void | Promise<void>;
};

const defaultUploader: ImageUploader = import.meta.env.DEV ? devMockImageUploader : backendImageUploader;

type ComposerValues = z.infer<typeof composerSchema>;

function messageFromUploadError(err: unknown): string {
  if (err instanceof ApiError) {
    return err.message;
  }
  if (err instanceof Error && err.message.length > 0) {
    return err.message;
  }
  return 'No se pudo subir el archivo. Probá de nuevo.';
}

/** MIME y extensión → tipo de preview (algunos navegadores dejan MIME vacío). */
function attachmentKind(file: File): 'image' | 'pdf' | null {
  if (file.type.startsWith('image/')) {
    return 'image';
  }
  if (file.type === 'application/pdf') {
    return 'pdf';
  }
  const lower = file.name.toLowerCase();
  if (/\.pdf$/i.test(lower)) {
    return 'pdf';
  }
  if (/\.(png|jpg|jpeg|webp)$/i.test(lower)) {
    return 'image';
  }
  return null;
}

function revokePreviewBlob(url?: string | null): void {
  if (typeof url === 'string' && url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}

type AttachmentDraft =
  | { status: 'idle' }
  | { status: 'uploading'; fileName: string; previewKind: 'image' | 'pdf'; localPreview?: string | null }
  | { status: 'ready'; fileName: string; url: string; kind: 'image' | 'pdf' }
  | { status: 'error'; message: string; fileName?: string };

/**
 * Sala de escritura reusable (texto + adjuntos opcionales Paso 19).
 */
export function Composer({
  disabled,
  allowAttachments = false,
  imageUploader,
  stagingSessionId,
  onSend,
}: ComposerProps) {
  const defaultValues = useMemo((): ComposerValues => ({ text: '' }), []);
  const textInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploaderRef: MutableRefObject<ImageUploader> = useRef(imageUploader ?? defaultUploader);
  uploaderRef.current = imageUploader ?? defaultUploader;

  const [attachment, setAttachment] = useState<AttachmentDraft>({ status: 'idle' });

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { isSubmitting },
  } = useForm<ComposerValues>({
    resolver: zodResolver(composerSchema),
    defaultValues,
  });

  const raw = watch('text');
  const trimmed = typeof raw === 'string' ? raw.trim() : '';

  /** Limpia adjunto previo / revoca blob temporal. */
  const removeAttachment = (): void => {
    setAttachment((prev) => {
      if (prev.status === 'uploading') {
        revokePreviewBlob(prev.localPreview);
      }
      return { status: 'idle' };
    });
    const input = fileInputRef.current;
    if (input) {
      input.value = '';
    }
  };

  const submitDisabled =
    disabled === true ||
    isSubmitting === true ||
    attachment.status === 'uploading' ||
    (allowAttachments ?
      trimmed === '' && attachment.status !== 'ready'
    : trimmed === '');

  const onPickFileClick = (): void => {
    if (disabled === true || allowAttachments !== true || attachment.status === 'uploading') {
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileSelection = async (list: FileList | null): Promise<void> => {
    const file = list?.[0];
    if (!file || allowAttachments !== true || disabled === true) {
      return;
    }

    removeAttachment();

    if (file.size > MAX_ATTACHMENT_BYTES) {
      setAttachment({
        status: 'error',
        message: 'El archivo no puede superar 10MB',
        fileName: file.name,
      });
      return;
    }

    const kind = attachmentKind(file);
    if (kind === null) {
      setAttachment({
        status: 'error',
        message: 'Formato no válido. Aceptamos JPEG, PNG, WebP y PDF.',
        fileName: file.name,
      });
      return;
    }

    let localPreviewUrl: string | null = null;
    if (kind === 'image') {
      localPreviewUrl = URL.createObjectURL(file);
    }

    setAttachment({
      status: 'uploading',
      fileName: file.name,
      previewKind: kind,
      localPreview: localPreviewUrl,
    });

    try {
      const trimmedStaging = stagingSessionId?.trim();
      const uploadOpts =
        trimmedStaging !== undefined && trimmedStaging !== '' ?
          { stagingSessionId: trimmedStaging }
        : undefined;

      const result =
        uploadOpts !== undefined ?
          await uploaderRef.current.upload(file, uploadOpts)
        : await uploaderRef.current.upload(file);
      const url = result.url?.trim();
      if (!url) {
        throw new Error('El servidor no devolvió una URL del archivo.');
      }
      revokePreviewBlob(localPreviewUrl);
      localPreviewUrl = null;
      setAttachment({
        status: 'ready',
        fileName: file.name,
        url,
        kind,
      });
    } catch (err: unknown) {
      revokePreviewBlob(localPreviewUrl);
      setAttachment({
        status: 'error',
        message: messageFromUploadError(err),
        fileName: file.name,
      });
    }
  };

  const { ref: textFieldRefFromRHF, ...textFieldRegisterProps } = register('text');

  const onSubmit = handleSubmit(({ text }) => {
    const body = typeof text === 'string' ? text.trim() : '';

    if (attachment.status === 'error' && body !== '') {
      removeAttachment();
    }

    if (attachment.status === 'uploading') {
      return;
    }
    const attReady = attachment.status === 'ready';
    const attPayload =
      attReady ?
        {
          attachmentUrl: attachment.url,
          attachmentType: attachment.kind,
        }
      : undefined;

    if (body === '' && !attReady) {
      return;
    }

    reset({ ...defaultValues });
    if (attReady) {
      removeAttachment();
    }

    const payload: ComposerSendPayload = {
      content: body,
      ...attPayload,
    };
    void Promise.resolve(onSend(payload));
    queueMicrotask(() => {
      textInputRef.current?.focus();
    });
  });

  let previewUi: ReactNode = null;

  if (allowAttachments === true && attachment.status !== 'idle') {
    if (attachment.status === 'uploading') {
      previewUi = (
        <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm">
          {attachment.previewKind === 'image' && attachment.localPreview ?
            <img
              alt=""
              src={attachment.localPreview}
              className="h-16 w-16 shrink-0 rounded-md border border-[var(--border)] object-cover"
            />
          : attachment.previewKind === 'pdf' ?
            <span className="flex size-12 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-brand/10 text-brand">
              <FileText className="h-6 w-6" aria-hidden />
            </span>
          : null}
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-[var(--text-primary)]">{attachment.fileName}</p>
            <p className="mt-1 flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Subiendo…
            </p>
          </div>
        </div>
      );
    } else if (attachment.status === 'ready') {
      previewUi = (
        <div className="relative flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm">
          {attachment.kind === 'image' ?
            <button
              type="button"
              className="shrink-0 overflow-hidden rounded-md border border-[var(--border)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
              onClick={() => {
                window.open(attachment.url, '_blank', 'noopener,noreferrer');
              }}
              aria-label="Ver imagen en pestaña nueva"
            >
              <img
                alt={attachment.fileName}
                src={attachment.url}
                className="h-16 w-16 object-cover"
              />
            </button>
          : <span className="flex size-12 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-brand/10 text-brand">
              <FileText className="h-6 w-6" aria-hidden />
            </span>}
          <div className="min-w-0 flex-1 pr-8">
            <p className="truncate font-medium text-[var(--text-primary)]">{attachment.fileName}</p>
            <button
              type="button"
              className="mt-1 text-xs font-semibold text-[var(--text-link)] underline-offset-2 hover:underline"
              onClick={() => {
                window.open(attachment.url, '_blank', 'noopener,noreferrer');
              }}
            >
              {attachment.kind === 'pdf' ? 'Abrir PDF' : 'Abrir imagen'}
            </button>
          </div>
          <button
            type="button"
            aria-label="Quitar adjunto"
            className="absolute right-2 top-2 rounded-md p-1 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]"
            onClick={removeAttachment}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      );
    } else if (attachment.status === 'error') {
      previewUi = (
        <div className="flex items-start justify-between gap-2 rounded-lg border border-danger/40 bg-danger/5 px-3 py-2">
          <p className="text-sm text-danger" role="alert">
            <span className="font-semibold">{attachment.fileName ? `${attachment.fileName}: ` : ''}</span>
            {attachment.message}
          </p>
          <button
            type="button"
            aria-label="Cerrar error"
            className="shrink-0 rounded-md p-1 text-danger hover:bg-danger/10"
            onClick={removeAttachment}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      );
    }
  }

  return (
    <form
      className={cn(
        'w-full min-w-0 border-t border-[var(--border)] bg-[var(--bg-card)] p-3 md:p-4',
        allowAttachments ? 'space-y-2' : 'flex gap-2',
        disabled === true ? 'opacity-60' : null,
      )}
      onSubmit={onSubmit}
    >
      {allowAttachments === true ?
        <input
          ref={fileInputRef}
          type="file"
          className="sr-only"
          accept={String(SUPPORT_ATTACHMENT_ACCEPT)}
          tabIndex={-1}
          onChange={(e) => void handleFileSelection(e.target.files)}
        />
      : null}

      {previewUi}

      <div className={cn('flex w-full min-w-0 gap-2', allowAttachments !== true ? 'flex-1' : '')}>
        {allowAttachments === true ?
          <button
            type="button"
            className={cn(
              'flex h-11 min-w-11 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-input)]',
              disabled === true || attachment.status === 'uploading' ? 'cursor-not-allowed opacity-50' : null,
            )}
            aria-label="Adjuntar archivo"
            disabled={disabled === true || attachment.status === 'uploading'}
            onClick={onPickFileClick}
          >
            <Paperclip className="h-5 w-5" aria-hidden />
          </button>
        : null}
        <input
          {...textFieldRegisterProps}
          ref={(element) => {
            textInputRef.current = element;
            textFieldRefFromRHF(element);
          }}
          aria-label={allowAttachments ? 'Escribí un mensaje (opcional si hay archivo)' : 'Escribí un mensaje'}
          placeholder={allowAttachments ? 'Mensaje (opcional si adjuntás un archivo)' : 'Escribí un mensaje…'}
          disabled={disabled === true}
          className={cn(
            'h-11 min-h-11 min-w-0 w-full flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--border-focus)] disabled:cursor-not-allowed',
          )}
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={submitDisabled}
          aria-label="Enviar mensaje"
          title="Enviar"
          className={cn(
            'flex h-11 min-w-11 shrink-0 items-center justify-center rounded-lg bg-brand text-white transition-opacity hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-brand-dark/70 disabled:opacity-50',
          )}
        >
          <Send className="h-5 w-5" aria-hidden />
        </button>
      </div>
    </form>
  );
}
