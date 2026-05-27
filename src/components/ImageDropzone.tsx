import { AlertCircle, ImagePlus, Trash2 } from 'lucide-react';
import {
  type ChangeEvent,
  type DragEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

import { PRODUCT_IMAGE_MAX_COUNT } from '../lib/constants';
import type { ImageUploadOptions, ImageUploadResult, ImageUploader } from '../lib/uploads/imageUploader';
import { backendImageUploader } from '../lib/uploads/backendImageUploader';
import { cn } from '../lib/cn';

const ALLOW_IMAGE_RE = /^image\/(jpeg|jpg|png|pjpeg|webp|gif)$/i;
const ACCEPT_ATTR = 'image/jpeg,image/png,image/webp,image/gif';
const MAX_BYTES = 10 * 1024 * 1024;

function newLocalId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function fileDedupeKey(file: File): string {
  return `${file.name}|${file.size}|${file.lastModified}`;
}

function validateImageFile(file: File): string | null {
  if (!file?.size) {
    return 'Elegí un archivo de imagen válido.';
  }
  const t = file.type.toLowerCase().trim();
  if (t === 'image/svg+xml') {
    return 'No se permiten imágenes SVG.';
  }
  if (!t.startsWith('image/') || !ALLOW_IMAGE_RE.test(t)) {
    return `Formatos permitidos: JPG, PNG, WEBP y GIF hasta ${MAX_BYTES / (1024 * 1024)} MB.`;
  }
  if (file.size > MAX_BYTES) {
    return `La imagen no puede superar ${MAX_BYTES / (1024 * 1024)} MB.`;
  }
  return null;
}

type SlotBase = { id: string; fileKey: string; fileName: string; previewUrl: string | null };

export type UploadSlot =
  | (SlotBase & { status: 'uploading' })
  | (SlotBase & {
      status: 'done';
      url: string;
      result: ImageUploadResult;
    })
  | (SlotBase & { status: 'error'; errorMessage: string });

export type ImageDropzoneProps = {
  uploader?: ImageUploader;
  /** @default PRODUCT_IMAGE_MAX_COUNT (4) */
  maxFiles?: number;
  uploadOptions?: ImageUploadOptions;
  stagingSessionId?: string;
  onUploaded?: (result: ImageUploadResult, allSuccessfulUrls: string[]) => void;
  onUrlsChange?: (urls: string[]) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
  className?: string;
};

type WorkUnit = SlotBase & { file: File; previewUrl: string };

function collectSuccessfulUrls(slots: readonly UploadSlot[]): string[] {
  return slots.filter((s): s is Extract<UploadSlot, { status: 'done' }> => s.status === 'done').map((s) => s.url);
}

type PlanOk = {
  ok: true;
  nextItems: UploadSlot[];
  workUnits: WorkUnit[];
  extraMessages: string[];
};

type PlanFail = { ok: false; message: string };

type PlanResult = PlanOk | PlanFail;

function planFileIngestion(prev: readonly UploadSlot[], rawFiles: ArrayLike<File> | Iterable<File>, maxFiles: number): PlanResult {
  const fileArray = Array.from(rawFiles);

  for (const file of fileArray) {
    const err = validateImageFile(file);
    if (err) {
      return { ok: false, message: err };
    }
  }

  const capacity = maxFiles - prev.length;
  if (capacity <= 0) {
    return { ok: false, message: `Podés cargar hasta ${maxFiles} imágenes.` };
  }

  const existingKeys = new Set(prev.map((p) => p.fileKey));
  let skippedDuplicates = 0;
  const work: WorkUnit[] = [];
  const extraMessages: string[] = [];

  for (const file of fileArray) {
    const fk = fileDedupeKey(file);
    if (existingKeys.has(fk)) {
      skippedDuplicates += 1;
      continue;
    }
    if (work.length >= capacity) {
      break;
    }
    existingKeys.add(fk);
    const previewUrl = URL.createObjectURL(file);
    work.push({
      id: newLocalId(),
      fileKey: fk,
      fileName: file.name,
      previewUrl,
      file,
    });
  }

  if (skippedDuplicates > 0) {
    extraMessages.push('Alguna imagen ya estaba en la lista y se omitió.');
  }

  if (work.length === 0) {
    if (skippedDuplicates === fileArray.length) {
      return { ok: false, message: 'Todas las imágenes ya estaban seleccionadas.' };
    }
    return { ok: false, message: extraMessages[0] ?? 'No se pudo agregar imágenes.' };
  }

  const totalSelected = fileArray.length;
  const addedCount = work.length;
  if (totalSelected > skippedDuplicates + addedCount) {
    extraMessages.push(`Solo se agregaron ${addedCount} imagen(es) (máximo ${maxFiles} en total).`);
  }

  const uploadingSlots: UploadSlot[] = work.map((u) => ({
    id: u.id,
    fileKey: u.fileKey,
    fileName: u.fileName,
    previewUrl: u.previewUrl,
    status: 'uploading',
  }));

  return {
    ok: true,
    nextItems: [...prev, ...uploadingSlots],
    workUnits: work,
    extraMessages,
  };
}

export function ImageDropzone({
  uploader,
  maxFiles = PRODUCT_IMAGE_MAX_COUNT,
  uploadOptions,
  stagingSessionId,
  onUploaded,
  onUrlsChange,
  onError,
  disabled = false,
  className,
}: ImageDropzoneProps) {
  const strategy = uploader ?? backendImageUploader;
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef<UploadSlot[]>([]);
  const [items, setItems] = useState<UploadSlot[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const resolvedUploadOptions = useMemo<ImageUploadOptions>(() => {
    const base = uploadOptions ?? {};
    const trimmed = stagingSessionId?.trim();
    if (!trimmed) {
      return base;
    }
    return { ...base, stagingSessionId: trimmed };
  }, [stagingSessionId, uploadOptions]);

  const optionsRef = useRef(resolvedUploadOptions);
  optionsRef.current = resolvedUploadOptions;

  const onUploadedRef = useRef(onUploaded);
  onUploadedRef.current = onUploaded;

  /** Evita bucles infinitos si el padre pasa handler inline (cambia identidad cada render). */
  const onUrlsChangeRef = useRef(onUrlsChange);
  onUrlsChangeRef.current = onUrlsChange;

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const successfulUrlsOrdered = useMemo(() => collectSuccessfulUrls(items), [items]);

  useEffect(() => {
    onUrlsChangeRef.current?.(successfulUrlsOrdered);
  }, [successfulUrlsOrdered]);

  const reportError = useCallback(
    (message: string) => {
      onError?.(message);
    },
    [onError],
  );

  const revokeIfNeeded = useCallback((url: string | null) => {
    if (url) {
      URL.revokeObjectURL(url);
    }
  }, []);

  const removeItem = useCallback(
    (id: string) => {
      setItems((prev) => {
        const target = prev.find((x) => x.id === id);
        if (target) {
          revokeIfNeeded(target.previewUrl);
        }
        return prev.filter((x) => x.id !== id);
      });
    },
    [revokeIfNeeded],
  );

  const startUploadWorkers = useCallback(
    (units: readonly WorkUnit[]) => {
      for (const unit of units) {
        void strategy
          .upload(unit.file, optionsRef.current)
          .then((result) => {
            setItems((prev) => {
              const idx = prev.findIndex((s) => s.id === unit.id);
              if (idx === -1) {
                return prev;
              }
              const slot = prev[idx];
              if (!slot || slot.status !== 'uploading') {
                return prev;
              }

              const next = [...prev];
              next[idx] = {
                id: slot.id,
                fileKey: slot.fileKey,
                fileName: slot.fileName,
                previewUrl: slot.previewUrl,
                status: 'done',
                url: result.url,
                result,
              };
              const urls = collectSuccessfulUrls(next);
              onUploadedRef.current?.(result, urls);
              return next;
            });
          })
          .catch((e: unknown) => {
            const msg = e instanceof Error ? e.message : 'No se pudo subir la imagen.';
            reportError(msg);
            setItems((prev) => {
              const idx = prev.findIndex((s) => s.id === unit.id);
              if (idx === -1) {
                return prev;
              }
              const slot = prev[idx];
              if (!slot || slot.status !== 'uploading') {
                return prev;
              }
              revokeIfNeeded(slot.previewUrl);
              const next = [...prev];
              next[idx] = {
                id: slot.id,
                fileKey: slot.fileKey,
                fileName: slot.fileName,
                previewUrl: null,
                status: 'error',
                errorMessage: msg,
              };
              return next;
            });
          });
      }
    },
    [reportError, revokeIfNeeded, strategy],
  );

  const ingestRawFiles = useCallback(
    (rawList: ArrayLike<File>) => {
      if (disabled) {
        return;
      }

      const planned = planFileIngestion(itemsRef.current, rawList, maxFiles);
      if (!planned.ok) {
        reportError(planned.message);
        return;
      }

      for (const m of planned.extraMessages) {
        reportError(m);
      }

      setItems(planned.nextItems);
      queueMicrotask(() => {
        if (planned.workUnits.length > 0) {
          startUploadWorkers(planned.workUnits);
        }
      });
    },
    [disabled, maxFiles, reportError, startUploadWorkers],
  );

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && items.length < maxFiles) {
      setDragOver(true);
    }
  };

  const onDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (disabled) {
      return;
    }
    if (e.dataTransfer.files?.length) {
      ingestRawFiles(e.dataTransfer.files);
    }
  };

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (disabled) {
      return;
    }
    if (e.target.files?.length) {
      ingestRawFiles(e.target.files);
    }
    e.target.value = '';
  };

  const canAddMore = items.length < maxFiles;
  const hasActiveUpload = items.some((i) => i.status === 'uploading');
  const dropZoneBusy = disabled || !canAddMore;

  const dropLabel =
    dragOver && canAddMore
      ? `Soltá hasta ${maxFiles - items.length} imagen(es)…`
      : hasActiveUpload
        ? `Subiendo… (${items.filter((x) => x.status === 'uploading').length} en curso)`
        : !canAddMore
          ? 'Límite de imágenes alcanzado'
          : 'Arrastrá imágenes o hacé clic';

  return (
    <div className={cn('space-y-4', className)}>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={ACCEPT_ATTR}
        multiple
        className="sr-only"
        disabled={disabled || !canAddMore}
        aria-disabled={disabled || !canAddMore}
        aria-label="Seleccionar imágenes de producto"
        onChange={onInputChange}
      />

      <div className="relative">
        <label
          htmlFor={inputId}
          className={cn(
            'group flex min-h-[180px] cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors',
            dropZoneBusy ? 'cursor-not-allowed opacity-60' : 'hover:border-brand/60 hover:bg-brand/5',
            dragOver && canAddMore ? 'border-brand bg-brand/10' : 'border-[var(--border)] bg-[var(--bg-input)]',
            !dropZoneBusy &&
              'focus-within:ring-2 focus-within:ring-brand focus-within:ring-offset-2 focus-within:ring-offset-[var(--bg-base)]',
          )}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          <div className="flex size-12 items-center justify-center rounded-xl bg-brand/15 transition-transform group-hover:scale-[1.02]">
            <ImagePlus className="size-7 text-brand" aria-hidden />
          </div>
          <div className="space-y-1 px-2">
            <p className="text-sm font-medium text-[var(--text-primary)]">{dropLabel}</p>
            <p className="text-xs text-[var(--text-muted)]">
              Hasta {maxFiles} imágenes · JPG / PNG / WEBP / GIF · máx. {MAX_BYTES / (1024 * 1024)} MB c/u ·{' '}
              {stagingSessionId || uploadOptions?.stagingSessionId
                ? 'las URLs quedan bajo staging en backend hasta confirmar'
                : 'sin staging (pasá stagingSessionId al crear borrador de producto)'}
            </p>
          </div>
        </label>
      </div>

      {canAddMore && !disabled ? (
        <button
          type="button"
          disabled={disabled}
          className="w-full rounded-lg border border-[var(--border)] py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-hover)] hover:bg-[var(--bg-hover)] disabled:opacity-60"
          onClick={() => inputRef.current?.click()}
        >
          Agregar desde el equipo
        </button>
      ) : null}

      {items.length > 0 ? (
        <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {items.map((slot) => (
            <li
              key={slot.id}
              className={cn(
                'relative overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-card)]',
              )}
            >
              <div className="relative aspect-square bg-[var(--bg-input)]">
                {slot.status === 'error' ? (
                  <div className="flex h-full flex-col items-center justify-center gap-2 p-3 text-center text-xs text-danger">
                    <AlertCircle className="size-6 shrink-0" aria-hidden />
                    <span>{slot.errorMessage}</span>
                  </div>
                ) : slot.previewUrl ? (
                  <img
                    src={slot.previewUrl}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : null}

                {slot.status === 'uploading' ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <output className="h-10 w-10 animate-spin rounded-full border-2 border-brand border-t-transparent motion-reduce:animate-none" />
                  </div>
                ) : null}
              </div>

              <div className="flex items-center gap-2 border-t border-[var(--border)] p-2">
                <span className="min-w-0 flex-1 truncate text-[10px] text-[var(--text-muted)]" title={slot.fileName}>
                  {slot.fileName}
                </span>
                <button
                  type="button"
                  className="rounded p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-danger"
                  aria-label={`Quitar imagen ${slot.fileName}`}
                  onClick={() => removeItem(slot.id)}
                  disabled={disabled}
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>

              {slot.status === 'done' ? (
                <a
                  href={slot.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="block truncate px-2 py-1 text-center text-[10px] text-[var(--text-link)] underline-offset-2 hover:underline"
                >
                  URL
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
