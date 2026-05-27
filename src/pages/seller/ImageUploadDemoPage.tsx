import { useCallback, useId, useState } from 'react';

import { ImageDropzone } from '../../components/ImageDropzone';
import { PRODUCT_IMAGE_MAX_COUNT } from '../../lib/constants';

type LogLine = { id: string; text: string };

/**
 * Paso 11 — pantalla manual para validar estrategia B y `<ImageDropzone />` (multiple, máx 4).
 */
export function ImageUploadDemoPage() {
  const [stagingId, setStagingId] = useState('');
  const [clientLog, setClientLog] = useState<LogLine[]>([]);
  const [lastUrls, setLastUrls] = useState<string[]>([]);

  const stagingSessionIdTrimmed = stagingId.trim() || undefined;

  const stagingFieldId = useId();

  const pushLog = useCallback((line: string) => {
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${line.length}`;
    setClientLog((prev) => [...prev, { id, text: line }].slice(-12));
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-display-md text-[var(--text-primary)]">Demo · subida de imágenes</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Hasta{' '}
          <code className="text-[var(--text-secondary)]">{PRODUCT_IMAGE_MAX_COUNT}</code> fotos por lote ·{' '}
          <code className="text-[var(--text-secondary)]">POST /api/uploads/product-image</code>.
        </p>
      </header>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <label htmlFor={stagingFieldId} className="text-xs font-medium text-[var(--text-secondary)]">
          Staging opcional (<code className="text-[10px]">stagingSessionId</code> multipart)
        </label>
        <input
          id={stagingFieldId}
          type="text"
          value={stagingId}
          onChange={(e) => setStagingId(e.target.value)}
          placeholder='Ej. UUID devuelto al crear borrador · "" sin staging'
          className="mt-2 h-10 w-full max-w-xl rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--border-focus)]"
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">ImageDropzone</h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Campo multipart <code className="text-[var(--text-secondary)]">file</code>; si hay staging, también{' '}
            <code className="text-[var(--text-secondary)]">stagingSessionId</code>.
          </p>
          <div className="mt-6">
            <ImageDropzone
              stagingSessionId={stagingSessionIdTrimmed}
              onUploaded={(result, allSuccessfulUrls) => {
                pushLog(`Éxito: ${result.url} · total URLs: ${allSuccessfulUrls.length}`);
              }}
              onUrlsChange={(urls) => setLastUrls(urls)}
              onError={(msg) => pushLog(`Error: ${msg}`)}
            />
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
              URLs en orden (<code className="text-xs">onUrlsChange</code>)
            </h2>
            {lastUrls.length === 0 ? (
              <p className="mt-4 text-sm text-[var(--text-muted)]">
                Todavía no hay fotos cargadas bien en esta sesión.
              </p>
            ) : (
              <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm">
                {lastUrls.map((u) => (
                  <li key={u} className="break-all text-[var(--text-secondary)]">
                    <a
                      href={u}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-[var(--text-link)] underline-offset-4 hover:underline"
                    >
                      {u}
                    </a>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">Registro</h2>
            {clientLog.length === 0 ? (
              <p className="mt-4 text-sm text-[var(--text-muted)]">Sin eventos.</p>
            ) : (
              <ul className="mt-4 space-y-2 font-mono text-[11px] leading-relaxed text-[var(--text-secondary)]">
                {clientLog.map((entry) => (
                  <li key={entry.id}>{entry.text}</li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
