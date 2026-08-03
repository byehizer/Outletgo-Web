import { ArrowLeft, Loader2, Search, Crop, Check, X } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

import { ImageDropzone } from '../../../components/ImageDropzone';
import { createAdminBanner } from '../../../features/admin/adminBannersApi';
import { useToast } from '../../../hooks/useToast';

// MOCKS PARA SELECCIÓN EN DESARROLLO
const DEV_STORES_MOCK = [
  { id: 'tienda-1', businessName: 'Palermo Outlets' },
  { id: 'tienda-2', businessName: 'Urban Sport' },
  { id: 'tienda-3', businessName: 'Zapatoteca CABA' },
  { id: 'tienda-4', businessName: 'Ropa Infantil Sol' },
  { id: 'tienda-5', businessName: 'Calzados Argentinos' },
];

const DEV_PRODUCTS_MOCK = [
  { id: 'prod-1', name: 'Campera de Abrigo Impermeable', storeName: 'Palermo Outlets' },
  { id: 'prod-2', name: 'Sweater de Hilo Invierno', storeName: 'Palermo Outlets' },
  { id: 'prod-3', name: 'Zapatillas Deportivas Run', storeName: 'Urban Sport' },
  { id: 'prod-4', name: 'Mocasines de Cuero Premium', storeName: 'Zapatoteca CABA' },
  { id: 'prod-5', name: 'Botas de Gamuza Invierno', storeName: 'Zapatoteca CABA' },
  { id: 'prod-6', name: 'Remera Algodón Negra', storeName: 'Urban Sport' },
];

export function BannerFormPage() {
  const navigate = useNavigate();
  const { success: showToastSuccess, error: showToastError } = useToast();

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [type, setType] = useState<'CAMPAIGN' | 'STORE' | 'PRODUCT'>('CAMPAIGN');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  // Search Filter State
  const [storeSearch, setStoreSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [saving, setSaving] = useState(false);

  // Crop State
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Coordenadas de encuadre en porcentaje (de 0 a 100)
  const [cropX, setCropX] = useState(10);
  const [cropY, setCropY] = useState(10);
  const [cropW, setCropW] = useState(80);
  const [cropH, setCropH] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Filtrado de tiendas y productos
  const filteredStores = DEV_STORES_MOCK.filter((s) =>
    s.businessName.toLowerCase().includes(storeSearch.toLowerCase())
  );

  const filteredProducts = DEV_PRODUCTS_MOCK.filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const handleStoreToggle = (id: string) => {
    setSelectedStoreIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  const handleProductToggle = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id]
    );
  };

  // Carga de la imagen original para recortar
  const handleImageUploaded = (res: { url: string }) => {
    setRawImageSrc(res.url);
    setShowCropModal(true);
  };

  // Dibujo dinámico de la imagen y la máscara de encuadre en el Canvas
  useEffect(() => {
    if (!showCropModal || !rawImageSrc) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = rawImageSrc;
    img.onload = () => {
      imageRef.current = img;
      drawCanvas();
    };
  }, [showCropModal, rawImageSrc, cropX, cropY, cropW, cropH]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Ajustar dimensiones del canvas preservando aspect ratio de la imagen
    const maxW = 500;
    const maxH = 350;
    let w = img.width;
    let h = img.height;

    if (w > maxW) {
      h = (maxW / w) * h;
      w = maxW;
    }
    if (h > maxH) {
      w = (maxH / h) * w;
      h = maxH;
    }

    canvas.width = w;
    canvas.height = h;

    // 1. Dibujar Imagen base
    ctx.drawImage(img, 0, 0, w, h);

    // 2. Dibujar máscara semitransparente (sombra)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, w, h);

    // 3. Limpiar el area de recorte
    const rx = (cropX / 100) * w;
    const ry = (cropY / 100) * h;
    const rw = (cropW / 100) * w;
    const rh = (cropH / 100) * h;

    ctx.drawImage(img, (cropX / 100) * img.width, (cropY / 100) * img.height, (cropW / 100) * img.width, (cropH / 100) * img.height, rx, ry, rw, rh);

    // 4. Dibujar borde del rectángulo de encuadre
    ctx.strokeStyle = '#2B8FD4';
    ctx.lineWidth = 2;
    ctx.strokeRect(rx, ry, rw, rh);

    // Esquinas táctiles
    ctx.fillStyle = '#2B8FD4';
    ctx.fillRect(rx - 4, ry - 4, 8, 8);
    ctx.fillRect(rx + rw - 4, ry - 4, 8, 8);
    ctx.fillRect(rx - 4, ry + rh - 4, 8, 8);
    ctx.fillRect(rx + rw - 4, ry + rh - 4, 8, 8);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const rx = (cropX / 100) * canvas.width;
    const ry = (cropY / 100) * canvas.height;
    const rw = (cropW / 100) * canvas.width;
    const rh = (cropH / 100) * canvas.height;

    // Verificar si hizo clic dentro del rectangulo de recorte
    if (x >= rx && x <= rx + rw && y >= ry && y <= ry + rh) {
      setIsDragging(true);
      setDragStart({ x, y });
      setDragOffset({ x: cropX, y: cropY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const dx = x - dragStart.x;
    const dy = y - dragStart.y;

    const pctDx = (dx / canvas.width) * 100;
    const pctDy = (dy / canvas.height) * 100;

    let newX = Math.max(0, Math.min(100 - cropW, dragOffset.x + pctDx));
    let newY = Math.max(0, Math.min(100 - cropH, dragOffset.y + pctDy));

    setCropX(newX);
    setCropY(newY);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Ejecuta el recorte real usando Canvas e inserta la imagen en Base64
  const handleApplyCrop = () => {
    const img = imageRef.current;
    if (!img) return;

    const cropCanvas = document.createElement('canvas');
    const sx = (cropX / 100) * img.width;
    const sy = (cropY / 100) * img.height;
    const sw = (cropW / 100) * img.width;
    const sh = (cropH / 100) * img.height;

    cropCanvas.width = sw;
    cropCanvas.height = sh;

    const ctx = cropCanvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    const croppedUrl = cropCanvas.toDataURL('image/jpeg', 0.9);

    setImageUrl(croppedUrl);
    setShowCropModal(false);
    showToastSuccess('Imagen encuadrada con éxito.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      showToastError('El título es requerido.');
      return;
    }
    if (!imageUrl) {
      showToastError('Debés subir una imagen para el banner.');
      return;
    }
    if (!startDate || !endDate) {
      showToastError('Ambas fechas (inicio y fin) son requeridas.');
      return;
    }

    setSaving(true);
    try {
      await createAdminBanner({
        title,
        description,
        imageUrl,
        type,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        storeIds: selectedStoreIds,
        productIds: selectedProductIds,
      });
      showToastSuccess('Banner promocional creado con éxito.');
      navigate('/admin/banners');
    } catch (err) {
      console.error(err);
      showToastError('No se pudo crear el banner.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <header className="flex items-center gap-3">
        <Link
          to="/admin/banners"
          className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <h1 className="font-display text-display-sm text-[var(--text-primary)]">Nuevo Banner Promocional</h1>
          <p className="text-sm text-[var(--text-muted)]">Asociá múltiples tiendas y productos a una campaña.</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-8 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        {/* Datos Básicos */}
        <section className="space-y-4">
          <h3 className="font-display text-base font-semibold text-[var(--text-primary)]">Datos del Banner</h3>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase">Título</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Liquidación de Invierno"
                className="mt-2 h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-brand"
                required
              />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase">Tipo de Banner</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="mt-2 h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-brand"
              >
                <option value="CAMPAIGN">Campaña Multitienda (CAMPAIGN)</option>
                <option value="STORE">Redirección a Tienda (STORE)</option>
                <option value="PRODUCT">Redirección a Producto (PRODUCT)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase">Descripción</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describí los beneficios o alcance de la promoción"
              rows={3}
              className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] p-3 text-sm text-[var(--text-primary)] outline-none focus:border-brand resize-none"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase">Fecha de Inicio</label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-2 h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-brand"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase">Fecha de Fin</label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-2 h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-brand"
                required
              />
            </div>
          </div>
        </section>

        {/* Imagen del Banner */}
        <section className="space-y-4">
          <h3 className="font-display text-base font-semibold text-[var(--text-primary)]">Imagen del Banner</h3>
          <div className="max-w-xl">
            <ImageDropzone
              onUploaded={handleImageUploaded}
              onUrlsChange={(urls) => {
                if (urls[0]) {
                  setRawImageSrc(urls[0]);
                  setShowCropModal(true);
                }
              }}
              onError={(msg) => showToastError(msg)}
            />
          </div>
          {imageUrl && (
            <div className="mt-4 max-w-sm rounded-lg border border-[var(--border)] overflow-hidden">
              <img src={imageUrl} alt="Preview" className="h-40 w-full object-cover" />
            </div>
          )}
        </section>

        {/* Selección Muchos a Muchos */}
        <section className="grid gap-6 md:grid-cols-2">
          {/* Selector de Tiendas */}
          <div className="space-y-3">
            <h4 className="font-display text-sm font-semibold text-[var(--text-primary)]">Asociar Tiendas</h4>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 size-4 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Buscar tienda..."
                value={storeSearch}
                onChange={(e) => setStoreSearch(e.target.value)}
                className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] pl-9 pr-3 text-xs text-[var(--text-primary)] outline-none"
              />
            </div>
            <div className="max-h-48 overflow-y-auto border border-[var(--border)] rounded-lg divide-y divide-[var(--border)]">
              {filteredStores.map((store) => (
                <label key={store.id} className="flex items-center gap-3 px-3 py-2 hover:bg-[var(--bg-surface)] cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={selectedStoreIds.includes(store.id)}
                    onChange={() => handleStoreToggle(store.id)}
                    className="size-4 rounded text-brand focus:ring-brand"
                  />
                  <span className="text-[var(--text-primary)] font-medium">{store.businessName}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Selector de Productos */}
          <div className="space-y-3">
            <h4 className="font-display text-sm font-semibold text-[var(--text-primary)]">Asociar Productos</h4>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 size-4 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Buscar producto..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] pl-9 pr-3 text-xs text-[var(--text-primary)] outline-none"
              />
            </div>
            <div className="max-h-48 overflow-y-auto border border-[var(--border)] rounded-lg divide-y divide-[var(--border)]">
              {filteredProducts.map((product) => (
                <label key={product.id} className="flex items-center gap-3 px-3 py-2 hover:bg-[var(--bg-surface)] cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={selectedProductIds.includes(product.id)}
                    onChange={() => handleProductToggle(product.id)}
                    className="size-4 rounded text-brand focus:ring-brand"
                  />
                  <div>
                    <span className="text-[var(--text-primary)] font-medium block">{product.name}</span>
                    <span className="text-[10px] text-[var(--text-muted)]">{product.storeName}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </section>

        {/* Acciones del Formulario */}
        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
          <Link
            to="/admin/banners"
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-focus disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar Banner'
            )}
          </button>
        </div>
      </form>

      {/* MODAL DE ENCUADRE DE IMAGEN (CROP TOOL) */}
      {showCropModal && rawImageSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-[var(--bg-card)] rounded-2xl p-6 shadow-2xl border border-[var(--border)] space-y-4 animate-in zoom-in-95 duration-200 text-center">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3 text-left">
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                <Crop className="size-4 text-brand" /> Encuadrar Imagen del Banner
              </h3>
              <button
                onClick={() => setShowCropModal(false)}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="text-xs text-[var(--text-muted)] text-left">
              Arrastrá el recuadro azul para encuadrar la porción de la imagen que querés publicar en la app.
            </p>

            {/* Canvas Interactivo de Recorte */}
            <div className="flex justify-center bg-slate-950/40 rounded-lg p-2 border border-[var(--border)] overflow-hidden">
              <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className="cursor-move max-w-full rounded-md"
              />
            </div>

            {/* Ajustes Rápidos del Encuadre */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-left bg-[var(--bg-surface)] p-3 rounded-lg border border-[var(--border)]">
              <div className="space-y-1">
                <span className="block text-[10px] font-bold text-[var(--text-muted)] uppercase">Proporciones fijas</span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => { setCropW(90); setCropH(30); }}
                    className="px-2.5 py-1 text-[10px] font-semibold bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] rounded hover:bg-brand hover:text-white"
                  >
                    Horizontal (3:1)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCropW(80); setCropH(45); }}
                    className="px-2.5 py-1 text-[10px] font-semibold bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] rounded hover:bg-brand hover:text-white"
                  >
                    Estándar (16:9)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCropW(70); setCropH(70); }}
                    className="px-2.5 py-1 text-[10px] font-semibold bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] rounded hover:bg-brand hover:text-white"
                  >
                    Cuadrado (1:1)
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCropModal(false)}
                  className="h-9 px-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-card)]"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleApplyCrop}
                  className="h-9 px-4 rounded-lg bg-brand text-xs font-semibold text-white hover:bg-brand/90 flex items-center gap-1"
                >
                  <Check className="size-3.5" /> Confirmar Encuadre
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
