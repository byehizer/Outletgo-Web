import { apiClient, ApiError } from '../../lib/http/apiClient';
import { fetchProductReviews } from '../reviews/reviewsApi';

export type SellerRegistrationRequestPayload = {
  businessName: string;
  cuit: string;
  contactName: string;
  email: string;
  phone: string;
  notes?: string;
};

import { submitSellerRegistrationRequest as submitRequest } from './landingSellerRequestsApi';

/**
 * Envía una solicitud de registro de comercio al backend.
 */
export async function submitSellerRegistrationRequest(
  data: SellerRegistrationRequestPayload,
): Promise<{ success: boolean; message: string }> {
  if (!data.businessName.trim() || !data.cuit.trim() || !data.contactName.trim() || !data.email.trim() || !data.phone.trim()) {
    throw new ApiError(400, null, 'Por favor, completá todos los campos obligatorios.');
  }

  const cleanCuit = data.cuit.replace(/\D/g, '');
  if (cleanCuit.length !== 11) {
    throw new ApiError(400, null, 'El CUIT debe tener exactamente 11 dígitos numéricos.');
  }

  await submitRequest(data);
  return {
    success: true,
    message: 'Tu solicitud fue recibida correctamente. Nos contactaremos pronto.',
  };
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
}

export const FALLBACK_BLOG_ARTICLES: BlogArticle[] = [
  {
    id: 'blog-1',
    title: 'Cómo comprar en Avellaneda sin morir en el intento: La Guía Digital definitiva',
    category: 'Guías de Compra',
    date: '12 de Abril, 2026',
    author: 'Por Ehizer Valero',
    image: '/review_oversize_tee.png',
    color: '#2B8FD4',
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
    content: [
      "Como dueño de un local textil, tu recurso más valioso es el tiempo. Sin embargo, un análisis de la rutina comercial en Avellaneda revela que las pymes familiares dedican más de 4 horas diarias a responder consultas repetitivas de stock: '¿Tenés en talle L?', '¿Qué colores quedan?', '¿Me pasás las medidas?' y coordinar motofletes de forma externa.",
      "Este canal de venta informal por WhatsApp genera una fricción inmensa, quiebres de stock continuos y pérdida de clientes por demoras en la respuesta.",
      "OutletGo funciona como un 'Catálogo Espejo' inteligente: el local sube sus prendas discontinuas o saldos en 2 clics y los clientes consultan stock y talles de forma automática. Además, delegás la entrega a nuestro transportista express, liberando tu mostrador y tus chats para lo verdaderamente importante."
    ]
  }
];

export async function fetchBlogsFromApi(): Promise<BlogArticle[]> {
  try {
    return await apiClient.get<BlogArticle[]>('/blogs');
  } catch {
    return FALLBACK_BLOG_ARTICLES;
  }
}

export async function fetchB2bVideoUrlFromApi(): Promise<string> {
  try {
    const res = await apiClient.get<{ value: string }>('/settings/b2b-video-url');
    return res.value || localStorage.getItem('outletgo_b2b_video_url') || 'https://www.youtube.com/embed/8tCq3330N1o';
  } catch {
    return localStorage.getItem('outletgo_b2b_video_url') || 'https://www.youtube.com/embed/8tCq3330N1o';
  }
}

export async function updateB2bVideoUrlInApi(url: string): Promise<boolean> {
  try {
    await apiClient.put('/api/admin/settings/b2b-video-url', { value: url });
    localStorage.setItem('outletgo_b2b_video_url', url);
    return true;
  } catch {
    localStorage.setItem('outletgo_b2b_video_url', url);
    return true;
  }
}

export interface CommunityReview {
  id: string;
  authorName: string;
  authorHandle: string;
  rating: number;
  comment: string;
  productName: string;
  storeName: string;
  image: string;
  fitTag: string;
  fabricTag: string;
}

export const FALLBACK_COMMUNITY_REVIEWS: CommunityReview[] = [
  {
    id: 'rev-comm-1',
    authorName: 'Sofía M.',
    authorHandle: '@sofi_lavorano',
    rating: 5,
    comment: 'Mido 1.65m y pedí talle M. Queda perfecto oversize, no se deforma al lavar y las costuras están impecables. ¡Volveré a comprar seguro!',
    productName: 'Remera Oversize Algodón',
    storeName: 'Moda Flores Local',
    image: '/review_oversize_tee.png',
    fitTag: 'Talle: Fiel a la Tabla',
    fabricTag: 'Tela: Algodón Grueso',
  },
  {
    id: 'rev-comm-2',
    authorName: 'Micaela G.',
    authorHandle: '@mica.gomez',
    rating: 4,
    comment: 'Las zapatillas son súper livianas y la suela es de goma real. Calzo 38 pero pedí 39 y me anduvieron bárbaro, sigan el consejo de pedir un número más.',
    productName: 'Zapatillas Urban Canvas',
    storeName: 'Calzados Avellaneda',
    image: '/review_sneakers.png',
    fitTag: 'Talle: Pedir un número más',
    fabricTag: 'Suela: Goma Antideslizante',
  },
  {
    id: 'rev-comm-3',
    authorName: 'Camila R.',
    authorHandle: '@cami_rodriguez',
    rating: 5,
    comment: 'Buscaba un buzo abrigado y este es de frisa pesada premium. Súper suave por dentro y el color gris es idéntico a la foto de catálogo. ¡Me encantó!',
    productName: 'Buzo Frisa Premium',
    storeName: 'Moda Flores Local',
    image: '/review_hoodie.png',
    fitTag: 'Talle: Exacto',
    fabricTag: 'Tela: Frisa muy abrigada',
  },
];

export async function fetchCommunityReviews(): Promise<CommunityReview[]> {
  try {
    const page = await fetchProductReviews({ page: 0, size: 6, rating: 5 });
    if (page.content && page.content.length > 0) {
      return page.content.map((r, i) => ({
        id: r.id,
        authorName: r.authorName,
        authorHandle: `@${r.authorName.toLowerCase().replace(/\s+/g, '_')}`,
        rating: r.rating,
        comment: r.comment || '¡Excelente calidad y calce perfecto!',
        productName: r.productName || 'Prenda Indumentaria Local',
        storeName: 'Local Avellaneda',
        image: (r.imageUrls && r.imageUrls[0]) || FALLBACK_COMMUNITY_REVIEWS[i % 3]!.image,
        fitTag: '✓ Compra Verificada',
        fabricTag: 'Talle Validado',
      }));
    }
    return FALLBACK_COMMUNITY_REVIEWS;
  } catch {
    return FALLBACK_COMMUNITY_REVIEWS;
  }
}
