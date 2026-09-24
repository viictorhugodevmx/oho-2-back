# OHO 2.0 — Backend

API REST para el ecommerce OHO 2.0.

Este repositorio sustituirá progresivamente los mocks y el almacenamiento
local del frontend por autenticación segura, catálogo persistente,
cotizaciones autoritativas y pedidos almacenados en MongoDB.

## Estado

Etapa actual:

```text
Paso 0 — Blueprint y preparación
```

Todavía no contiene código ejecutable ni dependencias instaladas.

## Stack previsto

- Node.js 22.19.0
- TypeScript
- Express
- MongoDB 6.0.20
- Mongoose
- Zod
- bcrypt
- JWT mediante cookies httpOnly
- Pino
- Vitest
- Supertest
- Mailpit

## Servicios locales

| Servicio | Dirección |
| --- | --- |
| Frontend | http://localhost:3000 |
| Backend | http://localhost:4000 |
| API | http://localhost:4000/api/v1 |
| MongoDB | mongodb://127.0.0.1:27017/oho_2_local |
| Mailpit | http://localhost:8025 |
| SMTP | localhost:1025 |

## Requisitos

```bash
node --version
npm --version
mongod --version
mongosh --version
docker --version
docker compose version
```

Versiones verificadas durante la preparación:

```text
Node.js: 22.19.0
npm: 10.9.3
MongoDB: 6.0.20
Mongosh: 2.4.2
Docker: 28.0.4
Docker Compose: 2.34.0
```

## Configuración futura

Cuando exista el setup ejecutable, las variables locales se crearán desde:

```bash
cp .env.example .env
```

Los secretos de `.env.example` son marcadores y deberán sustituirse por
valores aleatorios antes de ejecutar autenticación.

El archivo `.env` nunca debe confirmarse en Git.

## Documentación

El alcance, arquitectura, entidades, endpoints, seguridad y plan de
construcción se encuentran en:

```text
docs/blueprint-backend-local-v0.1.md
```

## Repositorio relacionado

Frontend:

```text
git@github.com:viictorhugodevmx/oho-2-front.git
```

Sitio mock desplegado:

```text
https://oho-2.netlify.app/
```

## Autor

**Víctor Hugo Segundo Aguilar**
