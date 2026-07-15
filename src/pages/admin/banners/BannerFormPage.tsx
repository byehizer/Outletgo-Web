import { ArrowLeft, Loader2, Search } from 'lucide-react';
import { useState } from 'react';
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
              onUploaded={(res) => setImageUrl(res.url)}
              onUrlsChange={(urls) => setImageUrl(urls[0] || '')}
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
    </div>
  );
}
