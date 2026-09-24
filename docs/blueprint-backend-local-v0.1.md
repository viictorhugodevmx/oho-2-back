# OHO 2.0 — Blueprint del backend local v0.1

## 1. Objetivo

Construir un backend local real para OHO 2.0 que sustituya los datos mock y
el almacenamiento del navegador por una API REST, autenticación segura y
persistencia en MongoDB.

Esta etapa debe permitir completar el flujo comercial local sin contratar
todavía infraestructura, pasarela de pago, correo externo ni proveedor de
impresión.

## 2. Repositorios

```text
oho-2.0/
├── front/   # Next.js, repositorio independiente
└── back/    # Express, repositorio independiente
```

El frontend y el backend conservan historial, dependencias, configuración y
despliegue independientes.

## 3. Stack

- Node.js 22.19.0
- npm 10.9.3
- TypeScript
- Express
- MongoDB 6.0.20
- Mongoose
- Zod
- bcrypt
- JWT mediante cookies httpOnly
- CORS con credenciales
- Helmet
- Express Rate Limit
- Pino
- Vitest
- Supertest
- Mailpit
- ESLint
- Prettier

## 4. Servicios locales

| Servicio      | Dirección o puerto           |
| ------------- | ---------------------------- |
| Frontend      | http://localhost:3000        |
| Backend       | http://localhost:4000        |
| API           | http://localhost:4000/api/v1 |
| MongoDB       | mongodb://127.0.0.1:27017    |
| Base de datos | oho_2_local                  |
| Mailpit SMTP  | localhost:1025               |
| Mailpit UI    | http://localhost:8025        |

MongoDB se ejecuta mediante la instalación local existente.

Mailpit se ejecutará mediante Docker.

## 5. Arquitectura

```text
HTTP request
      ↓
route
      ↓
controller
      ↓
schema validation
      ↓
service / use case
      ↓
repository
      ↓
Mongoose model
      ↓
MongoDB
```

Las integraciones externas utilizarán interfaces y adaptadores:

```text
PaymentProvider
├── FakePaymentProvider
└── Proveedor real futuro

PrintProvider
├── FakePrintProvider
└── Printful u otro proveedor futuro

EmailProvider
├── MailpitEmailProvider
└── Proveedor transaccional futuro
```

## 6. Estructura planeada

```text
back/
├── docs/
│   └── blueprint-backend-local-v0.1.md
├── src/
│   ├── app.ts
│   ├── server.ts
│   ├── config/
│   ├── database/
│   ├── middlewares/
│   ├── shared/
│   │   ├── errors/
│   │   ├── http/
│   │   ├── logger/
│   │   └── security/
│   ├── modules/
│   │   ├── health/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── catalog/
│   │   ├── checkout/
│   │   ├── orders/
│   │   └── notifications/
│   └── providers/
│       ├── email/
│       ├── payment/
│       └── print/
├── tests/
│   ├── integration/
│   └── helpers/
├── scripts/
│   └── seed.ts
├── docker-compose.yml
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

No se crearán carpetas vacías anticipadamente. Cada módulo aparecerá cuando
el paso funcional correspondiente lo necesite.

## 7. Entidades

### User

Responsabilidades:

- Identidad de la cuenta.
- Correo normalizado y único.
- Contraseña cifrada.
- Nombre.
- Rol.
- Estado activo.
- Fechas de creación y actualización.

Nunca devolverá el hash de contraseña.

### Product

Responsabilidades:

- Producto genérico.
- Slug único.
- Nombre y descripción.
- Categoría.
- Imagen.
- Formatos disponibles.
- Precios por formato.
- Estado activo.
- Identificador futuro del proveedor de impresión.

### Design

Responsabilidades:

- Fotografía o diseño.
- Slug único.
- Nombre.
- Categoría.
- Imagen.
- Autor y atribución.
- Estado activo.
- Identificador futuro del archivo preparado para impresión.

### Order

Responsabilidades:

- Folio único.
- Tipo de comprador.
- Usuario opcional.
- Correo de contacto.
- Artículos comprados.
- Datos de entrega.
- Subtotal, envío y total.
- Moneda.
- Estado del pedido.
- Estado del pago.
- Estado de impresión.
- Clave de idempotencia.
- Fechas.

Cada artículo conservará una fotografía histórica de nombres, formato,
cantidad y precios para evitar que cambios futuros alteren pedidos pasados.

### RefreshSession

Responsabilidades:

- Sesión renovable.
- Usuario propietario.
- Hash del token.
- Fecha de expiración.
- Revocación.
- Datos mínimos de dispositivo.

### GuestOrderAccess

Responsabilidades:

- Pedido invitado.
- Hash del token de acceso.
- Fecha de expiración.
- Fecha de último uso.
- Revocación.

El token sin cifrar solamente se entregará al crear el acceso y se enviará
mediante el correo local.

### IdempotencyRecord

Responsabilidades:

- Clave recibida.
- Operación.
- Comprador o sesión.
- Resultado generado.
- Fecha de expiración.

Evita crear dos pedidos por doble clic o reintentos de red.

## 8. Tipos de comprador

### Cuenta

- Registro e inicio de sesión.
- Contraseña cifrada con bcrypt.
- Cookies httpOnly.
- Renovación y revocación.
- Historial persistente.
- Acceso exclusivo a pedidos propios.

### Invitado

- Compra sin registro.
- Correo obligatorio.
- Sin perfil.
- Sin historial acumulado.
- Consulta individual mediante folio y token seguro.
- Registro posterior sin asociación automática del pedido.

## 9. Fuente de autoridad

El backend será responsable de:

- Consultar productos y diseños.
- Validar elementos activos.
- Validar formatos y cantidades.
- Calcular precios.
- Calcular envío.
- Calcular totales.
- Generar folios.
- Crear pedidos.
- Controlar estados.
- Autorizar consultas.
- Evitar duplicados.

El frontend no enviará totales confiables. Solamente enviará identificadores,
formato y cantidad.

## 10. Reglas comerciales iniciales

- Moneda: MXN.
- Importes almacenados en centavos.
- Envío: 14900 centavos.
- Envío gratuito desde 150000 centavos.
- Cantidad por artículo: de 1 a 10.
- Productos y diseños deben estar activos.
- Formatos: standard, large y premium.
- Los precios serán validados nuevamente al crear el pedido.
- La cotización tendrá una vigencia limitada.
- La creación del pedido requerirá una clave de idempotencia.

Estas reglas son provisionales y configurables antes de producción.

## 11. Estados

### Pedido

```text
pending
confirmed
processing
completed
cancelled
```

### Pago

```text
pending
authorized
paid
failed
refunded
```

### Impresión

```text
not_requested
pending
submitted
in_production
shipped
delivered
failed
```

Los tres grupos permanecen separados.

## 12. Flujo de compra

1. El frontend obtiene catálogo desde la API.
2. El comprador configura productos.
3. El frontend solicita una cotización.
4. El backend valida productos, diseños, formatos y cantidades.
5. El backend devuelve subtotal, envío, total y vigencia.
6. El comprador completa contacto y entrega.
7. El frontend solicita crear el pedido con idempotencia.
8. El backend vuelve a validar la cotización.
9. El backend crea el pedido y el folio.
10. El adaptador de pago simula el resultado.
11. El adaptador de impresión registra el envío simulado.
12. Mailpit recibe la confirmación.
13. El frontend limpia el carrito después del éxito.

## 13. Endpoints iniciales

Base:

```text
/api/v1
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
POST /checkout/quote
```

### Pedidos

```text
POST /orders
GET  /orders/me
GET  /orders/me/:orderNumber
```

### Pedido invitado

```text
GET /guest-orders/:orderNumber?token=...
```

## 14. Contrato de errores

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Los datos enviados no son válidos.",
    "details": []
  }
}
```

Códigos previstos:

- `VALIDATION_ERROR`
- `UNAUTHORIZED`
- `FORBIDDEN`
- `NOT_FOUND`
- `CONFLICT`
- `QUOTE_EXPIRED`
- `PRODUCT_UNAVAILABLE`
- `IDEMPOTENCY_CONFLICT`
- `INTERNAL_ERROR`

No se expondrán trazas, hashes, secretos ni detalles internos.

## 15. Seguridad local orientada a producción

- Contraseñas cifradas con bcrypt.
- Cookies httpOnly.
- Cookies `secure` en producción.
- Política `sameSite` configurable.
- CORS restringido al frontend.
- Validación mediante Zod.
- Helmet.
- Rate limiting en autenticación y checkout.
- Tokens sensibles almacenados como hash.
- Variables privadas fuera de Git.
- Acceso a pedidos limitado al propietario o token invitado.
- Logs sin contraseñas, cookies ni tokens.

## 16. Datos semilla

El seed inicial migrará los datos actuales del frontend:

- Productos.
- Diseños.
- Usuario demo.
- Pedidos demo estrictamente necesarios.

El seed deberá ser repetible sin duplicar documentos.

La contraseña demo se almacenará cifrada.

## 17. Pruebas

### Unitarias

- Cálculo de precios.
- Envío gratuito.
- Generación de folios.
- Validaciones.
- Transiciones de estados.

### Integración

- Health check.
- Registro.
- Login.
- Renovación y logout.
- Catálogo.
- Cotización.
- Pedido con cuenta.
- Pedido invitado.
- Idempotencia.
- Autorización de pedidos.
- Token invitado inválido o expirado.

### Manuales

- Flujo completo desde Next.js.
- Persistencia después de reiniciar.
- Correo visible en Mailpit.
- Historial de cuenta.
- Confirmación invitada.
- Errores controlados.

## 18. Alcance local

Incluye:

- API REST.
- MongoDB persistente.
- Catálogo desde base de datos.
- Autenticación real.
- Compra con cuenta.
- Compra invitada.
- Cotización autoritativa.
- Pedidos persistentes.
- Correos en Mailpit.
- Pago simulado.
- Impresión simulada.
- Integración completa con el frontend.
- Pruebas críticas.

## 19. Fuera del alcance inmediato

- Cobros reales.
- Printful real.
- AWS.
- Dominio propio.
- Correo externo.
- Panel administrativo completo.
- Facturación.
- Cupones.
- Impuestos avanzados.
- Seguimiento real de paquetería.

## 20. Plan de construcción

| Paso | Resultado                           |
| ---- | ----------------------------------- |
| 0    | Blueprint, decisiones y preparación |
| 1    | Express, TypeScript y health check  |
| 2    | MongoDB, configuración y modelos    |
| 3    | Seeds y catálogo                    |
| 4    | Autenticación y sesiones            |
| 5    | Cotización autoritativa             |
| 6    | Pedidos con cuenta                  |
| 7    | Compra invitada y acceso seguro     |
| 8    | Correos locales con Mailpit         |
| 9    | Pago e impresión simulados          |
| 10   | Integración del frontend            |
| 11   | Pruebas críticas y cierre local     |

## 21. Criterio de éxito

La etapa local se considera terminada cuando una persona puede:

1. Consultar el catálogo desde MongoDB.
2. Registrarse o comprar como invitada.
3. Cotizar el carrito mediante la API.
4. Crear un pedido persistente.
5. Simular el pago.
6. Simular el envío a impresión.
7. Recibir un correo en Mailpit.
8. Consultar el pedido después de reiniciar los servicios.
9. Ver el historial si tiene cuenta.
10. Completar pruebas automáticas y manuales sin errores.
