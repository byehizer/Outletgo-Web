import { Image, Calendar, Plus, Tag, Loader2, Video, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { fetchAdminBanners, type AdminBanner } from '../../../features/admin/adminBannersApi';
import { fetchB2bVideoUrlFromApi, updateB2bVideoUrlInApi } from '../../../features/landing/landingApi';
import { formatDate } from '../../../lib/format';
import { useToast } from '../../../hooks/useToast';

export function BannersListPage() {
  const [banners, setBanners] = useState<AdminBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [videoUrl, setVideoUrl] = useState('https://www.youtube.com/embed/8tCq3330N1o');
  const [savingVideo, setSavingVideo] = useState(false);

  const { success: showToastSuccess, error: showToastError } = useToast();

  useEffect(() => {
    async function loadData() {
      try {
        const [pageData, vUrl] = await Promise.all([
          fetchAdminBanners(0, 50),
          fetchB2bVideoUrlFromApi(),
        ]);
        setBanners(pageData.content);
        if (vUrl) setVideoUrl(vUrl);
      } catch (err) {
        console.error(err);
        showToastError('No se pudieron cargar los datos.');
      } finally {
        setLoading(false);
      }
    }
    void loadData();
  }, [showToastError]);

  const handleSaveVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrl.trim()) return;
    setSavingVideo(true);
    try {
      await updateB2bVideoUrlInApi(videoUrl.trim());
      showToastSuccess('URL del Video B2B actualizada correctamente.');
    } catch {
      showToastError('No se pudo guardar la URL del video.');
    } finally {
      setSavingVideo(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-display-md text-[var(--text-primary)]">Banners y Campañas</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Gestioná los banners promocionales dinámicos, campanas para la app móvil y el video institucional B2B.
          </p>
        </div>
        <Link
          to="/admin/banners/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-focus"
        >
          <Plus className="size-4" />
          Crear Banner
        </Link>
      </header>

      {/* SECCIÓN DE ADMINISTRACIÓN DEL VIDEO B2B DE LA LANDING */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-semibold text-brand uppercase tracking-wider">
          <Video className="size-4" /> Video Institucional Landing Page (B2B Demo)
        </div>
        <div className="grid gap-6 md:grid-cols-3 items-start">
          <form onSubmit={handleSaveVideo} className="md:col-span-2 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                URL de Incrustación (Iframe Embed URL)
              </label>
              <input
                type="text"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/embed/..."
                className="w-full h-10 px-3.5 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition focus:border-[var(--border-focus)]"
                required
              />
              <p className="text-[11px] text-[var(--text-muted)] mt-1">
                Ingresá un enlace de incrustación de YouTube o Vimeo (ej: <code className="text-brand">https://www.youtube.com/embed/XXXXX</code>).
              </p>
            </div>
            <button
              type="submit"
              disabled={savingVideo}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-focus transition disabled:opacity-50 shadow-xs"
            >
              <Save className="size-3.5" />
              <span>{savingVideo ? 'Guardando...' : 'Guardar URL del Video'}</span>
            </button>
          </form>

          {/* VISTA PREVIA DEL VIDEO */}
          <div className="space-y-2">
            <span className="block text-xs font-semibold text-[var(--text-muted)]">Vista Previa Actual</span>
            <div className="aspect-video w-full rounded-lg overflow-hidden bg-slate-950 border border-[var(--border)] relative">
              <iframe
                src={videoUrl}
                title="Vista previa del video"
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="size-8 animate-spin text-[var(--text-muted)]" />
        </div>
      ) : banners.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-12 text-center">
          <Image className="mx-auto size-12 text-[var(--text-muted)]" />
          <h3 className="mt-4 text-sm font-semibold text-[var(--text-primary)]">No hay banners creados</h3>
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            Comenzá creando una campaña promocional para que aparezca en el home de la app.
          </p>
          <div className="mt-6">
            <Link
              to="/admin/banners/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-focus"
            >
              <Plus className="size-4" />
              Crear primer banner
            </Link>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-card)]/50">
                  <th className="px-6 py-4 font-semibold text-[var(--text-secondary)]">Banner</th>
                  <th className="px-6 py-4 font-semibold text-[var(--text-secondary)]">Tipo</th>
                  <th className="px-6 py-4 font-semibold text-[var(--text-secondary)]">Vigencia</th>
                  <th className="px-6 py-4 font-semibold text-[var(--text-secondary)]">Estado</th>
                  <th className="px-6 py-4 font-semibold text-[var(--text-secondary)]">Creado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {banners.map((banner) => (
                  <tr key={banner.id} className="hover:bg-[var(--bg-surface)]">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="size-16 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-surface)]">
                          <img src={banner.imageUrl} alt={banner.title} className="h-full w-full object-cover" />
                        </div>
                        <div>
                          <span className="font-semibold text-[var(--text-primary)] block">{banner.title}</span>
                          <span className="text-xs text-[var(--text-muted)] block max-w-xs truncate">
                            {banner.description || 'Sin descripción'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 rounded bg-[var(--bg-surface)] px-2 py-1 text-xs font-medium text-[var(--text-secondary)] border border-[var(--border)]">
                        <Tag className="size-3" />
                        {banner.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[var(--text-secondary)]">
                      <div className="flex flex-col text-xs">
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3" />
                          {formatDate(banner.startDate)}
                        </span>
                        <span className="text-[var(--text-muted)] mt-0.5">al {formatDate(banner.endDate)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                          banner.status === 'ACTIVE'
                            ? 'bg-success/15 text-success'
                            : banner.status === 'PAUSED'
                              ? 'bg-warning/15 text-warning'
                              : 'bg-[var(--text-muted)]/15 text-[var(--text-muted)]'
                        }`}
                      >
                        {banner.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-[var(--text-muted)]">
                      {formatDate(banner.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
