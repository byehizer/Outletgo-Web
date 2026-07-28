import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Search, Sparkle, X } from 'lucide-react';

import {
  fetchBlogs,
  fetchBlogCategories,
  BlogArticle,
  BlogCategory,
} from '../../features/blog/blogApi';
import { ROUTES } from '../../lib/constants';

export function BlogListPage() {
  const [blogs, setBlogs] = useState<BlogArticle[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [bList, cList] = await Promise.all([
        fetchBlogs(searchQuery, selectedCategory),
        fetchBlogCategories(),
      ]);
      setBlogs(bList);
      setCategories(cList);
      setLoading(false);
    }
    loadData();
  }, [searchQuery, selectedCategory]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* HEADER DE NAVEGACIÓN */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <img src="/Logotipe.png" alt="OutletGo Logo" className="h-8 w-auto object-contain" />
          </Link>
          <nav className="flex items-center gap-6 text-xs font-semibold">
            <Link to="/" className="text-slate-600 hover:text-slate-900 transition">
              Inicio
            </Link>
            <Link to={ROUTES.blog} className="text-[#2B8FD4] font-bold">
              Blog Corporativo
            </Link>
            <Link
              to={ROUTES.login}
              className="rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800 transition"
            >
              Ingresar
            </Link>
          </nav>
        </div>
      </header>

      {/* HERO DEL BLOG */}
      <section className="bg-gradient-to-b from-white to-slate-100/70 border-b border-slate-200/60 py-12 md:py-16">
        <div className="mx-auto max-w-5xl px-6 text-center space-y-6">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 px-3.5 py-1 text-xs font-semibold text-indigo-600">
            <Sparkle className="size-3.5" /> Blog Oficial & Novedades Textiles
          </div>
          <h1 className="font-display text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Tendencias, Guías de Compra e Inteligencia Comercial
          </h1>
          <p className="text-slate-600 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Descubrí cómo exprimir tu presupuesto, cuidar la calidad de tus prendas y digitalizar tu local mayorista en el circuito de Flores y Avellaneda.
          </p>

          {/* BUSCADOR */}
          <div className="relative max-w-xl mx-auto pt-2">
            <div className="relative flex items-center">
              <Search className="absolute left-4 size-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar artículo por título, autor o contenido..."
                className="w-full h-12 pl-12 pr-10 rounded-2xl border border-slate-300 bg-white text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* CONTENIDO PRINCIPAL: FILTROS + GRILLA */}
      <main className="flex-1 mx-auto max-w-7xl px-6 py-12 space-y-8 w-full">
        {/* PESTAÑAS DE CATEGORÍAS */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-200">
          <button
            onClick={() => setSelectedCategory('Todos')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
              selectedCategory === 'Todos'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Todos
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.name)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
                selectedCategory.toLowerCase() === cat.name.toLowerCase()
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* CONTADOR DE RESULTADOS */}
        <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>
            Mostrando <strong className="text-slate-900">{blogs.length}</strong> artículo{blogs.length !== 1 ? 's' : ''}
            {selectedCategory !== 'Todos' && ` en "${selectedCategory}"`}
            {searchQuery && ` para "${searchQuery}"`}
          </span>
        </div>

        {/* GRILLA DE ARTÍCULOS */}
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-sm">Cargando publicaciones...</div>
        ) : blogs.length === 0 ? (
          <div className="py-20 text-center space-y-3 bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
            <BookOpen className="size-10 mx-auto text-slate-300" />
            <h3 className="text-base font-bold text-slate-800">No se encontraron artículos</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Probá ajustando tu búsqueda o seleccionando otra categoría.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('Todos');
              }}
              className="mt-2 text-xs font-bold text-indigo-600 hover:underline"
            >
              Limpiar filtros
            </button>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-3">
            {blogs.map((article) => (
              <article
                key={article.id}
                className="group flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-5 hover:shadow-xl hover:border-indigo-500/30 transition duration-300"
              >
                <div className="space-y-4">
                  <div className="aspect-[16/9] w-full rounded-2xl bg-slate-100 overflow-hidden relative border border-slate-100">
                    <img
                      src={article.image}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                    <span
                      className="absolute top-3 left-3 text-white text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm"
                      style={{ backgroundColor: article.color || '#2B8FD4' }}
                    >
                      {article.category}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-semibold">
                      <span>{article.date}</span>
                      <span>·</span>
                      <span>{article.author}</span>
                    </div>
                    <h2 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition leading-snug">
                      {article.title}
                    </h2>
                    <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                      {article.content[0]}
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <Link
                    to={`/blog/${article.id}`}
                    className="text-xs font-bold flex items-center gap-1.5 hover:gap-2.5 transition-all"
                    style={{ color: article.color || '#2B8FD4' }}
                  >
                    <span>Leer artículo</span>
                    <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} OutletGo. Todos los derechos reservados.</p>
          <div className="flex gap-4">
            <Link to="/" className="hover:text-slate-900 transition">Inicio</Link>
            <Link to={ROUTES.blog} className="hover:text-slate-900 transition">Blog</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
