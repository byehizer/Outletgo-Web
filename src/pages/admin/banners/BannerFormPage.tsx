import { ArrowLeft, Loader2, Search, Crop, Check, X, Smartphone, Store as StoreIcon, Package } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';

import { BannerImageUploader } from '../../../components/BannerImageUploader';
import { createAdminBanner, getAdminBannerById, updateAdminBanner } from '../../../features/admin/adminBannersApi';
import { fetchAdminProducts } from '../../../features/admin/moderationApi';
import { fetchSellerAccounts } from '../../../features/admin/sellersApi';
import { useToast } from '../../../hooks/useToast';
import { apiClient } from '../../../lib/http/apiClient';

// MOCKS DE RESPALDO SI LA BD ESTÁ VACÍA EN DESARROLLO
const BACKUP_STORES = [
  { id: 'tienda-1', businessName: 'Palermo Outlets' },
  { id: 'tienda-2', businessName: 'Urban Sport' },
  { id: 'tienda-3', businessName: 'Zapatoteca CABA' },
  { id: 'tienda-4', businessName: 'Ropa Infantil Sol' },
  { id: 'tienda-5', businessName: 'Calzados Argentinos' },
];

const BACKUP_PRODUCTS = [
  { id: 'prod-1', name: 'Campera de Abrigo Impermeable', storeName: 'Palermo Outlets' },
  { id: 'prod-2', name: 'Sweater de Hilo Invierno', storeName: 'Palermo Outlets' },
  { id: 'prod-3', name: 'Zapatillas Deportivas Run', storeName: 'Urban Sport' },
  { id: 'prod-4', name: 'Mocasines de Cuero Premium', storeName: 'Zapatoteca CABA' },
  { id: 'prod-5', name: 'Botas de Gamuza Invierno', storeName: 'Zapatoteca CABA' },
  { id: 'prod-6', name: 'Remera Algodón Negra', storeName: 'Urban Sport' },
];

type AspectRatioMode = '3:1' | '16:9' | '1:1' | 'FREE';

interface StoreOption {
  id: string;
  businessName: string;
}

interface ProductOption {
  id: string;
  name: string;
  storeName?: string;
}

export function BannerFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEditing = Boolean(id);
  const { success: showToastSuccess, error: showToastError } = useToast();

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [badgeText, setBadgeText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [type, setType] = useState<'CAMPAIGN' | 'STORE' | 'PRODUCT'>('CAMPAIGN');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [loadingBanner, setLoadingBanner] = useState(isEditing);

  // Dynamic Store and Product Lists
  const [availableStores, setAvailableStores] = useState<StoreOption[]>(BACKUP_STORES);
  const [availableProducts, setAvailableProducts] = useState<ProductOption[]>(BACKUP_PRODUCTS);

  // Search Filter State
  const [storeSearch, setStoreSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [saving, setSaving] = useState(false);

  // Cargar lista real de tiendas y productos
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const [sellersRes, productsRes] = await Promise.allSettled([
          fetchSellerAccounts({ page: 0, size: 100 }),
          fetchAdminProducts({ page: 0, size: 100 }),
        ]);

        if (cancelled) return;

        if (sellersRes.status === 'fulfilled' && sellersRes.value?.content?.length > 0) {
          const loadedStores: StoreOption[] = sellersRes.value.content.map((s) => ({
            id: s.store?.id || s.id,
            businessName: s.store?.businessName || s.email,
          }));
          setAvailableStores(loadedStores);
        }

        if (productsRes.status === 'fulfilled' && productsRes.value?.content?.length > 0) {
          const loadedProducts: ProductOption[] = productsRes.value.content.map((p) => ({
            id: p.id,
            name: p.name,
            storeName: p.store?.businessName,
          }));
          setAvailableProducts(loadedProducts);
        }
      } catch (e) {
        console.warn('Usando lista de respaldo para tiendas/productos:', e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Cargar datos del banner en modo edición
  useEffect(() => {
    if (id) {
      setLoadingBanner(true);
      getAdminBannerById(id)
        .then((b) => {
          if (b) {
            setTitle(b.title || '');
            setDescription(b.description || '');
            setBadgeText(b.badgeText || '');
            setImageUrl(b.imageUrl || '');
            const bannerType = (b.type || 'CAMPAIGN') as 'CAMPAIGN' | 'STORE' | 'PRODUCT';
            setType(bannerType);

            if (b.startDate) {
              const d = new Date(b.startDate);
              setStartDate(!isNaN(d.getTime()) ? d.toISOString().slice(0, 16) : '');
            }
            if (b.endDate) {
              const d = new Date(b.endDate);
              setEndDate(!isNaN(d.getTime()) ? d.toISOString().slice(0, 16) : '');
            }

            // Precargar selecciones
            if (b.storeIds && b.storeIds.length > 0) {
              setSelectedStoreIds(b.storeIds);
            } else if (b.targetStoreId) {
              setSelectedStoreIds([b.targetStoreId]);
            } else if (b.stores && b.stores.length > 0) {
              setSelectedStoreIds(b.stores.map((s) => s.id));
            }

            if (b.productIds && b.productIds.length > 0) {
              setSelectedProductIds(b.productIds);
            } else if (b.targetProductId) {
              setSelectedProductIds([b.targetProductId]);
            } else if (b.products && b.products.length > 0) {
              setSelectedProductIds(b.products.map((p) => p.id));
            }
          }
        })
        .catch((err) => {
          console.error('Error al cargar datos del banner:', err);
          showToastError('No se pudieron cargar los datos de la campaña.');
        })
        .finally(() => {
          setLoadingBanner(false);
        });
    }
  }, [id, showToastError]);

  // Manejador del cambio de tipo de banner (STORE, PRODUCT, CAMPAIGN)
  const handleTypeChange = (newType: 'CAMPAIGN' | 'STORE' | 'PRODUCT') => {
    setType(newType);
    if (newType === 'STORE') {
      // Dejar solo 1 tienda seleccionada y vaciar productos
      setSelectedStoreIds((prev) => (prev.length > 0 && prev[0] ? [prev[0]] : []));
      setSelectedProductIds([]);
    } else if (newType === 'PRODUCT') {
      // Dejar solo 1 producto seleccionado y vaciar tiendas
      setSelectedProductIds((prev) => (prev.length > 0 && prev[0] ? [prev[0]] : []));
      setSelectedStoreIds([]);
    }
  };

  // Crop State
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [aspectMode, setAspectMode] = useState<AspectRatioMode>('3:1');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Coordenadas de encuadre en porcentaje (0 a 100)
  const [cropX, setCropX] = useState(5);
  const [cropY, setCropY] = useState(25);
  const [cropW, setCropW] = useState(90);
  const [cropH, setCropH] = useState(30);

  const [isDragging, setIsDragging] = useState(false);
  const [uploadingCrop, setUploadingCrop] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Filtrado interactivo de tiendas y productos
  const filteredStores = availableStores.filter((s) =>
    s.businessName.toLowerCase().includes(storeSearch.toLowerCase())
  );

  const filteredProducts = availableProducts.filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    (p.storeName && p.storeName.toLowerCase().includes(productSearch.toLowerCase()))
  );

  // Manejo interactivo de selección de tienda
  const handleStoreSelect = (storeId: string) => {
    if (type === 'STORE') {
      // Tipo STORE: Selección Única (Radio)
      setSelectedStoreIds([storeId]);
      setSelectedProductIds([]);
    } else {
      // Tipo CAMPAIGN: Selección Múltiple (Checkbox)
      setSelectedStoreIds((prev) =>
        prev.includes(storeId) ? prev.filter((sid) => sid !== storeId) : [...prev, storeId]
      );
    }
  };

  // Manejo interactivo de selección de producto
  const handleProductSelect = (productId: string) => {
    if (type === 'PRODUCT') {
      // Tipo PRODUCT: Selección Única (Radio)
      setSelectedProductIds([productId]);
      setSelectedStoreIds([]);
    } else {
      // Tipo CAMPAIGN: Selección Múltiple (Checkbox)
      setSelectedProductIds((prev) =>
        prev.includes(productId) ? prev.filter((pid) => pid !== productId) : [...prev, productId]
      );
    }
  };

  // Carga de la imagen original para encuadres
  const handleImageSelected = (rawUrl: string) => {
    setRawImageSrc(rawUrl);
    applyAspectPreset('3:1');
    setShowCropModal(true);
  };

  const handleRemoveImage = () => {
    setImageUrl('');
    setRawImageSrc(null);
    showToastSuccess('Imagen eliminada.');
  };

  // Aplicar preajustes de aspecto
  const applyAspectPreset = (mode: AspectRatioMode) => {
    setAspectMode(mode);
    if (mode === '3:1') {
      setCropW(90);
      setCropH(30);
      setCropX(5);
      setCropY(35);
    } else if (mode === '16:9') {
      setCropW(85);
      setCropH(47.8);
      setCropX(7.5);
      setCropY(26);
    } else if (mode === '1:1') {
      setCropW(60);
      setCropH(60);
      setCropX(20);
      setCropY(20);
    } else if (mode === 'FREE') {
      setCropW(100);
      setCropH(100);
      setCropX(0);
      setCropY(0);
    }
  };

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const maxW = 550;
    const maxH = 380;
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

    ctx.drawImage(img, 0, 0, w, h);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, w, h);

    const rx = (cropX / 100) * w;
    const ry = (cropY / 100) * h;
    const rw = (cropW / 100) * w;
    const rh = (cropH / 100) * h;

    ctx.drawImage(
      img,
      (cropX / 100) * img.width,
      (cropY / 100) * img.height,
      (cropW / 100) * img.width,
      (cropH / 100) * img.height,
      rx,
      ry,
      rw,
      rh
    );

    ctx.strokeStyle = '#2B8FD4';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(rx, ry, rw, rh);

    ctx.fillStyle = '#2B8FD4';
    const sz = 8;
    ctx.fillRect(rx - sz / 2, ry - sz / 2, sz, sz);
    ctx.fillRect(rx + rw - sz / 2, ry - sz / 2, sz, sz);
    ctx.fillRect(rx - sz / 2, ry + rh - sz / 2, sz, sz);
    ctx.fillRect(rx + rw - sz / 2, ry + rh - sz / 2, sz, sz);
  }, [cropX, cropY, cropW, cropH]);

  useEffect(() => {
    if (!showCropModal || !rawImageSrc) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = rawImageSrc;
    img.onload = () => {
      imageRef.current = img;
      drawCanvas();
    };
  }, [showCropModal, rawImageSrc, drawCanvas]);

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

  const dataUrlToFile = (dataUrl: string, filename: string): File => {
    const parts = dataUrl.split(',');
    const header = parts[0] ?? '';
    const data = parts[1] ?? '';
    const mime = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new File([bytes], filename, { type: mime });
  };

  const handleApplyCrop = async () => {
    const img = imageRef.current;
    if (!img) return;

    const cropCanvas = document.createElement('canvas');
    const sx = (cropX / 100) * img.naturalWidth;
    const sy = (cropY / 100) * img.naturalHeight;
    const sw = (cropW / 100) * img.naturalWidth;
    const sh = (cropH / 100) * img.naturalHeight;

    cropCanvas.width = sw;
    cropCanvas.height = sh;

    const ctx = cropCanvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    const croppedDataUrl = cropCanvas.toDataURL('image/jpeg', 0.92);

    setUploadingCrop(true);
    try {
      const file = dataUrlToFile(croppedDataUrl, `banner-${Date.now()}.jpg`);
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post<{ url: string }>('/api/uploads/product-image', formData);
      if (res?.url) {
        setImageUrl(res.url);
        setShowCropModal(false);
        showToastSuccess('Banner encuadrado y subido con éxito.');
      } else {
        throw new Error('URL no recibida del servidor.');
      }
    } catch {
      setImageUrl(croppedDataUrl);
      setShowCropModal(false);
      showToastSuccess('Banner encuadrado localmente (sin subida al servidor).');
    } finally {
      setUploadingCrop(false);
    }
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

    // Validaciones estrictas por tipo de banner
    if (type === 'STORE' && selectedStoreIds.length === 0) {
      showToastError('Debés seleccionar exactamente 1 tienda para el banner de tipo STORE.');
      return;
    }
    if (type === 'PRODUCT' && selectedProductIds.length === 0) {
      showToastError('Debés seleccionar exactamente 1 producto para el banner de tipo PRODUCT.');
      return;
    }

    setSaving(true);
    try {
      let finalImageUrl = imageUrl;

      if (finalImageUrl.startsWith('data:')) {
        showToastError('La imagen no se pudo subir al servidor. Intentando nuevamente...');
        try {
          const file = dataUrlToFile(finalImageUrl, `banner-${Date.now()}.jpg`);
          const formData = new FormData();
          formData.append('file', file);
          const res = await apiClient.post<{ url: string }>('/api/uploads/product-image', formData);
          if (res?.url) {
            finalImageUrl = res.url;
            setImageUrl(finalImageUrl);
          } else {
            throw new Error('No se recibió URL del servidor de imágenes.');
          }
        } catch (uploadErr) {
          console.error('Re-upload failed:', uploadErr);
          showToastError('No se pudo subir la imagen al servidor. Verificá tu conexión e intentá nuevamente.');
          setSaving(false);
          return;
        }
      }

      const bannerPayload = {
        title,
        description,
        imageUrl: finalImageUrl,
        type,
        badgeText: badgeText.trim() || undefined,
        startDate: new Date(startDate).toISOString().replace('Z', '').split('.')[0],
        endDate: new Date(endDate).toISOString().replace('Z', '').split('.')[0],
        storeIds: type === 'PRODUCT' ? [] : selectedStoreIds,
        productIds: type === 'STORE' ? [] : selectedProductIds,
      };

      if (isEditing && id) {
        await updateAdminBanner(id, bannerPayload);
        showToastSuccess('Banner promocional actualizado con éxito.');
      } else {
        await createAdminBanner(bannerPayload);
        showToastSuccess('Banner promocional creado con éxito.');
      }
      navigate('/admin/banners');
    } catch (err: unknown) {
      console.error('Banner creation error:', err);
      const message =
        err instanceof Error ? err.message : 'No se pudo crear el banner. Revisá los datos e intentá nuevamente.';
      showToastError(message);
    } finally {
      setSaving(false);
    }
  };

  if (loadingBanner) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-brand" />
      </div>
    );
  }

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
          <h1 className="font-display text-display-sm text-[var(--text-primary)]">
            {isEditing ? 'Editar Banner Promocional' : 'Nuevo Banner Promocional'}
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Configurá la redirección interactiva a Tienda, Producto o Campaña multitienda.
          </p>
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
                onChange={(e) => handleTypeChange(e.target.value as any)}
                className="mt-2 h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 text-sm font-semibold text-[var(--text-primary)] outline-none focus:border-brand"
              >
                <option value="CAMPAIGN">Campaña Multitienda (CAMPAIGN)</option>
                <option value="STORE">Redirección a 1 Tienda (STORE)</option>
                <option value="PRODUCT">Redirección a 1 Producto (PRODUCT)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase">
              Etiqueta / Badge (Opcional)
            </label>
            <input
              type="text"
              value={badgeText}
              onChange={(e) => setBadgeText(e.target.value)}
              placeholder="Ej. HOT SALE, 50% OFF, LIQUIDACIÓN, NUEVO"
              className="mt-2 h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-brand"
            />
            <p className="mt-1 text-[11px] text-[var(--text-muted)]">
              Si ingresás un texto, se mostrará como insignia roja en la App Mobile. Si lo dejás vacío, la gráfica se verá limpia sin insignia.
            </p>
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

        {/* Carga e Imagen del Banner */}
        <section className="space-y-4">
          <h3 className="font-display text-base font-semibold text-[var(--text-primary)]">Imagen del Banner</h3>
          <BannerImageUploader
            currentUrl={imageUrl}
            onImageSelected={handleImageSelected}
            onRemoveImage={handleRemoveImage}
            onOpenCropper={() => setShowCropModal(true)}
            onError={(msg) => showToastError(msg)}
            maxMb={50}
          />
        </section>

        {/* SECCIÓN INTERACTIVA DE ASOCIACIÓN SEGÚN TIPO DE BANNER */}
        <section className="space-y-4 border-t border-[var(--border)] pt-6">
          {type === 'STORE' && (
            <div className="space-y-3 rounded-xl border border-brand/40 bg-brand/5 p-4">
              <div className="flex items-center gap-2 text-brand">
                <StoreIcon className="size-5" />
                <h4 className="font-display text-sm font-bold">Seleccionar 1 Tienda Destino</h4>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                Al hacer clic en este banner, los usuarios irán directamente al perfil de esta tienda.
              </p>

              <div className="relative">
                <Search className="absolute left-3 top-2.5 size-4 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Buscar tienda..."
                  value={storeSearch}
                  onChange={(e) => setStoreSearch(e.target.value)}
                  className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] pl-9 pr-3 text-xs text-[var(--text-primary)] outline-none"
                />
              </div>

              <div className="max-h-56 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--bg-card)] divide-y divide-[var(--border)]">
                {filteredStores.map((store) => {
                  const isSelected = selectedStoreIds.includes(store.id);
                  return (
                    <label
                      key={store.id}
                      className={`flex items-center justify-between px-3 py-2.5 cursor-pointer text-xs transition ${
                        isSelected ? 'bg-brand/10 font-semibold text-brand' : 'hover:bg-[var(--bg-surface)]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name="bannerStoreSelection"
                          checked={isSelected}
                          onChange={() => handleStoreSelect(store.id)}
                          className="size-4 text-brand focus:ring-brand"
                        />
                        <span className="text-[var(--text-primary)]">{store.businessName}</span>
                      </div>
                      {isSelected ? <span className="text-[10px] font-bold text-brand uppercase">Seleccionada</span> : null}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {type === 'PRODUCT' && (
            <div className="space-y-3 rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-4">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <Package className="size-5" />
                <h4 className="font-display text-sm font-bold">Seleccionar 1 Producto Destino</h4>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                Al hacer clic en este banner, los usuarios irán directamente a la página de compra de este producto.
              </p>

              <div className="relative">
                <Search className="absolute left-3 top-2.5 size-4 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Buscar producto..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] pl-9 pr-3 text-xs text-[var(--text-primary)] outline-none"
                />
              </div>

              <div className="max-h-56 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--bg-card)] divide-y divide-[var(--border)]">
                {filteredProducts.map((product) => {
                  const isSelected = selectedProductIds.includes(product.id);
                  return (
                    <label
                      key={product.id}
                      className={`flex items-center justify-between px-3 py-2.5 cursor-pointer text-xs transition ${
                        isSelected ? 'bg-emerald-500/10 font-semibold text-emerald-600 dark:text-emerald-400' : 'hover:bg-[var(--bg-surface)]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name="bannerProductSelection"
                          checked={isSelected}
                          onChange={() => handleProductSelect(product.id)}
                          className="size-4 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div>
                          <span className="text-[var(--text-primary)] block font-medium">{product.name}</span>
                          {product.storeName ? (
                            <span className="text-[10px] text-[var(--text-muted)]">{product.storeName}</span>
                          ) : null}
                        </div>
                      </div>
                      {isSelected ? <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Seleccionado</span> : null}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {type === 'CAMPAIGN' && (
            <div className="space-y-4">
              <div className="rounded-lg bg-blue-500/10 p-3 text-xs text-blue-600 dark:text-blue-400 font-medium">
                💡 <strong>Campaña Multitienda:</strong> Podés seleccionar múltiples tiendas y/o productos participantes que se mostrarán dentro de la vista de la campaña.
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Selector Múltiple de Tiendas */}
                <div className="space-y-3">
                  <h4 className="font-display text-sm font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                    <StoreIcon className="size-4 text-brand" /> Tiendas Participantes ({selectedStoreIds.length})
                  </h4>
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
                          onChange={() => handleStoreSelect(store.id)}
                          className="size-4 rounded text-brand focus:ring-brand"
                        />
                        <span className="text-[var(--text-primary)] font-medium">{store.businessName}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Selector Múltiple de Productos */}
                <div className="space-y-3">
                  <h4 className="font-display text-sm font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                    <Package className="size-4 text-brand" /> Productos en Campaña ({selectedProductIds.length})
                  </h4>
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
                          onChange={() => handleProductSelect(product.id)}
                          className="size-4 rounded text-brand focus:ring-brand"
                        />
                        <div>
                          <span className="text-[var(--text-primary)] font-medium block">{product.name}</span>
                          {product.storeName ? (
                            <span className="text-[10px] text-[var(--text-muted)]">{product.storeName}</span>
                          ) : null}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
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
            ) : isEditing ? (
              'Guardar Cambios'
            ) : (
              'Guardar Banner'
            )}
          </button>
        </div>
      </form>

      {/* MODAL DE ENCUADRE DE BANNER CON PROPORCIÓN PREDETERMINADA */}
      {showCropModal && rawImageSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-[var(--bg-card)] rounded-2xl p-6 shadow-2xl border border-[var(--border)] space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Crop className="size-4 text-brand" /> Encuadrar Banner (Proporción Óptima)
              </h3>
              <button
                onClick={() => setShowCropModal(false)}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="text-xs text-[var(--text-muted)]">
              Arrastrá la caja azul sobre tu imagen. El área se mantiene fijada en la proporción ideal para que nunca se deforme en la App.
            </p>

            <div className="flex justify-center bg-slate-950/60 rounded-xl p-3 border border-[var(--border)] overflow-hidden">
              <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className="cursor-move max-w-full rounded-md shadow-inner"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--bg-surface)] p-3.5 rounded-xl border border-[var(--border)]">
              <div className="space-y-1.5">
                <span className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  Proporciones Recomendadas
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => applyAspectPreset('3:1')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition flex items-center gap-1.5 ${
                      aspectMode === '3:1'
                        ? 'bg-brand text-white border-brand shadow-xs'
                        : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-primary)] hover:border-brand/50'
                    }`}
                  >
                    <Smartphone className="size-3.5" /> Banner App (3:1)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyAspectPreset('16:9')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                      aspectMode === '16:9'
                        ? 'bg-brand text-white border-brand shadow-xs'
                        : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-primary)] hover:border-brand/50'
                    }`}
                  >
                    Panorámico (16:9)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyAspectPreset('1:1')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                      aspectMode === '1:1'
                        ? 'bg-brand text-white border-brand shadow-xs'
                        : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-primary)] hover:border-brand/50'
                    }`}
                  >
                    Cuadrado (1:1)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyAspectPreset('FREE')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                      aspectMode === 'FREE'
                        ? 'bg-brand text-white border-brand shadow-xs'
                        : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-primary)] hover:border-brand/50'
                    }`}
                  >
                    100% Completa
                  </button>
                </div>
              </div>

              <div className="flex gap-2 self-end">
                <button
                  type="button"
                  onClick={() => setShowCropModal(false)}
                  className="h-9 px-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void handleApplyCrop()}
                  disabled={uploadingCrop}
                  className="h-9 px-4 rounded-lg bg-brand text-xs font-semibold text-white hover:bg-brand-focus transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {uploadingCrop ? (
                    <><Loader2 className="size-3.5 animate-spin" /> Subiendo...</>
                  ) : (
                    <><Check className="size-4" /> Confirmar Encuadre</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
