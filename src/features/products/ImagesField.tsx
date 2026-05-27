import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { useFormContext } from 'react-hook-form';

import { ImageDropzone } from '../../components/ImageDropzone';
import { PRODUCT_IMAGE_MAX_COUNT } from '../../lib/constants';
import { backendImageUploader } from '../../lib/uploads/backendImageUploader';
import { devMockImageUploader } from '../../lib/uploads/devMockImageUploader';

import type { ProductFormValues } from './productSchema';

const productImageUploader = import.meta.env.DEV ? devMockImageUploader : backendImageUploader;

type ImagesFieldProps = {
  stagingSessionId: string;
  disabled?: boolean;
  className?: string;
};

export function ImagesField({ stagingSessionId, disabled, className }: ImagesFieldProps) {
  const {
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useFormContext<ProductFormValues>();

  const imageUrls = watch('imageUrls');

  const move = (from: number, to: number) => {
    if (to < 0 || to >= imageUrls.length) {
      return;
    }
    const next = [...imageUrls];
    const [item] = next.splice(from, 1);
    if (!item) {
      return;
    }
    next.splice(to, 0, item);
    setValue('imageUrls', next, { shouldDirty: true, shouldValidate: true });
  };

  const removeAt = (index: number) => {
    const removed = imageUrls[index];
    if (removed?.startsWith('blob:')) {
      URL.revokeObjectURL(removed);
    }
    const next = imageUrls.filter((_, i) => i !== index);
    setValue('imageUrls', next, { shouldDirty: true, shouldValidate: true });
  };

  const remainingSlots = Math.max(0, PRODUCT_IMAGE_MAX_COUNT - imageUrls.length);

  return (
    <div className={className}>
      <label className="text-sm font-semibold text-[var(--text-primary)]">Imágenes</label>
      <p className="mt-1 text-xs text-[var(--text-muted)]">
        Hasta {PRODUCT_IMAGE_MAX_COUNT} fotos. Arrastrá nuevas más abajo; podés ordenar y quitar las ya subidas.
      </p>

      {imageUrls.length > 0 ?
        <ul className="mt-3 flex flex-wrap gap-2">
          {imageUrls.map((url, index) => (
            <li
              key={`${url}-${index}`}
              className="relative flex gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-2"
            >
              <img
                src={url}
                alt=""
                className="size-20 rounded-md border border-[var(--border)] object-cover"
              />
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  aria-label={`Subir foto ${index + 1}`}
                  disabled={disabled || index === 0}
                  className="inline-flex rounded border border-[var(--border)] p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-input)] disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={() => move(index, index - 1)}
                >
                  <ChevronUp className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label={`Bajar foto ${index + 1}`}
                  disabled={disabled || index >= imageUrls.length - 1}
                  className="inline-flex rounded border border-[var(--border)] p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-input)] disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={() => move(index, index + 1)}
                >
                  <ChevronDown className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label={`Quitar foto ${index + 1}`}
                  disabled={disabled}
                  className="inline-flex rounded border border-danger/35 p-1 text-danger hover:bg-danger/10"
                  onClick={() => removeAt(index)}
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      : null}

      {errors.imageUrls?.message ?
        <p role="alert" className="mt-2 text-xs text-danger">
          {errors.imageUrls.message}
        </p>
      : null}

      <div className="mt-4">
        <ImageDropzone
          key={`drop-${imageUrls.length}`}
          uploader={productImageUploader}
          stagingSessionId={stagingSessionId}
          maxFiles={remainingSlots}
          disabled={disabled || remainingSlots === 0}
          onUploaded={(result) => {
            const curr = getValues('imageUrls');
            if (curr.includes(result.url)) {
              return;
            }
            setValue(
              'imageUrls',
              [...curr, result.url].slice(0, PRODUCT_IMAGE_MAX_COUNT),
              { shouldDirty: true, shouldValidate: true },
            );
          }}
        />
      </div>
    </div>
  );
}
