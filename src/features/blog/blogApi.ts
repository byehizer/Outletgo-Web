import { apiClient } from '../../lib/http/apiClient';

export interface BlogCategory {
  id: string;
  name: string;
}

export interface BlogArticle {
  id: string;
  title: string;
  category: string;
  date: string;
  author: string;
  image: string;
  color: string;
  content: string[];
  status?: 'PUBLISHED' | 'DRAFT';
}

const STORAGE_KEY_BLOGS = 'outletgo_blogs_data_v2';
const STORAGE_KEY_CATEGORIES = 'outletgo_blog_categories_v2';

export const DEFAULT_CATEGORIES: BlogCategory[] = [
  { id: 'cat-1', name: 'Guías de Compra' },
  { id: 'cat-2', name: 'Cuidado Textil' },
  { id: 'cat-3', name: 'Pymes Textiles' },
  { id: 'cat-4', name: 'Tendencias' },
];

export const INITIAL_BLOG_ARTICLES: BlogArticle[] = [
  {
    id: 'blog-1',
    title: 'Cómo comprar en Avellaneda sin morir en el intento: La Guía Digital definitiva',
    category: 'Guías de Compra',
    date: '12 de Abril, 2026',
    author: 'Por Ehizer Valero',
    image: '/review_oversize_tee.png',
    color: '#2B8FD4',
    status: 'PUBLISHED',
    content: [
      "Seguro te pasó más de una vez. Querés renovar tu placard pero pensar en ir un sábado por la mañana a Flores o Avellaneda te genera un estrés inmediato: filas interminables, veredas intransitables, compras mínimas forzadas de 15 prendas iguales y tener que manejar efectivo.",
      "OutletGo nace para destruir ese dolor. Consolidamos en una sola app móvil los catálogos y percheros físicos de los mayoristas más destacados de la zona. A través de nuestro motor de búsqueda avanzado con filtros de color, talle y precio, podés seleccionar prendas individuales de diferentes tiendas.",
      "El verdadero secreto es el checkout: pagás una única transacción por Mercado Pago y nuestro pool de logística express pasa por cada local a retirar tus compras, las une en el centro de consolidación y te las entrega en tu domicilio en CABA en el día con seguimiento en tiempo real. ¡Comodidad digital pura!"
    ]
  },
  {
    id: 'blog-2',
    title: '¿Qué significan realmente los símbolos de tu ropa? Guía práctica para descifrar las etiquetas de lavado',
    category: 'Cuidado Textil',
    date: '08 de Abril, 2026',
    author: 'Por Adam Armoza',
    image: '/review_hoodie.png',
    color: '#EC4899',
    status: 'PUBLISHED',
    content: [
      "Seguro te pasó más de una vez. Estrenás esa prenda que tanto te gusta, te encanta cómo te calza y, después del primer paso por el lavarropas, sale con un talle menos, desteñida o con las costuras sutilmente reviradas. La primera reacción suele ser culpar a la calidad de la confección o al programa del electrodoméstico, pero la respuesta a este misterio doméstico suele estar escondida en esa pequeña tira de tela blanca que todos tendemos a cortar apenas estrenamos algo: la etiqueta de cuidado textil.",
      "Las etiquetas no están ahí por capricho normativo de los diseñadores de indumentaria. Son, literalmente, el manual de instrucciones de la prenda. Como el mercado nacional utiliza una enorme variedad de tejidos combinados, cada textil reacciona de forma diferente a la temperatura del agua, la fuerza del centrifugado y los productos de limpieza.",
      "Para que dejes de adivinar y protejas la vida útil de tu placard, armamos esta guía sencilla para descifrar los cuatro símbolos universales que toda persona debería conocer.",
      "1. El recipiente de agua (El lavado básico): Si el recipiente tiene un número (ej. 30° o 40°): Indica la temperatura máxima del agua que soporta el tejido. Lavar un buzo de algodón peinado a 60° afloja las fibras y achica la prenda de forma irreversible. Si tiene líneas abajo: Una línea horizontal significa que el lavado debe ser moderado (ciclo para ropa delicada); dos líneas exigen un ciclo extremadamente suave y un centrifugado mínimo. Si aparece una mano: Significa que el textil no tolera el movimiento del tambor del lavarropas. Requiere lavado a mano, agua fría y nada de retorcer la prenda para escurrirla.",
      "2. El triángulo (El uso de blanqueadores): Un triángulo vacío: Permite el uso de cualquier blanqueador cuando sea necesario. Un triángulo con líneas diagonales: Significa que solo podés usar blanqueadores a base de oxígeno, libres de cloro, para no quemar las fibras textiles. Un triángulo con una cruz (X) encima: Prohibición absoluta. Usar lavandina en esta prenda dañará el tinte original, dejando manchas amarillentas o desgastando el tejido hasta romperlo.",
      "3. El cuadrado con un círculo (El secado): Un punto dentro del círculo: Permite el secado a temperatura baja (ciclo suave). Dos puntos dentro del círculo: Soporta temperatura normal o alta. El símbolo tachado con una cruz: La prenda debe secarse de manera tradicional. Lo ideal para estos tejidos es colgarlos a la sombra, del revés, para evitar que la luz directa del sol se coma el brillo del color.",
      "4. La plancha (El toque final): Un punto en la plancha: Temperatura baja (máximo 110°C). Ideal para telas acrílicas, nylon o viscosa. Dos puntos: Temperatura media (máximo 150°C), recomendada para lanas y mezclas de poliéster. Tres puntos: Temperatura alta (hasta 200°C), necesaria para tejidos pesados y rígidos como el lino o el jean puro.",
      "Aprender a dedicarle un segundo a revisar estos pequeños iconos antes de programar el lavado te ahorra dolores de cabeza y cuida la estética de tus outfits por años. Al final del día, el mejor placard no es el que tiene más cantidad de cosas, sino el que se mantiene como nuevo gracias a un cuidado inteligente y consciente."
    ]
  },
  {
    id: 'blog-3',
    title: 'El costo oculto de vender por WhatsApp: Por qué las Pymes se están mudando a OutletGo',
    category: 'Pymes Textiles',
    date: '01 de Abril, 2026',
    author: 'Por José Valero',
    image: '/review_sneakers.png',
    color: '#10B981',
    status: 'PUBLISHED',
    content: [
      "Como dueño de un local textil, tu recurso más valioso es el tiempo. Sin embargo, un análisis de la rutina comercial en Avellaneda revela que las pymes familiares dedican más de 4 horas diarias a responder consultas repetitivas de stock: '¿Tenés en talle L?', '¿Qué colores quedan?', '¿Me pasás las medidas?' y coordinar motofletes de forma externa.",
      "Este canal de venta informal por WhatsApp genera una fricción inmensa, quiebres de stock continuos y pérdida de clientes por demoras en la respuesta.",
      "OutletGo funciona como un 'Catálogo Espejo' inteligente: el local sube sus prendas discontinuas o saldos en 2 clics y los clientes consultan stock y talles de forma automática. Además, delegás la entrega a nuestro transportista express, liberando tu mostrador y tus chats para lo verdaderamente importante."
    ]
  }
];

function getStoredBlogs(): BlogArticle[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BLOGS);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return INITIAL_BLOG_ARTICLES;
}

function saveStoredBlogs(blogs: BlogArticle[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_BLOGS, JSON.stringify(blogs));
  } catch {
    // ignore
  }
}

function getStoredCategories(): BlogCategory[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CATEGORIES);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return DEFAULT_CATEGORIES;
}

function saveStoredCategories(cats: BlogCategory[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(cats));
  } catch {
    // ignore
  }
}

export async function fetchBlogs(query = '', category = ''): Promise<BlogArticle[]> {
  let list: BlogArticle[] = [];
  try {
    const apiBlogs = await apiClient.get<BlogArticle[]>('/blogs');
    list = apiBlogs && apiBlogs.length > 0 ? apiBlogs : (import.meta.env.DEV ? getStoredBlogs() : []);
  } catch {
    list = import.meta.env.DEV ? getStoredBlogs() : [];
  }

  return list.filter((item) => {
    if (item.status === 'DRAFT' && !location.pathname.startsWith('/admin')) {
      return false;
    }
    const matchCat = !category || category === 'Todos' || item.category.toLowerCase() === category.toLowerCase();
    const q = query.trim().toLowerCase();
    const matchQuery = !q || item.title.toLowerCase().includes(q) || item.author.toLowerCase().includes(q) || item.content.some(p => p.toLowerCase().includes(q));
    return matchCat && matchQuery;
  });
}

export async function fetchBlogById(id: string): Promise<BlogArticle | null> {
  try {
    return await apiClient.get<BlogArticle>(`/blogs/${id}`);
  } catch {
    const blogs = getStoredBlogs();
    return blogs.find((b) => b.id === id) || null;
  }
}

export async function createBlog(data: Omit<BlogArticle, 'id'>): Promise<BlogArticle> {
  const newBlog: BlogArticle = {
    ...data,
    id: `blog-${Date.now()}`,
    status: data.status || 'PUBLISHED',
  };
  try {
    await apiClient.post('/api/admin/blogs', newBlog);
  } catch {
    const blogs = getStoredBlogs();
    const updated = [newBlog, ...blogs];
    saveStoredBlogs(updated);
  }
  return newBlog;
}

export async function updateBlog(id: string, data: Partial<BlogArticle>): Promise<BlogArticle> {
  try {
    return await apiClient.put<BlogArticle>(`/api/admin/blogs/${id}`, data);
  } catch {
    const blogs = getStoredBlogs();
    const idx = blogs.findIndex((b) => b.id === id);
    if (idx !== -1) {
      blogs[idx] = { ...blogs[idx]!, ...data };
      saveStoredBlogs(blogs);
      return blogs[idx]!;
    }
    throw new Error('Artículo no encontrado');
  }
}

export async function deleteBlog(id: string): Promise<boolean> {
  try {
    await apiClient.delete(`/api/admin/blogs/${id}`);
    return true;
  } catch {
    const blogs = getStoredBlogs();
    const updated = blogs.filter((b) => b.id !== id);
    saveStoredBlogs(updated);
    return true;
  }
}

export async function fetchBlogCategories(): Promise<BlogCategory[]> {
  try {
    const apiCats = await apiClient.get<BlogCategory[]>('/blogs/categories');
    if (apiCats && apiCats.length > 0) return apiCats;
    return import.meta.env.DEV ? getStoredCategories() : [];
  } catch {
    return import.meta.env.DEV ? getStoredCategories() : [];
  }
}

export async function createBlogCategory(name: string): Promise<BlogCategory> {
  const newCat: BlogCategory = {
    id: `cat-${Date.now()}`,
    name,
  };
  try {
    await apiClient.post('/api/admin/blogs/categories', newCat);
  } catch {
    const cats = getStoredCategories();
    if (!cats.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      cats.push(newCat);
      saveStoredCategories(cats);
    }
  }
  return newCat;
}

export async function deleteBlogCategory(id: string): Promise<boolean> {
  try {
    await apiClient.delete(`/api/admin/blogs/categories/${id}`);
  } catch {
    const cats = getStoredCategories();
    const updated = cats.filter(c => c.id !== id);
    saveStoredCategories(updated);
  }
  return true;
}
