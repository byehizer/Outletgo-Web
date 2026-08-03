import { Upload, Trash2, Crop, Info, Image as ImageIcon } from 'lucide-react';
import React, { useRef, useState } from 'react';

interface BannerImageUploaderProps {
  currentUrl: string;
  onImageSelected: (rawUrl: string) => void;
  onRemoveImage: () => void;
  onOpenCropper: () => void;
  onError: (msg: string) => void;
  maxMb?: number;
}

export function BannerImageUploader({
  currentUrl,
  onImageSelected,
  onRemoveImage,
  onOpenCropper,
  onError,
  maxMb = 50,
}: BannerImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      onError('El archivo seleccionado no es una imagen válida.');
      return;
    }

    const maxBytes = maxMb * 1024 * 1024;
    if (file.size > maxBytes) {
      onError(`La imagen supera el límite permitido de ${maxMb} MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        onImageSelected(result);
      }
    };
    reader.onerror = () => {
      onError('No se pudo leer la imagen seleccionada.');
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  return (
    <div className="space-y-4">
      {/* Mensaje Informativo de Píxeles Recomendados */}
      <div className="flex items-start gap-2.5 rounded-xl border border-brand/20 bg-brand/5 p-3.5 text-xs text-[var(--text-primary)]">
        <Info className="size-4 text-brand shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-semibold text-brand">Medidas recomendadas para la App Móvil y Web</p>
          <p className="text-[var(--text-secondary)] leading-relaxed">
            Se recomienda subir gráficas en <strong className="text-[var(--text-primary)]">1200 x 400 px</strong> (Proporción <code className="text-brand font-bold">3:1</code>) o <strong className="text-[var(--text-primary)]">1200 x 675 px</strong> (<code className="text-brand font-bold">16:9</code>). Admite PNG, JPG, WEBP o GIF de hasta <strong>{maxMb} MB</strong>.
          </p>
        </div>
      </div>

      {/* Zona de Carga / Dropzone para 1 Imagen */}
      {!currentUrl ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition ${
            isDragging
              ? 'border-brand bg-brand/10'
              : 'border-[var(--border)] bg-[var(--bg-card)] hover:border-brand/50 hover:bg-[var(--bg-surface)]'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/png, image/jpeg, image/webp, image/gif"
            className="hidden"
          />
          <div className="size-12 rounded-full bg-brand/10 text-brand flex items-center justify-center mb-3">
            <Upload className="size-6" />
          </div>
          <p className="text-sm font-bold text-[var(--text-primary)]">Arrastrá la imagen del banner o hacé clic</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">1 sola imagen promocional HD • Máx. {maxMb} MB</p>
        </div>
      ) : (
        /* Estado Imagen Cargada con Acciones */
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
              <ImageIcon className="size-4 text-brand" /> Banner Seleccionado
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenCropper}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-brand hover:text-white transition"
              >
                <Crop className="size-3.5" /> Re-encuadrar
              </button>
              <button
                type="button"
                onClick={onRemoveImage}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500 hover:text-white transition"
              >
                <Trash2 className="size-3.5" /> Eliminar
              </button>
            </div>
          </div>

          {/* Vista Previa del Banner */}
          <div className="relative aspect-[3/1] w-full overflow-hidden rounded-lg border border-[var(--border)] bg-black/40 flex items-center justify-center">
            <img src={currentUrl} alt="Vista previa del banner" className="h-full w-full object-cover" />
          </div>
        </div>
      )}
    </div>
  );
}
