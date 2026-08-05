import { Image, Calendar, Plus, Tag, Loader2, Video, VideoOff, Save, Trash2, Power, AlertCircle, Pencil } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  fetchAdminBanners,
  toggleAdminBannerStatus,
  deleteAdminBanner,
  type AdminBanner,
} from '../../../features/admin/adminBannersApi';
import { fetchB2bVideoUrlFromApi, updateB2bVideoUrlInApi } from '../../../features/landing/landingApi';
import { formatDate } from '../../../lib/format';
import { useToast } from '../../../hooks/useToast';

export function BannersListPage() {
  const [banners, setBanners] = useState<AdminBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [videoUrl, setVideoUrl] = useState('');
  const [savingVideo, setSavingVideo] = useState(false);
  const [deleteBannerId, setDeleteBannerId] = useState<string | null>(null);

  const { success: showToastSuccess, error: showToastError } = useToast();

  async function loadData() {
    setLoading(true);
    try {
      const pageData = await fetchAdminBanners(0, 50);
      if (pageData && Array.isArray(pageData.content)) {
        setBanners(pageData.content);
      } else {
        setBanners([]);
      }
    } catch (err) {
      console.error('Error al cargar banners:', err);
      setBanners([]);
    }

    try {
      const vUrl = await fetchB2bVideoUrlFromApi();
      if (vUrl && typeof vUrl === 'string') {
        setVideoUrl(vUrl);
      } else {
        setVideoUrl('');
      }
    } catch (err) {
      console.error('Error al cargar URL de video B2B:', err);
      setVideoUrl('');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const toEmbedUrl = (url: string): string => {
    if (!url) return '';
    const cleanUrl = url.trim();

    // YouTube youtu.be/ID
    if (cleanUrl.includes('youtu.be/')) {
      const parts = cleanUrl.split('youtu.be/');
      const id = parts[1]?.split('?')[0]?.split('/')[0];
      if (id) return `https://www.youtube.com/embed/${id}`;
    }

    // YouTube watch?v=ID
    if (cleanUrl.includes('youtube.com/watch')) {
      try {
        const urlObj = new URL(cleanUrl);
        const id = urlObj.searchParams.get('v');
        if (id) return `https://www.youtube.com/embed/${id}`;
      } catch {
        // Fallback split
        const parts = cleanUrl.split('v=');
        const id = parts[1]?.split('&')[0];
        if (id) return `https://www.youtube.com/embed/${id}`;
      }
    }

    // Vimeo vimeo.com/ID
    if (cleanUrl.includes('vimeo.com/') && !cleanUrl.includes('player.vimeo.com')) {
      const parts = cleanUrl.split('vimeo.com/');
      const id = parts[1]?.split('?')[0]?.split('/')[0];
      if (id) return `https://player.vimeo.com/video/${id}`;
    }

    return cleanUrl;
  };

  const handleSaveVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingVideo(true);
    try {
      const normalizedUrl = toEmbedUrl(videoUrl);
      setVideoUrl(normalizedUrl);
      await updateB2bVideoUrlInApi(normalizedUrl);
      showToastSuccess('URL del Video B2B actualizada correctamente.');
    } catch {
      showToastError('No se pudo guardar la URL del video.');
    } finally {
      setSavingVideo(false);
    }
  };

  const handleToggleStatus = async (banner: AdminBanner) => {
    try {
      await toggleAdminBannerStatus(banner.id, banner.status);
      showToastSuccess(`Banner "${banner.title}" actualizado.`);
      void loadData();
    } catch {
      showToastError('No se pudo cambiar el estado del banner.');
    }
  };

  const handleDeleteBanner = async () => {
    if (!deleteBannerId) return;
    try {
      await deleteAdminBanner(deleteBannerId);
      showToastSuccess('Banner eliminado correctamente.');
      setDeleteBannerId(null);
      void loadData();
    } catch {
      showToastError('Ocurrió un error al eliminar el banner.');
    }
  };

  const hasValidVideoUrl = Boolean(videoUrl && (videoUrl.startsWith('http://') || videoUrl.startsWith('https://')));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-display-md text-[var(--text-primary)]">Banners y Campañas</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Gestioná los banners promocionales dinámicos, campañas para la app móvil y el video institucional B2B.
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
                placeholder="Ej. https://www.youtube.com/embed/XXXXX"
                className="w-full h-10 px-3.5 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition focus:border-[var(--border-focus)]"
              />
              <p className="text-[11px] text-[var(--text-muted)] mt-1">
                Ingresá un enlace de incrustación de YouTube o Vimeo (ej: <code className="text-brand">https://www.youtube.com/embed/8tCq3330N1o</code>).
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

          {/* VISTA PREVIA DEL VIDEO O ESTADO NO ENCONTRADO */}
          <div className="space-y-2">
            <span className="block text-xs font-semibold text-[var(--text-muted)]">Vista Previa Actual</span>
            <div className="aspect-video w-full rounded-lg overflow-hidden bg-[var(--bg-surface)] border border-[var(--border)] relative flex items-center justify-center">
              {hasValidVideoUrl ? (
                <iframe
                  src={toEmbedUrl(videoUrl)}
                  title="Vista previa del video"
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="p-6 text-center space-y-2">
                  <VideoOff className="size-8 mx-auto text-[var(--text-muted)]" />
                  <p className="text-xs font-semibold text-[var(--text-primary)]">Video no configurado o no encontrado</p>
                  <p className="text-[11px] text-[var(--text-muted)] leading-normal">
                    Ingresá un enlace válido a la izquierda para publicar el video demo en la Landing Page.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="size-8 animate-spin text-[var(--text-muted)]" />
        </div>
      ) : !Array.isArray(banners) || banners.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-12 text-center">
          <Image className="mx-auto size-12 text-[var(--text-muted)]" />
          <h3 className="mt-4 text-sm font-semibold text-[var(--text-primary)]">No hay banners ni campañas creadas</h3>
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
                  <th className="px-6 py-4 font-semibold text-[var(--text-secondary)] text-right">Acciones</th>
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
                          {banner.badgeText ? (
                            <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-red-500/10 text-red-500 border border-red-500/20">
                              🏷️ {banner.badgeText}
                            </span>
                          ) : null}
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
                          {banner.startDate ? formatDate(banner.startDate) : '—'}
                        </span>
                        <span className="text-[var(--text-muted)] mt-0.5">al {banner.endDate ? formatDate(banner.endDate) : '—'}</span>
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
                      {banner.createdAt ? formatDate(banner.createdAt) : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/admin/banners/${banner.id}/edit`}
                          className="p-2 text-[var(--text-muted)] hover:text-brand hover:bg-brand/10 rounded-lg transition"
                          title="Editar campaña"
                        >
                          <Pencil className="size-4" />
                        </Link>
                        <button
                          onClick={() => handleToggleStatus(banner)}
                          className={`p-2 rounded-lg transition ${
                            banner.status === 'ACTIVE'
                              ? 'text-warning hover:bg-warning/10'
                              : 'text-success hover:bg-success/10'
                          }`}
                          title={banner.status === 'ACTIVE' ? 'Pausar campaña' : 'Activar campaña'}
                        >
                          <Power className="size-4" />
                        </button>
                        <button
                          onClick={() => setDeleteBannerId(banner.id)}
                          className="p-2 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                          title="Eliminar banner"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
      {deleteBannerId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[var(--bg-card)] rounded-2xl p-6 shadow-2xl border border-[var(--border)] space-y-4 text-center">
            <div className="size-12 rounded-full bg-red-500/15 text-red-400 flex items-center justify-center mx-auto border border-red-500/20">
              <AlertCircle className="size-6" />
            </div>
            <h3 className="text-base font-bold text-[var(--text-primary)]">¿Eliminar banner?</h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Esta acción eliminará el banner promocional. Dejará de visualizarse en la app móvil.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setDeleteBannerId(null)}
                className="flex-1 h-10 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-card)]"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteBanner}
                className="flex-1 h-10 rounded-lg bg-red-600 text-xs font-semibold text-white hover:bg-red-700"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
