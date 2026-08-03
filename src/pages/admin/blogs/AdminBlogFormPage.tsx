import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';

import {
  createBlog,
  fetchBlogById,
  fetchBlogCategories,
  updateBlog,
  BlogCategory,
} from '../../../features/blog/blogApi';
import { ROUTES } from '../../../lib/constants';
import { useToast } from '../../../hooks/useToast';

export function AdminBlogFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error } = useToast();
  const isEditing = Boolean(id);

  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [author, setAuthor] = useState('Por Equipo OutletGo');
  const [date, setDate] = useState(
    new Date().toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  );
  const [image, setImage] = useState('/review_oversize_tee.png');
  const [color, setColor] = useState('#2B8FD4');
  const [contentRaw, setContentRaw] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const cList = await fetchBlogCategories();
      setCategories(cList);
      if (cList.length > 0 && !category) {
        setCategory(cList[0]!.name);
      }

      if (id) {
        setLoading(true);
        const item = await fetchBlogById(id);
        if (item) {
          setTitle(item.title);
          setCategory(item.category);
          setAuthor(item.author);
          setDate(item.date);
          setImage(item.image);
          setColor(item.color || '#2B8FD4');
          setContentRaw(item.content.join('\n\n'));
        }
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !contentRaw.trim()) {
      error('Por favor completá el título y el contenido del artículo.');
      return;
    }

    const paragraphs = contentRaw
      .split('\n\n')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const payload = {
      title: title.trim(),
      category: category || 'General',
      author: author.trim() || 'Por Equipo OutletGo',
      date: date.trim(),
      image: image.trim() || '/review_oversize_tee.png',
      color: color || '#2B8FD4',
      content: paragraphs,
      status: 'PUBLISHED' as const,
    };

    try {
      setLoading(true);
      if (isEditing && id) {
        await updateBlog(id, payload);
        success('Artículo actualizado correctamente.');
      } else {
        await createBlog(payload);
        success('Artículo publicado correctamente.');
      }
      navigate(ROUTES.adminBlogs);
    } catch {
      error('Ocurrió un error al guardar la publicación.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* HEADER NAV */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
        <Link
          to={ROUTES.adminBlogs}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
        >
          <ArrowLeft className="size-4" />
          <span>Volver al listado de blogs</span>
        </Link>
        <span className="text-xs font-medium text-[var(--text-muted)]">
          {isEditing ? `Editando ID: ${id}` : 'Creando Nueva Publicación'}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 md:p-8 shadow-sm space-y-6">
        <div className="text-xs font-semibold text-brand uppercase tracking-wider">
          Editor de Contenidos CMS
        </div>

        <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">
          {isEditing ? 'Editar Artículo de Blog' : 'Publicar Nuevo Artículo'}
        </h1>

        {/* CAMPOS PRINCIPALES */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              Título del Artículo *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Guía práctica de compras en Avellaneda 2026..."
              className="w-full h-11 px-4 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition focus:border-[var(--border-focus)]"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                Categoría *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-11 px-4 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] text-xs text-[var(--text-primary)] outline-none transition focus:border-[var(--border-focus)]"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.name} className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                Autor *
              </label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Por Nombre Apellido"
                className="w-full h-11 px-4 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition focus:border-[var(--border-focus)]"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                URL de Imagen de Portada *
              </label>
              <input
                type="text"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="/review_oversize_tee.png o URL https://..."
                className="w-full h-11 px-4 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition focus:border-[var(--border-focus)]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                Color Temático de Insignia
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="size-10 rounded-lg cursor-pointer border border-[var(--border)] bg-[var(--bg-input)] p-1"
                />
                <span className="text-xs font-mono text-[var(--text-muted)]">{color}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              Contenido del Artículo (Separá los párrafos con un salto de línea doble) *
            </label>
            <textarea
              rows={12}
              value={contentRaw}
              onChange={(e) => setContentRaw(e.target.value)}
              placeholder="Escribí aquí el cuerpo de la nota..."
              className="w-full p-4 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] text-xs leading-relaxed text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition focus:border-[var(--border-focus)]"
              required
            />
          </div>
        </div>

        {/* BOTÓN DE ACCIÓN */}
        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
          <Link
            to={ROUTES.adminBlogs}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand px-6 text-xs font-semibold text-white hover:bg-brand/90 transition shadow-sm disabled:opacity-50"
          >
            <Save className="size-4" />
            <span>{isEditing ? 'Guardar Cambios' : 'Publicar Artículo'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
