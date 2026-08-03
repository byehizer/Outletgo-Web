import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download } from 'lucide-react';

import { fetchBlogById, fetchBlogs, BlogArticle } from '../../features/blog/blogApi';
import { ROUTES } from '../../lib/constants';

export function BlogDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [article, setArticle] = useState<BlogArticle | null>(null);
  const [related, setRelated] = useState<BlogArticle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function load() {
      if (!id) return;
      setLoading(true);
      const item = await fetchBlogById(id);
      setArticle(item);
      const all = await fetchBlogs();
      setRelated(all.filter((b) => b.id !== id).slice(0, 3));
      setLoading(false);
    }
    load();
    window.scrollTo(0, 0);
  }, [id]);

  const handleDownloadPDF = () => {
    // Abre la ventana de impresión nativa orientada a PDF
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 text-sm">
        Cargando artículo...
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Artículo no encontrado</h2>
        <p className="text-xs text-slate-500">La publicación que buscás no existe o fue retirada.</p>
        <button
          onClick={() => navigate(ROUTES.blog)}
          className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition"
        >
          Volver al Blog
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* NAVEGACIÓN Y HEADER */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md print:hidden">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <img src="/Logotipewhitemode.png" alt="OutletGo Logo" className="h-10 w-auto object-contain" />
          </Link>
          <div className="flex items-center gap-4">
            <Link
              to={ROUTES.blog}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition"
            >
              <ArrowLeft className="size-4" />
              <span>Volver a Blogs</span>
            </Link>
          </div>
        </div>
      </header>

      {/* CONTENIDO IMPRIMIBLE DEL ARTÍCULO */}
      <main className="flex-1 mx-auto max-w-4xl px-6 py-10 md:py-16 space-y-10 w-full">
        {/* BOTÓN DE RETORNO + CATEGORÍA */}
        <div className="flex items-center justify-between gap-4 print:hidden">
          <span
            className="text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider text-white shadow-sm"
            style={{ backgroundColor: article.color || '#2B8FD4' }}
          >
            {article.category}
          </span>
          <button
            onClick={handleDownloadPDF}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition"
          >
            <Download className="size-3.5 text-slate-500" />
            <span>Descargar Artículo (PDF)</span>
          </button>
        </div>

        {/* ARTÍCULO PRINCIPAL */}
        <article id="printable-area" className="space-y-8 bg-white p-6 sm:p-10 rounded-3xl border border-slate-200/80 shadow-sm">
          {/* TÍTULO Y METADATOS */}
          <div className="space-y-4 border-b border-slate-100 pb-6">
            <h1 className="font-display text-2xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
              {article.title}
            </h1>
            <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
              <span className="font-bold text-slate-800">{article.author}</span>
              <span>·</span>
              <span>{article.date}</span>
            </div>
          </div>

          {/* IMAGEN DE PORTADA */}
          <div className="aspect-[16/9] w-full rounded-2xl overflow-hidden bg-slate-100 border border-slate-100 shadow-inner">
            <img src={article.image} alt={article.title} className="w-full h-full object-cover" />
          </div>

          {/* PARÁGRAFOS DE TEXTO */}
          <div className="space-y-6 text-sm sm:text-base text-slate-700 leading-relaxed font-normal">
            {article.content.map((paragraph, idx) => (
              <p key={idx}>{paragraph}</p>
            ))}
          </div>
        </article>

        {/* RECOMENDADOS */}
        {related.length > 0 && (
          <section className="space-y-6 pt-6 print:hidden">
            <h3 className="font-display text-xl font-bold text-slate-900">Artículos recomendados</h3>
            <div className="grid gap-6 md:grid-cols-3">
              {related.map((rel) => (
                <Link
                  key={rel.id}
                  to={`/blog/${rel.id}`}
                  className="group rounded-2xl border border-slate-200 bg-white p-4 hover:shadow-md transition"
                >
                  <div className="aspect-[16/9] w-full rounded-xl overflow-hidden bg-slate-100 mb-3">
                    <img src={rel.image} alt={rel.title} className="w-full h-full object-cover group-hover:scale-105 transition" />
                  </div>
                  <span className="text-[9px] font-bold text-indigo-600 uppercase">{rel.category}</span>
                  <h4 className="text-xs font-bold text-slate-900 leading-snug group-hover:text-indigo-600 transition line-clamp-2 mt-1">
                    {rel.title}
                  </h4>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-800 bg-slate-950 py-12 text-center text-xs text-slate-500 print:hidden">
        <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src="/Logotipeblackmode.png" alt="OutletGo Logo" className="h-16 md:h-20 w-auto object-contain" />
          </div>
          <p>© {new Date().getFullYear()} OutletGo. Todos los derechos reservados. Hecho en Argentina.</p>
          <div className="flex gap-4 text-slate-400">
            <Link to="/" className="hover:text-white transition">Inicio</Link>
            <Link to={ROUTES.blog} className="hover:text-white transition">Blog</Link>
          </div>
        </div>
      </footer>

      {/* ESTILOS DE IMPRESIÓN PDF */}
      <style>{`
        @media print {
          header, footer, button, .print\\:hidden {
            display: none !important;
          }
          body {
            background: white !important;
            color: black !important;
          }
          #printable-area {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
