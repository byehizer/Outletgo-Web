import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Plus,
  Search,
  Pencil,
  Trash2,
  Tag,
  X,
  AlertCircle,
} from 'lucide-react';

import {
  fetchBlogs,
  fetchBlogCategories,
  deleteBlog,
  createBlogCategory,
  deleteBlogCategory,
  BlogArticle,
  BlogCategory,
} from '../../../features/blog/blogApi';
import { ROUTES } from '../../../lib/constants';
import { useToast } from '../../../hooks/useToast';

export function AdminBlogsListPage() {
  const { success, error } = useToast();
  const [blogs, setBlogs] = useState<BlogArticle[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [loading, setLoading] = useState(true);

  // Modales
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [deleteBlogId, setDeleteBlogId] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    const [bList, cList] = await Promise.all([
      fetchBlogs(search, selectedCategory),
      fetchBlogCategories(),
    ]);
    setBlogs(bList);
    setCategories(cList);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [search, selectedCategory]);

  const handleDelete = async () => {
    if (!deleteBlogId) return;
    try {
      await deleteBlog(deleteBlogId);
      success('Artículo eliminado correctamente.');
      setDeleteBlogId(null);
      loadData();
    } catch {
      error('Ocurrió un error al eliminar el artículo.');
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      await createBlogCategory(newCatName.trim());
      success(`Categoría "${newCatName.trim()}" agregada.`);
      setNewCatName('');
      const cList = await fetchBlogCategories();
      setCategories(cList);
    } catch {
      error('No se pudo agregar la categoría.');
    }
  };

  const handleDeleteCategory = async (catId: string, catName: string) => {
    if (!confirm(`¿Eliminar la categoría "${catName}"?`)) return;
    try {
      await deleteBlogCategory(catId);
      success(`Categoría "${catName}" eliminada.`);
      const cList = await fetchBlogCategories();
      setCategories(cList);
    } catch {
      error('Error al eliminar categoría.');
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER PRINCIPAL DE ADMIN */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-brand uppercase tracking-wider mb-1">
            <BookOpen className="size-4" /> Módulo CMS Corporativo
          </div>
          <h1 className="font-display text-display-md text-[var(--text-primary)]">
            Gestión de Blogs y Noticias
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Crea, edita o elimina publicaciones corporativas y administra las categorías disponibles.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowCategoryModal(true)}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition shadow-sm"
          >
            <Tag className="size-4 text-brand" />
            <span>Gestionar Categorías</span>
          </button>
          <Link
            to={ROUTES.adminBlogNew}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-xs font-semibold text-white shadow-sm hover:bg-brand/90 transition"
          >
            <Plus className="size-4" />
            <span>Nuevo Artículo</span>
          </Link>
        </div>
      </header>

      {/* BARRA DE BÚSQUEDA Y FILTROS */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-sm">
        <div className="relative w-full md:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título o autor..."
            className="w-full h-10 pl-9 pr-4 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition focus:border-[var(--border-focus)]"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          <span className="text-xs font-semibold text-[var(--text-muted)] shrink-0">Categoría:</span>
          <button
            onClick={() => setSelectedCategory('Todos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition shrink-0 border ${
              selectedCategory === 'Todos'
                ? 'bg-brand text-white border-brand'
                : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]'
            }`}
          >
            Todos
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.name)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition shrink-0 border ${
                selectedCategory === c.name
                  ? 'bg-brand text-white border-brand'
                  : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* TABLA DE BLOGS */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-[var(--text-muted)]">Cargando publicaciones...</div>
        ) : blogs.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <AlertCircle className="size-8 mx-auto text-[var(--text-muted)]" />
            <p className="text-sm font-semibold text-[var(--text-primary)]">No hay publicaciones registradas</p>
            <p className="text-xs text-[var(--text-muted)]">Probá agregando un nuevo artículo con el botón superior.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[var(--text-secondary)] border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-card)]/50 text-[11px] font-semibold text-[var(--text-muted)] uppercase">
                  <th className="px-6 py-3">Portada</th>
                  <th className="px-6 py-3">Título</th>
                  <th className="px-6 py-3">Categoría</th>
                  <th className="px-6 py-3">Autor</th>
                  <th className="px-6 py-3">Fecha</th>
                  <th className="px-6 py-3">Estado</th>
                  <th className="px-6 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {blogs.map((item) => (
                  <tr key={item.id} className="hover:bg-[var(--bg-surface)] transition">
                    <td className="px-6 py-3 whitespace-nowrap">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="size-12 rounded-lg object-cover border border-[var(--border)] bg-[var(--bg-surface)]"
                      />
                    </td>
                    <td className="px-6 py-3 max-w-xs font-semibold text-[var(--text-primary)] truncate">
                      {item.title}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-md text-white shadow-xs"
                        style={{ backgroundColor: item.color || '#2B8FD4' }}
                      >
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap font-medium text-[var(--text-secondary)]">{item.author}</td>
                    <td className="px-6 py-3 whitespace-nowrap text-[var(--text-muted)]">{item.date}</td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <span className="bg-emerald-500/15 text-emerald-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                        {item.status || 'PUBLISHED'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/admin/blogs/${item.id}/edit`}
                          className="p-2 text-[var(--text-muted)] hover:text-brand hover:bg-[var(--bg-surface)] rounded-lg transition"
                          title="Editar"
                        >
                          <Pencil className="size-4" />
                        </Link>
                        <button
                          onClick={() => setDeleteBlogId(item.id)}
                          className="p-2 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                          title="Eliminar"
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
        )}
      </div>

      {/* MODAL DE GESTIÓN DE CATEGORÍAS */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[var(--bg-card)] rounded-2xl p-6 shadow-2xl border border-[var(--border)] space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Tag className="size-4 text-brand" />
                Gestión de Categorías
              </h3>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Formulario Nueva Categoría */}
            <form onSubmit={handleAddCategory} className="flex gap-2">
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Nombre de la nueva categoría..."
                className="flex-1 h-10 px-3.5 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--border-focus)]"
              />
              <button
                type="submit"
                className="h-10 px-4 rounded-lg bg-brand text-xs font-semibold text-white hover:bg-brand/90 transition shrink-0"
              >
                Añadir
              </button>
            </form>

            {/* Listado de Categorías */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                Categorías Actuales ({categories.length})
              </span>
              <div className="divide-y divide-[var(--border)] border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--bg-surface)]">
                {categories.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-2.5 text-xs">
                    <span className="font-semibold text-[var(--text-primary)]">{c.name}</span>
                    <button
                      onClick={() => handleDeleteCategory(c.id, c.name)}
                      className="p-1 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 rounded-md transition"
                      title="Eliminar categoría"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-[var(--border)]">
              <button
                onClick={() => setShowCategoryModal(false)}
                className="h-9 px-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
      {deleteBlogId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[var(--bg-card)] rounded-2xl p-6 shadow-2xl border border-[var(--border)] space-y-4 text-center">
            <div className="size-12 rounded-full bg-red-500/15 text-red-400 flex items-center justify-center mx-auto border border-red-500/20">
              <AlertCircle className="size-6" />
            </div>
            <h3 className="text-base font-bold text-[var(--text-primary)]">¿Eliminar artículo?</h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Esta acción no se puede deshacer. El artículo dejará de estar disponible en la web.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setDeleteBlogId(null)}
                className="flex-1 h-10 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-card)]"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
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
