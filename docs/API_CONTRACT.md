# API Contract — OutletGo Frontend ↔ Backend

> Generado desde el código fuente del frontend. Última revisión: mayo 2026 — **Estrategia B (Enterprise), contratos cerrados**.
>
> **Convenciones:**
> - Todos los endpoints privados requieren `Authorization: Bearer <jwt>` en el header.
> - En endpoints privados, si el backend responde `401`, el frontend limpia la sesión (localStorage) y redirige a `/login`.
> - Paginación: todos los endpoints de listado e hilos de mensajería devuelven `Page<T>` estilo Spring (ver sección de arquitectura).
> - Fechas: siempre ISO 8601. Monedas: números crudos en ARS (el frontend formatea).
> - **Estado:** todos los endpoints documentados están confirmados para integración backend.

---

## Tipos compartidos

```typescript
/** Paginación estilo Spring — usada en todos los listados. */
type Page<T> = {
  content:       T[];
  totalElements: number;
  number:        number;  // página actual (0-based)
  size:          number;
};

/** Rol de usuario. */
type Role = 'SELLER' | 'ADMIN';

/** Usuario autenticado. */
type User = {
  id:        string;
  email:     string;
  role:      Role;
  name:      string;
  storeId:   string | null;  // null para ADMIN
  avatarUrl: string | null;
  isActive:  boolean;
};
```

---

## 1. Autenticación

### POST /api/auth/login

**Quién lo usa:** Ambos  
**Cuándo se llama:** Al hacer submit del formulario de login con email y contraseña.

**Request:**
- Params: ninguno
- Body:
```typescript
{
  email:    string;
  password: string;
}
```

**Respuesta esperada:**
```typescript
{
  token: string;  // JWT
  user:  User;
}
```

**Qué hace el frontend con esto:**
Guarda `token` en `localStorage["outletgo_token"]` y `user` en `localStorage["outletgo_user"]`. Actualiza el contexto de autenticación (`AuthContext`). Redirige a `/seller` o `/admin` según `user.role`.

**Errores manejados:**
- 401 / 400 → muestra toast de error: "Credenciales inválidas. Revisá tu email y contraseña."
- 5xx → toast de error genérico

---

### GET /api/auth/me

**Quién lo usa:** Ambos  
**Cuándo se llama:** En el callback de OAuth (`/auth/callback`), justo después de recibir el `?token=` en la URL, antes de persistir la sesión. Se pasa el token como `Authorization: Bearer` explícito.

**Request:**
- Params: ninguno (el token se pasa en el header, no en localStorage)
- Body: ninguno

**Respuesta esperada:**
```typescript
User
```

**Qué hace el frontend con esto:**
Verifica que el perfil sea válido y que `user.role` sea `SELLER` o `ADMIN`. Persiste token y usuario en localStorage. Redirige al panel correspondiente. Si el role no está permitido, redirige a `/forbidden`.

**Errores manejados:**
- 401 → limpia token de la URL y redirige a `/login`
- 403 → redirige a `/forbidden`
- 5xx → muestra mensaje de error en la pantalla de callback

---

### POST /api/auth/recover-password

**Quién lo usa:** Ambos  
**Cuándo se llama:** Al hacer submit del formulario de recuperación de contraseña.

**Request:**
- Body:
```typescript
{
  email: string;
}
```

**Respuesta esperada:**
```typescript
void  // o cualquier 2xx
```

**Qué hace el frontend con esto:**
Siempre muestra un mensaje de éxito neutro ("Si el correo existe, recibirás instrucciones") — no revela si el email existe o no.

**Errores manejados:**
- Cualquier error → se ignora; la UI siempre muestra éxito neutro (política anti-enumeración)

---

## 2. Productos — Seller

### GET /api/seller/products

**Quién lo usa:** Seller  
**Cuándo se llama:** Al cargar la página de listado de productos (`/seller/products`) y cada vez que cambia la página, filtro de nombre o filtro de estado.

**Request:**
- Params (query):
```
page:   number (0-based)
size:   number
name?:  string (búsqueda por nombre)
status?: 'ACTIVE' | 'PAUSED_BY_SELLER' | 'DISABLED_BY_ADMIN'
```

**Respuesta esperada:**
```typescript
Page<{
  id:           string;
  name:         string;
  thumbnailUrl: string | null;
  price:        number;   // ARS
  totalStock:   number;
  status:       'ACTIVE' | 'PAUSED_BY_SELLER' | 'DISABLED_BY_ADMIN';
}>
```

**Qué hace el frontend con esto:**
Renderiza la tabla de productos con nombre, precio, stock y estado. Muestra paginación.

**Errores manejados:**
- 4xx → toast de error
- 401 → limpia sesión → `/login`

---

### GET /api/seller/products/:productId

**Quién lo usa:** Seller  
**Cuándo se llama:** Al abrir el formulario de edición de un producto (`/seller/products/:id/edit`).

**Request:**
- Params: `productId` en la URL (path param)

**Respuesta esperada:**
```typescript
{
  id:          string;
  name:        string;
  description: string;
  basePrice:   number;
  status:      'ACTIVE' | 'PAUSED_BY_SELLER' | 'DISABLED_BY_ADMIN';
  categoryId:  string;
  imageUrls:   string[];
  variations:  Array<{
    id:    string;
    size:  string;
    color: string;
    stock: number;
  }>;
  tags:        string[];
}
```

**Qué hace el frontend con esto:**
Rellena el formulario de edición con los datos del producto.

**Errores manejados:**
- 404 → toast "Producto no encontrado"
- 401 → limpia sesión → `/login`

---

### POST /api/seller/products

**Quién lo usa:** Seller  
**Cuándo se llama:** Al guardar un producto nuevo desde el formulario (`/seller/products/new`).

**Request:**
- Body:
```typescript
{
  name:        string;
  description: string;
  basePrice:   number;
  categoryId:  string;
  imageUrls:   string[];      // URLs ya subidas vía /api/uploads/product-image
  variations:  Array<{
    size:  string;
    color: string;
    stock: number;
  }>;
  tags:        string[];
}
```

**Respuesta esperada:**
```typescript
{ id: string }
// O bien el objeto completo SellerProductDetail (el frontend extrae el id)
```

**Qué hace el frontend con esto:**
Redirige a `/seller/products` y muestra toast de éxito.

**Errores manejados:**
- 400 → toast con mensaje de validación del servidor
- 401 → limpia sesión → `/login`

---

### PATCH /api/seller/products/:productId

**Quién lo usa:** Seller  
**Cuándo se llama:** Al guardar cambios en el formulario de edición de un producto existente.

**Request:**
- Params: `productId` en la URL
- Body: igual que el POST (misma estructura `SellerProductSavePayload`)

**Respuesta esperada:**
```typescript
void  // o el objeto actualizado (el frontend no lo usa)
```

**Qué hace el frontend con esto:**
Muestra toast de éxito y redirige a `/seller/products`.

**Errores manejados:**
- 400 / 404 → toast de error
- 401 → limpia sesión → `/login`

---

### PATCH /api/seller/products/:productId/status

**Estado:** Confirmado  
**Quién lo usa:** Seller  
**Cuándo se llama:** Al pausar o reactivar un producto desde la lista o el detalle.

**Request:**
- Params: `productId` en la URL
- Body:
```typescript
{
  status: 'ACTIVE' | 'PAUSED_BY_SELLER';
}
```

**Respuesta esperada:**
```typescript
void  // o el objeto actualizado
```

**Qué hace el frontend con esto:**
Actualiza el estado del producto en la lista y muestra toast de éxito.

**Errores manejados:**
- 4xx → toast de error
- 401 → limpia sesión → `/login`

---

### DELETE /api/seller/products/:productId

**Estado:** Confirmado  
**Quién lo usa:** Seller  
**Cuándo se llama:** Al confirmar la baja lógica de un producto desde la lista.

**Request:**
- Params: `productId` en la URL

**Respuesta esperada:**
```typescript
void  // 204 No Content o similar
```

**Qué hace el frontend con esto:**
Elimina el producto de la lista local y muestra toast de éxito.

**Errores manejados:**
- 4xx → toast de error
- 401 → limpia sesión → `/login`

---

## 3. Pedidos — Seller

### GET /api/seller/orders

**Quién lo usa:** Seller  
**Cuándo se llama:** Al cargar la lista de pedidos (`/seller/orders`) y con cada cambio de página o filtro.

**Request:**
- Params (query):
```
page:       number (0-based)
size:       number
search?:    string (busca por ID de orden o nombre de comprador)
status?:    OrderStatus
startDate?: string (ISO 8601 fecha)
endDate?:   string (ISO 8601 fecha)
```

**Respuesta esperada:**
```typescript
Page<SellerOrderStore>

type SellerOrderStore = {
  id:          string;   // ID del slice (OrderStore)
  orderId:     string;   // ID de la orden padre
  status:      OrderStatus;
  subtotalArs: number;
  orderDate:   string;   // ISO 8601
  buyer: {
    displayName: string | null;
    email:       string;
  };
  items: Array<{
    id:          string;
    productName: string;
    size:        string | null;
    color:       string | null;
    quantity:    number;
    unitPrice:   number;
    imageUrl:    string | null;
  }>;
  stockIssues?: Array<{
    itemId:            string;
    productName:       string;
    size:              string;
    color:             string;
    requestedQuantity: number;
    availableQuantity: number;
  }>;
};

type OrderStatus =
  | 'PENDING'
  | 'PAID'
  | 'PREPARING'
  | 'READY_FOR_PICKUP'
  | 'COMPLETED'
  | 'CANCELED'
  | 'STOCK_ISSUE';
```

**Qué hace el frontend con esto:**
Renderiza la tabla de pedidos con estado, comprador, fecha y subtotal.

**Errores manejados:**
- 4xx → toast de error
- 401 → limpia sesión → `/login`

---

### GET /api/seller/orders/:sliceId

**Quién lo usa:** Seller  
**Cuándo se llama:** Al abrir el detalle de un pedido (`/seller/orders/:sliceId`).

**Request:**
- Params: `sliceId` en la URL

**Respuesta esperada:**
```typescript
SellerOrderStore  // misma estructura que arriba
```

**Qué hace el frontend con esto:**
Renderiza el detalle del pedido con items, estado actual, y botones de acción disponibles.

**Errores manejados:**
- 404 → toast "Pedido no encontrado"
- 401 → limpia sesión → `/login`

---

### POST /api/seller/orders/:sliceId/advance

**Quién lo usa:** Seller  
**Cuándo se llama:** Al hacer clic en "Avanzar estado" (PAID → PREPARING → READY_FOR_PICKUP).

**Request:**
- Params: `sliceId` en la URL
- Body: ninguno

**Respuesta esperada:**
```typescript
SellerOrderStore  // con status actualizado
```

**Qué hace el frontend con esto:**
Actualiza el estado del pedido en pantalla y muestra toast de éxito.

**Errores manejados:**
- 400 → toast con mensaje del servidor (estado no avanzable)
- 401 → limpia sesión → `/login`

---

### POST /api/seller/orders/:sliceId/items/:itemId/stock-issue

**Quién lo usa:** Seller  
**Cuándo se llama:** Al reportar stock insuficiente en un ítem de un pedido.

**Request:**
- Params: `sliceId` e `itemId` en la URL
- Body:
```typescript
{
  availableQuantity: number;  // entero >= 0, menor a quantity pedida
}
```

**Respuesta esperada:**
```typescript
SellerOrderStore  // con status STOCK_ISSUE y stockIssues actualizado
```

**Qué hace el frontend con esto:**
Actualiza el estado del pedido en pantalla.

**Errores manejados:**
- 400 → toast de error (cantidad inválida o mayor a la pedida)
- 401 → limpia sesión → `/login`

---

### POST /api/seller/orders/:sliceId/items/:itemId/cancel

**Quién lo usa:** Seller  
**Cuándo se llama:** Al cancelar un ítem específico de un pedido.

**Request:**
- Params: `sliceId` e `itemId` en la URL
- Body: ninguno

**Respuesta esperada:**
```typescript
SellerOrderStore  // con el ítem eliminado; si no quedan ítems, status = CANCELED
```

**Qué hace el frontend con esto:**
Actualiza el pedido en pantalla. Si el pedido queda sin ítems, muestra estado cancelado.

**Errores manejados:**
- 404 → toast "Ítem no encontrado"
- 401 → limpia sesión → `/login`

---

## 4. Reseñas — Seller

### GET /api/seller/reviews/store

**Quién lo usa:** Seller  
**Cuándo se llama:** Al cargar la pestaña "Reseñas de tienda" en `/seller/reviews`.

**Request:**
- Params (query):
```
page:          number (0-based)
size:          number
rating?:       number (1–5, filtro exacto)
sortCreatedAt: 'ASC' | 'DESC'
```

**Respuesta esperada:**
```typescript
Page<SellerReview>

type SellerReview = {
  id:            string;
  rating:        number;   // 1–5
  comment:       string | null;
  isVisible:     boolean;
  createdAt:     string;   // ISO 8601
  referenceType: 'STORE' | 'PRODUCT';
  buyer: {
    id:          string;
    displayName: string | null;
    email:       string;
  };
  product: {
    id:   string;
    name: string;
  } | null;
};
```

**Qué hace el frontend con esto:**
Renderiza la tabla de reseñas de la tienda con rating, comentario, comprador y fecha.

**Errores manejados:**
- 4xx → toast de error
- 401 → limpia sesión → `/login`

---

### GET /api/seller/reviews/products

**Quién lo usa:** Seller  
**Cuándo se llama:** Al cargar la pestaña "Reseñas de productos" en `/seller/reviews`.

**Request:**
- Params (query):
```
page:          number (0-based)
size:          number
rating?:       number (1–5)
productId?:    string (filtro por producto)
sortCreatedAt: 'ASC' | 'DESC'
search?:       string (búsqueda por nombre de comprador o producto)
```

**Respuesta esperada:**
```typescript
Page<SellerReview>  // misma estructura que arriba
```

**Qué hace el frontend con esto:**
Renderiza la tabla de reseñas de productos.

**Errores manejados:**
- 4xx → toast de error
- 401 → limpia sesión → `/login`

---

## 5. Chat — Seller

### GET /api/seller/chats

**Estado:** Confirmado  
**Quién lo usa:** Seller  
**Cuándo se llama:** Al cargar la lista de conversaciones (`/seller/chats`).

**Request:**
- Query:
```
page: number (0-based, default 0)
size: number (default 20)
```

**Respuesta esperada:**
```typescript
Page<{
  id:                 string;   // conversationId
  buyerName:          string;
  lastMessageContent: string;
  lastMessageAt:      string;   // ISO 8601
  unreadCount:        number;
}>
```

**Qué hace el frontend con esto:**
Lee `response.content` y renderiza la lista de conversaciones ordenadas por `lastMessageAt` desc. Muestra badge con `unreadCount`.

**Errores manejados:**
- 4xx → muestra estado vacío o mensaje de error
- 401 → limpia sesión → `/login`

---

### GET /api/seller/chats/:conversationId/messages

**Estado:** Confirmado  
**Quién lo usa:** Seller  
**Cuándo se llama:** Al abrir una conversación. Se refresca por polling cada 5 segundos.

**Request:**
- Params: `conversationId` en la URL
- Query (opcionales):
```
page: number (0-based, default 0)
size: number (default 100)
```

**Respuesta esperada:**
```typescript
Page<{
  id:             string;
  conversationId: string;
  senderRole:     'BUYER' | 'SELLER';
  content:        string;
  sentAt:         string;  // ISO 8601
}>
```

**Qué hace el frontend con esto:**
Lee `response.content` y renderiza el hilo de mensajes ordenado por `sentAt`. Muestra burbuja diferenciada para BUYER vs SELLER. El polling solicita `page=0&size=100` para obtener el hilo activo sin saturar memoria.

**Errores manejados:**
- 4xx → muestra error en el panel de chat
- 401 → limpia sesión → `/login`

---

### POST /api/seller/chats/:conversationId/messages

**Estado:** Confirmado — `conversationId` va en el path  
**Quién lo usa:** Seller  
**Cuándo se llama:** Al enviar un mensaje desde el composer de chat.

**Request:**
- Params: `conversationId` en la URL
- Body:
```typescript
{
  content: string;
}
```

**Respuesta esperada:**
```typescript
{
  id:             string;
  conversationId: string;
  senderRole:     'SELLER';
  content:        string;
  sentAt:         string;  // ISO 8601
}
```

**Qué hace el frontend con esto:**
Agrega el mensaje al hilo local y limpia el composer.

**Errores manejados:**
- 4xx → toast de error; el mensaje no se agrega al hilo
- 401 → limpia sesión → `/login`

---

## 6. Soporte — Seller

### GET /api/support/messages

**Estado:** Confirmado — el backend identifica al vendedor únicamente por JWT (sin IDs en la URL)  
**Quién lo usa:** Seller  
**Cuándo se llama:** Al cargar la página de soporte (`/seller/support`) y por polling cada 5 segundos.

**Request:**
- Params (query):
```
page: number (0-based)
size: number
```
- Sin path params ni storeId: la identidad del seller se resuelve desde el token JWT.

**Respuesta esperada:**
```typescript
Page<{
  id:             string;
  senderId:       string;
  senderRole:     'SELLER' | 'ADMIN';
  content:        string;
  sentAt:         string;    // ISO 8601
  attachmentUrl:  string | null;
  attachmentType: 'image' | 'pdf' | null;
}>
```

**Qué hace el frontend con esto:**
Renderiza el hilo de soporte entre el seller y el admin.

**Errores manejados:**
- 4xx → muestra error en el hilo
- 401 → limpia sesión → `/login`

---

### POST /api/support/messages

**Estado:** Confirmado — el backend identifica al vendedor únicamente por JWT  
**Quién lo usa:** Seller  
**Cuándo se llama:** Al enviar un mensaje de soporte desde el panel seller.

**Request:**
- Sin path params: identidad del seller vía JWT
- Body:
```typescript
{
  content:        string;
  attachmentUrl?: string;
  attachmentType?: 'image' | 'pdf';
}
```

**Respuesta esperada:**
```typescript
{
  id:             string;
  senderId:       string;
  senderRole:     'SELLER';
  content:        string;
  sentAt:         string;
  attachmentUrl:  string | null;
  attachmentType: 'image' | 'pdf' | null;
}
```

**Qué hace el frontend con esto:**
Agrega el mensaje al hilo local y limpia el composer.

**Errores manejados:**
- 4xx → toast de error
- 401 → limpia sesión → `/login`

---

## 7. Perfil de tienda — Seller

### GET /api/seller/store

**Quién lo usa:** Seller  
**Cuándo se llama:** Al cargar la página de perfil de tienda (`/seller/store`).

**Request:**
- Params: ninguno

**Respuesta esperada:**
```typescript
{
  id:             string;
  name:           string;
  taxIdCuit:      string;
  streetAddress:  string;
  phone:          string | null;
  headerImageUrl: string | null;
  logoUrl:        string | null;
  latitude:       number | null;
  longitude:      number | null;
  social: {
    instagram: string | null;
    facebook:  string | null;
    tiktok:    string | null;
    website:   string | null;
  };
  businessHours: Array<{
    day:       'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
    isClosed:  boolean;
    openTime:  string | null;   // "HH:mm"
    closeTime: string | null;   // "HH:mm"
  }>;
}
```

**Qué hace el frontend con esto:**
Rellena el formulario de perfil de tienda. Muestra mapa con pin en `latitude`/`longitude`.

**Errores manejados:**
- 500 → toast "Error al cargar perfil"
- 401 → limpia sesión → `/login`

---

### PATCH /api/seller/store

**Quién lo usa:** Seller  
**Cuándo se llama:** Al guardar los cambios del formulario de perfil de tienda.

**Request:**
- Body:
```typescript
{
  name:           string;
  taxIdCuit:      string;
  streetAddress:  string;
  phone:          string | null;
  headerImageUrl: string | null;
  logoUrl:        string | null;
  social: {
    instagram: string | null;
    facebook:  string | null;
    tiktok:    string | null;
    website:   string | null;
  };
  businessHours: Array<{
    day:       'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
    isClosed:  boolean;
    openTime:  string | null;
    closeTime: string | null;
  }>;
}
```

**Respuesta esperada:**
```typescript
// Mismo objeto que GET /api/seller/store (con id y coordenadas calculadas por backend)
{
  id:             string;
  name:           string;
  taxIdCuit:      string;
  streetAddress:  string;
  phone:          string | null;
  headerImageUrl: string | null;
  logoUrl:        string | null;
  latitude:       number | null;
  longitude:      number | null;
  social: { instagram: string | null; facebook: string | null; tiktok: string | null; website: string | null; };
  businessHours:  Array<{ day: string; isClosed: boolean; openTime: string | null; closeTime: string | null; }>;
}
```

**Qué hace el frontend con esto:**
Actualiza el estado local del perfil. Muestra toast de éxito. Actualiza el pin en el mapa si `latitude`/`longitude` cambiaron.

**Errores manejados:**
- 400 → toast con mensaje de validación
- 401 → limpia sesión → `/login`

---

## 8. Dashboard — Seller

### GET /api/seller/dashboard

**Estado:** Confirmado — `criticalVariations` lo calcula y envía el backend  
**Quién lo usa:** Seller  
**Cuándo se llama:** Al cargar la home del panel seller (`/seller`).

**Request:**
- Params: ninguno

**Respuesta esperada:**
```typescript
{
  kpis: {
    pendingOrders:    number;
    monthlyRevenue:   number;   // ARS
    lowStockProducts: number;
    storeRatingAvg:   number;
    storeRatingCount: number;
    stockIssueOrders: number;
  };
  recentOrders: Array<{
    id:          string;   // sliceId
    orderId:     string;
    subtotalArs: number;
    status:      OrderStatus;
    orderDate:   string;   // ISO 8601
    buyer: {
      displayName: string | null;
      email:       string;
    };
  }>;
  lowStockProducts: Array<{
    id:    string;
    name:  string;
    imageUrl: string;
    /** Variaciones con stock ≤ 3 — calculadas en backend, no en frontend. */
    criticalVariations: Array<{
      size:  string;
      color: string;
      stock: number;
    }>;
  }>;
  recentReviews: Array<{
    id:                string;
    authorDisplayName: string | null;
    rating:            number;
    comment:           string | null;
    createdAt:         string;  // ISO 8601
  }>;
}
```

**Qué hace el frontend con esto:**
Renderiza KPIs, tabla de pedidos recientes, lista de productos con bajo stock, y últimas reseñas.

**Errores manejados:**
- 500 → muestra mensaje de error en el dashboard
- 401 → limpia sesión → `/login`

---

## 9. Cuentas de vendedores — Admin

### GET /api/admin/sellers

**Quién lo usa:** Admin  
**Cuándo se llama:** Al cargar la lista de vendedores (`/admin/sellers`) y con cada cambio de filtro o página.

**Request:**
- Params (query):
```
page:      number (0-based)
size:      number
search?:   string (filtra por email o businessName)
isActive?: boolean
```

**Respuesta esperada:**
```typescript
Page<SellerAccount>

type SellerAccount = {
  id:        string;
  email:     string;
  isActive:  boolean;
  createdAt: string;  // ISO 8601
  store: {
    id:             string;
    businessName:   string;
    cuit:           string;
    address:        string;
    description:    string;
    headerImageUrl: string | null;
    ratingAvg:      number | null;
    ratingCount:    number;
  };
};
```

**Qué hace el frontend con esto:**
Renderiza la tabla de vendedores con nombre de tienda, email, CUIT, estado y rating.

**Errores manejados:**
- 4xx → toast de error
- 401 → limpia sesión → `/login`

---

### POST /api/admin/sellers

**Quién lo usa:** Admin  
**Cuándo se llama:** Al confirmar la creación de una cuenta vendedor desde el modal.

**Request:**
- Body:
```typescript
{
  email:        string;
  businessName: string;
  cuit:         string;
  address:      string;
  description?: string;
}
```

**Respuesta esperada:**
```typescript
SellerAccount  // objeto completo del vendedor recién creado
```

**Qué hace el frontend con esto:**
Agrega el vendedor al inicio de la lista local. Cierra el modal. Muestra toast de éxito.

**Errores manejados:**
- 400 / 409 → toast con mensaje del servidor (email duplicado, CUIT inválido, etc.)
- 401 → limpia sesión → `/login`

---

### PATCH /api/admin/sellers/:sellerId

**Quién lo usa:** Admin  
**Cuándo se llama:** Al guardar la edición de un vendedor desde el modal de edición.

**Request:**
- Params: `sellerId` en la URL
- Body:
```typescript
{
  email:          string;
  businessName:   string;
  cuit:           string;
  address:        string;
  description?:   string;
  headerImageUrl?: string | null;
}
```

**Respuesta esperada:**
```typescript
SellerAccount  // objeto actualizado
```

**Qué hace el frontend con esto:**
Actualiza la fila del vendedor en la lista local. Cierra el modal. Muestra toast de éxito.

**Errores manejados:**
- 400 / 404 → toast de error
- 401 → limpia sesión → `/login`

---

### PATCH /api/admin/sellers/:sellerId/status

**Quién lo usa:** Admin  
**Cuándo se llama:** Al activar o desactivar una cuenta vendedor.

**Request:**
- Params: `sellerId` en la URL
- Body:
```typescript
{
  isActive: boolean;
  reason:   string;  // requerido si isActive = false; mínimo 10 caracteres
}
```

**Respuesta esperada:**
```typescript
SellerAccount  // con isActive actualizado
```

**Qué hace el frontend con esto:**
Actualiza el estado del vendedor en la lista. Muestra toast de éxito.

**Errores manejados:**
- 400 → toast con validación (motivo muy corto)
- 401 → limpia sesión → `/login`

---

## 10. Cuentas de compradores — Admin

### GET /api/admin/buyers

**Quién lo usa:** Admin  
**Cuándo se llama:** Al cargar la lista de compradores (`/admin/buyers`) y con cada cambio de filtro o página.

**Request:**
- Params (query):
```
page:      number (0-based)
size:      number
search?:   string (filtra por email o nombre)
isActive?: boolean
```

**Respuesta esperada:**
```typescript
Page<BuyerAccount>

type BuyerAccount = {
  id:        string;
  email:     string;
  name:      string | null;
  isActive:  boolean;
  createdAt: string;  // ISO 8601
  stats: {
    totalOrders:  number;
    totalReviews: number;
  };
};
```

**Qué hace el frontend con esto:**
Renderiza la tabla de compradores con nombre, email, estado y estadísticas.

**Errores manejados:**
- 4xx → toast de error
- 401 → limpia sesión → `/login`

---

### PATCH /api/admin/buyers/:buyerId/email

**Quién lo usa:** Admin  
**Cuándo se llama:** Al guardar el cambio de email de un comprador.

**Request:**
- Params: `buyerId` en la URL
- Body:
```typescript
{
  email: string;
}
```

**Respuesta esperada:**
```typescript
BuyerAccount  // con email actualizado
```

**Qué hace el frontend con esto:**
Actualiza la fila del comprador en la lista. Cierra el modal. Muestra toast de éxito.

**Errores manejados:**
- 400 / 409 → toast con mensaje del servidor
- 401 → limpia sesión → `/login`

---

### POST /api/admin/buyers/:buyerId/reset-password

**Quién lo usa:** Admin  
**Cuándo se llama:** Al confirmar el reseteo de contraseña de un comprador.

**Request:**
- Params: `buyerId` en la URL
- Body:
```typescript
{
  temporaryPassword: string;  // mínimo 8 caracteres
}
```

**Respuesta esperada:**
```typescript
void  // 2xx
```

**Qué hace el frontend con esto:**
Muestra toast de éxito. Cierra el modal.

**Errores manejados:**
- 400 → toast de validación
- 401 → limpia sesión → `/login`

---

### PATCH /api/admin/buyers/:buyerId/status

**Quién lo usa:** Admin  
**Cuándo se llama:** Al activar o desactivar una cuenta comprador.

**Request:**
- Params: `buyerId` en la URL
- Body:
```typescript
{
  isActive: boolean;
  reason:   string;
}
```

**Respuesta esperada:**
```typescript
BuyerAccount  // con isActive actualizado
```

**Qué hace el frontend con esto:**
Actualiza el estado del comprador en la lista. Muestra toast de éxito.

**Errores manejados:**
- 400 → toast de validación
- 401 → limpia sesión → `/login`

---

## 11. Moderación de productos — Admin

### GET /api/admin/products

**Quién lo usa:** Admin  
**Cuándo se llama:** Al cargar la moderación de productos (`/admin/products`) y con cada cambio de filtro.

**Request:**
- Params (query):
```
page:     number (0-based)
size:     number
search?:  string (por nombre de producto)
status?:  'ACTIVE' | 'PAUSED_BY_SELLER' | 'DISABLED_BY_ADMIN'
storeId?: string
```

**Respuesta esperada:**
```typescript
Page<AdminProduct>

type AdminProduct = {
  id:          string;
  name:        string;
  description: string;
  basePrice:   number;
  status:      'ACTIVE' | 'PAUSED_BY_SELLER' | 'DISABLED_BY_ADMIN';
  store: {
    id:           string;
    businessName: string;
  };
  category: {
    id:   string;
    name: string;
  };
  images: Array<{ id: string; imageUrl: string }>;
  variations: Array<{
    id:    string;
    size:  string;
    color: string;
    stock: number;
  }>;
  tags: Array<{ id: string; tagName: string }>;
  ratingAvg:   number | null;
  ratingCount: number;
  createdAt:   string;  // ISO 8601
  moderationHistory: Array<{
    id:         string;
    action:     'DISABLED' | 'REACTIVATED';
    adminEmail: string;
    reason:     string | null;
    createdAt:  string;
  }>;
};
```

**Qué hace el frontend con esto:**
Renderiza la tabla de productos con estado, tienda, precio y acciones de moderación.

**Errores manejados:**
- 4xx → toast de error
- 401 → limpia sesión → `/login`

---

### GET /api/admin/products/:productId

**Quién lo usa:** Admin  
**Cuándo se llama:** Al abrir el panel de detalle de un producto en moderación.

**Request:**
- Params: `productId` en la URL

**Respuesta esperada:**
```typescript
AdminProduct  // misma estructura completa
```

**Errores manejados:**
- 404 → toast "Producto no encontrado"
- 401 → limpia sesión → `/login`

---

### POST /api/admin/products/:productId/disable

**Quién lo usa:** Admin  
**Cuándo se llama:** Al confirmar la inhabilitación de un producto activo.

**Request:**
- Params: `productId` en la URL
- Body:
```typescript
{
  reason: string;  // mínimo 10 caracteres
}
```

**Respuesta esperada:**
```typescript
AdminProduct  // con status = 'DISABLED_BY_ADMIN' y nueva entrada en moderationHistory
```

**Qué hace el frontend con esto:**
Actualiza el producto en la lista y en el panel de detalle. Muestra toast de éxito.

**Errores manejados:**
- 400 → toast (motivo inválido)
- 409 → toast "Solo se pueden inhabilitar productos activos"
- 401 → limpia sesión → `/login`

---

### POST /api/admin/products/:productId/reactivate

**Quién lo usa:** Admin  
**Cuándo se llama:** Al reactivar un producto inhabilitado por admin.

**Request:**
- Params: `productId` en la URL
- Body: `{}` (vacío)

**Respuesta esperada:**
```typescript
AdminProduct  // con status = 'ACTIVE' y nueva entrada en moderationHistory
```

**Qué hace el frontend con esto:**
Actualiza el producto en la lista y panel. Muestra toast de éxito.

**Errores manejados:**
- 409 → toast "Solo se pueden reactivar productos inhabilitados"
- 401 → limpia sesión → `/login`

---

## 12. Moderación de reseñas — Admin

### GET /api/admin/reviews

**Quién lo usa:** Admin  
**Cuándo se llama:** Al cargar la moderación de reseñas (`/admin/reviews`) y con cada cambio de filtro.

**Request:**
- Params (query):
```
page:          number (0-based)
size:          number
referenceType?: 'STORE' | 'PRODUCT'
storeId?:      string
productId?:    string
buyerSearch?:  string (filtra por nombre o email del comprador)
rating?:       number (1–5)
isVisible?:    boolean
```

**Respuesta esperada:**
```typescript
Page<AdminReview>

type AdminReview = {
  id:            string;
  rating:        number;
  comment:       string | null;
  isVisible:     boolean;
  createdAt:     string;
  referenceType: 'STORE' | 'PRODUCT';
  store: {
    id:           string;
    businessName: string;
  };
  product: {
    id:   string;
    name: string;
  } | null;
  buyer: {
    id:          string;
    displayName: string | null;
    email:       string;
  };
};
```

**Qué hace el frontend con esto:**
Renderiza la tabla de reseñas con rating, visibilidad, comprador y tienda.

**Errores manejados:**
- 4xx → toast de error
- 401 → limpia sesión → `/login`

---

### GET /api/admin/reviews/buyers/:buyerId/history

**Quién lo usa:** Admin  
**Cuándo se llama:** Al abrir el historial de reseñas de un comprador desde el panel.

**Request:**
- Params: `buyerId` en la URL

**Respuesta esperada:**
```typescript
{
  buyerId:     string;
  displayName: string | null;
  email:       string;
  reviews: Array<{
    id:            string;
    rating:        number;
    comment:       string | null;
    referenceType: 'STORE' | 'PRODUCT';
    referenceName: string;
    isVisible:     boolean;
    createdAt:     string;
  }>;
}
```

**Qué hace el frontend con esto:**
Muestra el historial de reseñas del comprador en un panel lateral.

**Errores manejados:**
- 404 → toast "Historial no encontrado"
- 401 → limpia sesión → `/login`

---

### PATCH /api/admin/reviews/:reviewId/visibility

**Quién lo usa:** Admin  
**Cuándo se llama:** Al ocultar o mostrar una reseña.

**Request:**
- Params: `reviewId` en la URL
- Body:
```typescript
{
  isVisible: boolean;
}
```

**Respuesta esperada:**
```typescript
AdminReview  // con isVisible actualizado
```

**Qué hace el frontend con esto:**
Actualiza la fila en la tabla. Muestra toast de éxito.

**Errores manejados:**
- 404 → toast "Reseña no encontrada"
- 401 → limpia sesión → `/login`

---

### DELETE /api/admin/reviews/:reviewId

**Quién lo usa:** Admin  
**Cuándo se llama:** Al eliminar permanentemente una reseña.

**Request:**
- Params: `reviewId` en la URL

**Respuesta esperada:**
```typescript
void  // 204
```

**Qué hace el frontend con esto:**
Elimina la fila de la tabla. Muestra toast de éxito.

**Errores manejados:**
- 404 → toast "Reseña no encontrada"
- 401 → limpia sesión → `/login`

---

## 13. Reportes — Admin

> **Confirmado:** dos endpoints REST independientes — `/products` y `/stores` — sin parámetro `type` unificado.

### GET /api/admin/reports/products

**Estado:** Confirmado  
**Quién lo usa:** Admin  
**Cuándo se llama:** Al cargar la pestaña "Reportes de productos" en `/admin/reports`.

**Request:**
- Params (query):
```
page:       number (0-based)
size?:      number
search?:    string
storeId?:   string
productId?: string
status?:    'PENDING' | 'DISMISSED' | 'RESOLVED'
```

**Respuesta esperada:**
```typescript
Page<ProductReport>

type ProductReport = {
  id:             string;
  status:         'PENDING' | 'DISMISSED' | 'RESOLVED';
  resolutionType: 'DISABLED' | 'WARNED' | null;
  createdAt:      string;
  reason:         string;
  product: {
    id:            string;
    name:          string;
    currentStatus: 'ACTIVE' | 'PAUSED_BY_SELLER' | 'DISABLED_BY_ADMIN';
    store: {
      id:           string;
      businessName: string;
      isActive:     boolean;
    };
  };
  reporter: {
    id:          string;
    displayName: string | null;
    email:       string;
  };
};
```

**Errores manejados:**
- 4xx → toast de error
- 401 → limpia sesión → `/login`

---

### GET /api/admin/reports/stores

**Estado:** Confirmado  
**Quién lo usa:** Admin  
**Cuándo se llama:** Al cargar la pestaña "Reportes de tiendas" en `/admin/reports`.

**Request:**
- Params (query):
```
page:     number (0-based)
size?:    number
search?:  string
storeId?: string
status?:  'PENDING' | 'DISMISSED' | 'RESOLVED'
```

**Respuesta esperada:**
```typescript
Page<StoreReport>

type StoreReport = {
  id:             string;
  status:         'PENDING' | 'DISMISSED' | 'RESOLVED';
  resolutionType: 'DISABLED' | 'WARNED' | null;
  createdAt:      string;
  reason:         string;
  store: {
    id:           string;
    businessName: string;
    isActive:     boolean;
  };
  reporter: {
    id:          string;
    displayName: string | null;
    email:       string;
  };
};
```

**Errores manejados:**
- 4xx → toast de error
- 401 → limpia sesión → `/login`

---

### POST /api/admin/reports/:reportId/dismiss

**Quién lo usa:** Admin  
**Cuándo se llama:** Al desestimar un reporte (estado PENDING → DISMISSED).

**Request:**
- Params: `reportId` en la URL
- Body:
```typescript
{
  reason: string;  // mínimo 10 caracteres
}
```

**Respuesta esperada:**
```typescript
ProductReport | StoreReport  // el tipo se detecta automáticamente por shape
```

**Qué hace el frontend con esto:**
Actualiza el reporte en la lista. Cierra el panel lateral. Muestra toast de éxito.

**Errores manejados:**
- 400 → toast (motivo inválido o reporte no en estado PENDING)
- 404 → toast "Reporte no encontrado"
- 401 → limpia sesión → `/login`

---

### POST /api/admin/reports/:reportId/disable-product

**Quién lo usa:** Admin  
**Cuándo se llama:** Al resolver un reporte de producto inhabilitando el producto.

**Request:**
- Params: `reportId` en la URL
- Body:
```typescript
{
  productId: string;
  reason:    string;  // mínimo 10 caracteres
}
```

**Respuesta esperada:**
```typescript
ProductReport  // con status = 'RESOLVED', resolutionType = 'DISABLED'
```

**Errores manejados:**
- 400 / 409 → toast de error
- 401 → limpia sesión → `/login`

---

### POST /api/admin/reports/:reportId/disable-store

**Quién lo usa:** Admin  
**Cuándo se llama:** Al resolver un reporte de tienda desactivando la tienda.

**Request:**
- Params: `reportId` en la URL
- Body:
```typescript
{
  storeId: string;
  reason:  string;  // mínimo 10 caracteres
}
```

**Respuesta esperada:**
```typescript
StoreReport  // con status = 'RESOLVED', resolutionType = 'DISABLED'
```

**Errores manejados:**
- 400 / 409 → toast de error
- 401 → limpia sesión → `/login`

---

### POST /api/admin/reports/:reportId/warn

**Quién lo usa:** Admin  
**Cuándo se llama:** Al advertir al vendedor desde un reporte (sin inhabilitar).

**Request:**
- Params: `reportId` en la URL
- Body:
```typescript
{
  message: string;  // 20–500 caracteres
}
```

**Respuesta esperada:**
```typescript
ProductReport | StoreReport  // con status = 'RESOLVED', resolutionType = 'WARNED'
```

**Errores manejados:**
- 400 → toast (mensaje inválido o reporte ya resuelto)
- 401 → limpia sesión → `/login`

---

## 14. Pedidos globales — Admin

### GET /api/admin/orders

**Quién lo usa:** Admin  
**Cuándo se llama:** Al cargar la lista de pedidos globales (`/admin/orders`) y con cada cambio de filtro.

**Request:**
- Params (query):
```
page:       number (0-based)
size:       number
search?:    string (por ID de orden o email de comprador)
status?:    OrderStatus
storeId?:   string
startDate?: string (ISO 8601)
endDate?:   string (ISO 8601)
```

**Respuesta esperada:**
```typescript
Page<AdminOrder>

type AdminOrder = {
  id:        string;
  createdAt: string;  // ISO 8601
  buyer: {
    id:    string;
    email: string;
    name:  string | null;
  };
  stores: AdminOrderStore[];  // slices por tienda
  totalArs: number;
};

type AdminOrderStore = {
  id:          string;   // sliceId
  status:      OrderStatus;
  subtotalArs: number;
  store: {
    id:           string;
    businessName: string;
  };
  items: Array<{
    id:          string;
    productName: string;
    size:        string | null;
    color:       string | null;
    quantity:    number;
    unitPrice:   number;
    imageUrl:    string | null;
  }>;
  stockIssues?: Array<{
    itemId:            string;
    productName:       string;
    size:              string;
    color:             string;
    requestedQuantity: number;
    availableQuantity: number;
  }>;
  refund?: {
    mpRefundId:     string;
    refundedAmount: number;
  } | null;
};
```

**Qué hace el frontend con esto:**
Renderiza la tabla de pedidos globales con comprador, tiendas involucradas, total y estado.

**Errores manejados:**
- 4xx → toast de error
- 401 → limpia sesión → `/login`

---

### GET /api/admin/orders/:orderId

**Quién lo usa:** Admin  
**Cuándo se llama:** Al abrir el detalle de un pedido global (`/admin/orders/:orderId`).

**Request:**
- Params: `orderId` en la URL

**Respuesta esperada:**
```typescript
AdminOrder  // objeto completo con todos los slices
```

**Errores manejados:**
- 404 → toast "Pedido no encontrado"
- 401 → limpia sesión → `/login`

---

### POST /api/admin/orders/slices/:sliceId/force-status

**Quién lo usa:** Admin  
**Cuándo se llama:** Al forzar el estado de un slice desde el panel de detalle de la orden.

**Request:**
- Params: `sliceId` en la URL
- Body:
```typescript
{
  status: OrderStatus;
  reason: string;  // mínimo 10 caracteres
}
```

**Respuesta esperada:**
```typescript
AdminOrderStore  // el slice con status actualizado
```

**Qué hace el frontend con esto:**
Actualiza el slice en el detalle de la orden. Muestra toast de éxito.

**Errores manejados:**
- 400 → toast (motivo inválido)
- 404 → toast "Slice no encontrado"
- 401 → limpia sesión → `/login`

---

### POST /api/admin/orders/refunds

**Estado:** Confirmado — no lleva `orderId` en la ruta; el `sliceId` va en el body JSON  
**Quién lo usa:** Admin  
**Cuándo se llama:** Al procesar un reembolso en un slice cancelado.

**Request:**
- Body:
```typescript
{
  sliceId: string;
  reason:  string;  // mínimo 10 caracteres
  amount:  number;  // ARS, > 0 y <= subtotalArs del slice
}
```

**Respuesta esperada:**
```typescript
{
  success:        boolean;
  mpRefundId:     string | null;  // ID de reembolso en Mercado Pago
  refundedAmount: number;
  message:        string;
}
```

**Qué hace el frontend con esto:**
Muestra toast con el resultado. Actualiza el slice con los datos del reembolso.

**Errores manejados:**
- 400 → toast (monto inválido, motivo corto)
- 409 → toast "Este slice ya tiene un reembolso procesado"
- 401 → limpia sesión → `/login`

---

## 15. Soporte — Admin

> **Confirmado:** el `storeId` en la URL identifica de forma unívoca cada conversación de soporte Admin ↔ tienda.

### GET /api/admin/support/conversations

**Estado:** Confirmado  
**Quién lo usa:** Admin  
**Cuándo se llama:** Al cargar la bandeja de soporte (`/admin/support`). Se refresca por polling.

**Request:**
- Query:
```
page: number (0-based, default 0)
size: number (default 50)
```

**Respuesta esperada:**
```typescript
Page<{
  storeId:      string;
  businessName: string;
  sellerEmail:  string;
  sellerName:   string | null;
  unreadCount:  number;
  lastMessage: {
    content:    string | null;
    sentAt:     string;
    senderRole: 'SELLER' | 'ADMIN';
    attachmentType: 'image' | 'pdf' | null;
  } | null;
}>
```

**Qué hace el frontend con esto:**
Lee `response.content` y renderiza la lista de conversaciones de soporte con el último mensaje y contador de no leídos.

**Errores manejados:**
- 4xx → muestra lista vacía silenciosa
- 401 → limpia sesión → `/login`

---

### GET /api/admin/support/conversations/:storeId/messages

**Estado:** Confirmado — `storeId` en path identifica la conversación  
**Quién lo usa:** Admin  
**Cuándo se llama:** Al abrir una conversación de soporte en el panel admin. Se refresca por polling.

**Request:**
- Params: `storeId` en la URL

**Respuesta esperada:**
```typescript
Page<{
  id:             string;
  senderId:       string;
  senderRole:     'SELLER' | 'ADMIN';
  content:        string;
  sentAt:         string;
  attachmentUrl:  string | null;
  attachmentType: 'image' | 'pdf' | null;
}>
```

**Qué hace el frontend con esto:**
Lee `response.content` y renderiza el hilo de soporte de esa tienda.

**Errores manejados:**
- 404 → muestra hilo vacío
- 401 → limpia sesión → `/login`

---

### POST /api/admin/support/conversations/:storeId/messages

**Estado:** Confirmado — `storeId` en path  
**Quién lo usa:** Admin  
**Cuándo se llama:** Al enviar un mensaje de soporte desde el panel admin.

**Request:**
- Params: `storeId` en la URL
- Body:
```typescript
{
  content:        string;
  attachmentUrl?: string;
  attachmentType?: 'image' | 'pdf';
}
```

**Respuesta esperada:**
```typescript
{
  id:             string;
  senderId:       string;
  senderRole:     'ADMIN';
  content:        string;
  sentAt:         string;
  attachmentUrl:  string | null;
  attachmentType: 'image' | 'pdf' | null;
}
```

**Qué hace el frontend con esto:**
Agrega el mensaje al hilo local. Muestra toast de éxito.

**Errores manejados:**
- 4xx → toast de error
- 401 → limpia sesión → `/login`

---

### POST /api/admin/support/conversations/:storeId/read

**Estado:** Confirmado  
**Quién lo usa:** Admin  
**Cuándo se llama:** Al abrir una conversación (marca todos los mensajes como leídos).

**Request:**
- Params: `storeId` en la URL
- Body: ninguno

**Respuesta esperada:**
```typescript
void
```

**Qué hace el frontend con esto:**
Resetea `unreadCount` a 0 para esa conversación en la lista.

**Errores manejados:**
- Errores ignorados silenciosamente (operación best-effort)

---

## 16. Subida de archivos

### POST /api/uploads/product-image

**Estado:** Confirmado  
**Quién lo usa:** Seller (al crear o editar productos)  
**Cuándo se llama:** Al soltar o seleccionar una imagen en el `ImageDropzone` del formulario de producto. Se llama por cada imagen individualmente, antes de guardar el producto.

**Request:**
- Body: `multipart/form-data`
```
file:              File              (@RequestPart — archivo de imagen)
stagingSessionId?: string            (@RequestParam(required = false) — agrupa blobs en staging)
```
> **Nota:** el frontend no pone `Content-Type` manualmente; el navegador lo hace automáticamente con el boundary correcto al detectar `FormData`.

**Respuesta esperada:**
```typescript
{
  url: string;  // URL pública de la imagen subida
}
```

**Qué hace el frontend con esto:**
Valida estrictamente que la respuesta sea `{ url: string }` con `url` no vacía. Guarda esa URL en el estado del formulario. La URL se enviará en el array `imageUrls` al crear/actualizar el producto.

**Errores manejados:**
- 400 / 413 → toast "Error al subir imagen. Revisá el formato o tamaño."
- 500 / shape inválida → error "El servidor no devolvió `{ url: string }` tras subir la imagen."
- 401 → limpia sesión → `/login`

---

## Decisiones de arquitectura relevantes

### 1. El frontend no se conecta a Supabase directamente
Toda comunicación pasa por el backend. El frontend no usa Supabase SDK, no llama a `supabase.auth.*`, y no tiene las credenciales de Supabase. El backend es el único que interactúa con Supabase (auth, storage, database).

### 2. Flujo de OAuth con Google
El backend debe redirigir al frontend a la URL `/auth/callback?token=<jwt>` tras el login exitoso con Google. El frontend lee el `?token=` de la URL, llama a `GET /api/auth/me` con ese token en el header `Authorization: Bearer`, persiste el resultado en localStorage, y redirige al panel. **No se usa hash fragment (`#access_token=`), sino query param (`?token=`).**

### 3. Modelo de pedidos multitienda
Los pedidos son agregados multitienda. Cada `Order` tiene N `OrderStore` (slices), uno por tienda participante.
- El **seller** ve únicamente su slice (`SellerOrderStore`) — no ve los otros vendedores de la misma orden.
- El **admin** ve la orden completa (`AdminOrder`) con todos los slices en `stores[]`.
- El `sliceId` es el ID del `OrderStore`; el `orderId` es el ID de la `Order` padre.

### 4. Subida de imágenes — Opción B (multipart al backend)
El frontend usa `POST /api/uploads/product-image` con `multipart/form-data`, campo `file`. El backend es responsable de subir a Supabase Storage (u otro servicio) y devolver la URL pública. El frontend no tiene acceso directo a Supabase Storage.

### 5. Chat con polling — preparado para WebSockets/STOMP
El frontend usa polling HTTP cada 5 segundos para refrescar conversaciones y mensajes. Cuando el backend implemente WebSockets con STOMP, **solo cambia la capa de transporte en `chatApi.ts`** — los componentes de UI (`ChatRoom`, `ConversationList`, etc.) no necesitarán cambios.

### 6. Paginación estilo Spring `Page<T>`
Todos los endpoints de listado **y los hilos de mensajería** (chats seller, soporte seller/admin) deben devolver:
```json
{
  "content":       [...],
  "totalElements": 100,
  "number":        0,
  "size":          10
}
```
El frontend también acepta `total_elements` en snake_case (coerción defensiva). El campo `number` es 0-based. El frontend consume siempre `response.content` con fallback `?? []`.

### 7. Formato de fechas
El backend debe enviar **siempre ISO 8601** (`"2026-05-26T14:30:00.000Z"`). El frontend usa `date-fns` para formatear a español argentino. Nunca enviar timestamps Unix ni strings en formato local.

### 8. Formato de moneda
El backend envía números crudos (`284600`). El frontend formatea como ARS con `Intl.NumberFormat` o `date-fns`. Nunca enviar strings con formato de moneda (`"$284.600,00"`).

### 9. Manejo global de 401
Cuando el `apiClient` recibe un `401`, dispara un evento DOM `window.dispatchEvent(new Event('outletgo:unauthorized'))`. El `AuthContext` escucha este evento, limpia `localStorage`, y redirige a `/login`. Esto aplica a todos los endpoints privados sin necesidad de manejo explícito en cada llamada.

### 10. JWT en localStorage
El token se guarda en `localStorage["outletgo_token"]`. El `apiClient` lo lee automáticamente de ahí y lo adjunta como `Authorization: Bearer <token>`. No se usan cookies de sesión desde el frontend.

### 11. Identificación en canales de soporte seller
`GET` y `POST /api/support/messages` no incluyen IDs de tienda en la URL. El backend resuelve al vendedor autenticado exclusivamente desde el JWT.

### 12. Conversaciones Admin identificadas por `storeId`
Los endpoints Admin bajo `/api/admin/support/conversations/:storeId/...` usan el `storeId` como identificador unívoco de la conversación de soporte.

### 13. Dashboard — stock crítico desde backend
El array `lowStockProducts` en `GET /api/seller/dashboard` incluye `criticalVariations` precalculado en backend (variaciones con stock ≤ 3). El frontend no deriva este sub-array.

### 14. Reembolsos Admin
`POST /api/admin/orders/refunds` no recibe `orderId` en la ruta. El body JSON incluye `sliceId`, `reason` y `amount`.

### 15. Reportes Admin — endpoints separados
Los reportes de productos y tiendas son dos recursos REST independientes: `GET /api/admin/reports/products` y `GET /api/admin/reports/stores`.
