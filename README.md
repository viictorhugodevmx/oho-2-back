# OHO 2.0 — Backend

API REST del ecommerce OHO 2.0.

Este repositorio sustituye progresivamente los mocks y el almacenamiento local
del frontend mediante autenticación segura, catálogo persistente,
cotizaciones autoritativas y pedidos almacenados en MongoDB.

## Estado

Etapa actual:

```text
Pasos 0–6 completados.
```

Actualmente están implementados:

- Configuración de Express y TypeScript.
- Health check.
- Conexión con MongoDB.
- Modelos e índices.
- Datos semilla del catálogo.
- API de productos y diseños.
- Registro, inicio de sesión, renovación y cierre de sesión.
- Sesiones mediante access token y refresh cookie httpOnly.
- Sesión para compradores invitados.
- Cotización autoritativa y persistente.
- Validación de productos, diseños, formatos, opciones y cantidades.
- Cálculo de subtotal, envío y total desde el backend.

## Stack

- Node.js 22.19.0
- TypeScript
- Express
- MongoDB 6.0.20
- Mongoose
- Zod
- bcrypt
- JWT
- Pino
- Vitest
- Supertest

## Servicios locales

| Servicio | Dirección                             |
| -------- | ------------------------------------- |
| Frontend | http://localhost:3000                 |
| Backend  | http://localhost:4000                 |
| API      | http://localhost:4000/api/v1          |
| MongoDB  | mongodb://127.0.0.1:27017/oho_2_local |
| Mailpit  | http://localhost:8025                 |
| SMTP     | localhost:1025                        |

## Preparación local

Crear la configuración local:

```bash
cp .env.example .env
```

Los valores secretos de `.env.example` son marcadores. Deben sustituirse por
valores aleatorios antes de ejecutar autenticación.

El archivo `.env` nunca debe confirmarse en Git.

Instalar dependencias:

```bash
npm install
```

Preparar índices y catálogo:

```bash
npm run db:indexes
npm run db:seed
```

Iniciar la API:

```bash
npm run dev
```

## Comandos de calidad

```bash
npm run format
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npm run check
```

## Endpoints implementados

Base:

```text
http://localhost:4000/api/v1
```

### Sistema

```text
GET /health
```

### Catálogo

```text
GET /products
GET /products/:slug
GET /designs
GET /designs/:slug
```

### Autenticación

```text
POST /auth/register
POST /auth/login
POST /auth/refresh
POST /auth/logout
GET  /auth/me
```

### Checkout

```text
POST /checkout/guest-session
POST /checkout/quote
```

Las cuentas pueden cotizar enviando su access token mediante
`Authorization: Bearer <token>`.

Los invitados primero solicitan una sesión y después envían el token recibido
mediante el header:

```text
x-oho-guest-session-token
```

Los precios y totales enviados por el frontend nunca se consideran
confiables. El backend consulta el catálogo y vuelve a calcular cada importe.

## Documentación

- `docs/blueprint-backend-local-v0.1.md`
- `docs/authentication-v0.1.md`
- `docs/checkout-quote-v0.1.md`

## Repositorio relacionado

Frontend:

```text
git@github.com:viictorhugodevmx/oho-2-front.git
```

Demo actual del frontend:

```text
https://oho-2.netlify.app/
```

## Autor

**Víctor Hugo Segundo Aguilar**
