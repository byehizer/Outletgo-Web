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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-wider">
            <BookOpen className="size-4" /> Módulo CMS Corporativo
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">Gestión de Blogs y Noticias</h1>
          <p className="text-xs text-slate-500">
            Crea, edita o elimina publicaciones corporativas y administra las categorías disponibles.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowCategoryModal(true)}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition"
          >
            <Tag className="size-4 text-indigo-600" />
            <span>Gestionar Categorías</span>
          </button>
          <Link
            to={ROUTES.adminBlogNew}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white hover:bg-slate-800 shadow-sm transition"
          >
            <Plus className="size-4" />
            <span>Nuevo Artículo</span>
          </Link>
        </div>
      </div>

      {/* BARRA DE BÚSQUEDA Y FILTROS */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-2.5 size-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título o autor..."
            className="w-full h-9 pl-9 pr-4 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          <span className="text-xs font-bold text-slate-500 shrink-0">Categoría:</span>
          <button
            onClick={() => setSelectedCategory('Todos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
              selectedCategory === 'Todos'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.name)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
                selectedCategory === c.name
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* TABLA DE BLOGS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Cargando publicaciones...</div>
        ) : blogs.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <AlertCircle className="size-8 mx-auto text-slate-300" />
            <p className="text-sm font-bold text-slate-700">No hay publicaciones registradas</p>
            <p className="text-xs text-slate-500">Probá agregando un nuevo artículo con el botón superior.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Portada</th>
                  <th className="px-6 py-3">Título</th>
                  <th className="px-6 py-3">Categoría</th>
                  <th className="px-6 py-3">Autor</th>
                  <th className="px-6 py-3">Fecha</th>
                  <th className="px-6 py-3">Estado</th>
                  <th className="px-6 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {blogs.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-6 py-3">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="size-12 rounded-lg object-cover border border-slate-200"
                      />
                    </td>
                    <td className="px-6 py-3 max-w-xs font-bold text-slate-900 truncate">
                      {item.title}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-md text-white"
                        style={{ backgroundColor: item.color || '#2B8FD4' }}
                      >
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-3 font-semibold text-slate-700">{item.author}</td>
                    <td className="px-6 py-3 text-slate-400">{item.date}</td>
                    <td className="px-6 py-3">
                      <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-emerald-200/50">
                        {item.status || 'PUBLISHED'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/admin/blogs/${item.id}/edit`}
                          className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          title="Editar"
                        >
                          <Pencil className="size-4" />
                        </Link>
                        <button
                          onClick={() => setDeleteBlogId(item.id)}
                          className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Tag className="size-4 text-indigo-600" />
                Gestión de Categorías
              </h3>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
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
                className="flex-1 h-10 px-3 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <button
                type="submit"
                className="h-10 px-4 rounded-xl bg-slate-900 text-xs font-bold text-white hover:bg-slate-800 transition shrink-0"
              >
                Añadir
              </button>
            </form>

            {/* Listado de Categorías */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Categorías Actuales ({categories.length})
              </span>
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                {categories.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-2.5 text-xs">
                    <span className="font-semibold text-slate-800">{c.name}</span>
                    <button
                      onClick={() => handleDeleteCategory(c.id, c.name)}
                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition"
                      title="Eliminar categoría"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowCategoryModal(false)}
                className="h-9 px-4 rounded-xl bg-slate-100 text-xs font-bold text-slate-700 hover:bg-slate-200 transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
      {deleteBlogId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-xl border border-slate-200 space-y-4 text-center">
            <div className="size-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertCircle className="size-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">¿Eliminar artículo?</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Esta acción no se puede deshacer. El artículo dejará de estar disponible en la web.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setDeleteBlogId(null)}
                className="flex-1 h-10 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 h-10 rounded-xl bg-red-600 text-xs font-bold text-white hover:bg-red-700"
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
