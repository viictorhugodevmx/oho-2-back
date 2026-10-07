# OHO 2.0 — Compra invitada y acceso seguro v0.1

## Objetivo

Permitir que una persona compre sin crear una cuenta y consulte posteriormente
su pedido mediante un token seguro.

El backend continúa siendo la fuente de autoridad de productos, diseños,
precios, importes, estados y propietario de la cotización.

## Endpoints

```text
POST /api/v1/guest-orders
GET  /api/v1/guest-orders/:orderNumber
```

Ninguno requiere una cuenta ni un access token de autenticación.

## Creación de sesión invitada

Antes de cotizar se obtiene una sesión mediante:

```text
POST /api/v1/checkout/guest-session
```

La respuesta entrega:

```json
{
  "guestSessionToken": "token-temporal",
  "headerName": "x-oho-guest-session-token"
}
```

El token se envía al cotizar y al crear el pedido:

```text
X-OHO-Guest-Session-Token: <guest-session-token>
```

## Creación del pedido

```text
POST /api/v1/guest-orders
```

Headers requeridos:

```text
Content-Type: application/json
Idempotency-Key: checkout-identificador-unico
X-OHO-Guest-Session-Token: token-de-sesion-invitada
```

La clave de idempotencia:

- Puede contener entre 16 y 160 caracteres.
- Se vincula al hash de la sesión invitada.
- No se almacena en texto plano.
- Evita pedidos duplicados por doble clic o reintentos de red.

## Solicitud

```json
{
  "quoteId": "identificador-de-la-cotizacion",
  "contact": {
    "fullName": "Cliente Invitado",
    "email": "invitado@example.com",
    "phone": "+52 961 123 4567"
  },
  "shippingAddress": {
    "addressLine1": "Avenida Central 123",
    "addressLine2": "Departamento 4",
    "neighborhood": "Centro",
    "city": "Tuxtla Gutiérrez",
    "state": "Chiapas",
    "postalCode": "29000",
    "country": "México",
    "references": "Portón negro"
  }
}
```

El backend no acepta artículos, precios ni totales desde esta solicitud. Todos
se recuperan desde la cotización invitada vigente.

## Validaciones

El backend comprobará:

- Sesión invitada presente y con formato válido.
- Clave de idempotencia presente y válida.
- Cuerpo válido.
- Cotización existente.
- Cotización perteneciente a la misma sesión invitada.
- Cotización vigente.
- Cotización no consumida.
- Datos de contacto y entrega válidos.

## Respuesta exitosa

```json
{
  "data": {
    "order": {
      "id": "identificador-interno",
      "orderNumber": "OHO-20261007-A1B2C3D4",
      "quoteId": "identificador-de-la-cotizacion",
      "customerType": "guest",
      "contact": {},
      "shippingAddress": {},
      "items": [],
      "currency": "MXN",
      "subtotalCents": 84900,
      "shippingCents": 14900,
      "totalCents": 99800,
      "status": "pending",
      "paymentStatus": "pending",
      "fulfillmentStatus": "pending",
      "createdAt": "fecha ISO",
      "updatedAt": "fecha ISO"
    },
    "guestAccessToken": "token-seguro",
    "accessExpiresAt": "fecha ISO"
  }
}
```

El token original solamente se entrega en la respuesta y posteriormente podrá
enviarse por correo mediante Mailpit.

## Idempotencia y recuperación del token

El token de acceso se deriva mediante HMAC utilizando:

- Un secreto privado del backend.
- El identificador persistente del pedido.
- Separación de dominio para pedidos invitados.

Esto permite devolver el mismo token durante una repetición idempotente sin
almacenarlo en texto plano.

MongoDB guarda solamente su hash SHA-256.

## Consulta segura

```text
GET /api/v1/guest-orders/:orderNumber
X-OHO-Guest-Order-Token: <guest-access-token>
```

La respuesta exitosa utiliza:

```json
{
  "data": {
    "order": {}
  }
}
```

El acceso será válido únicamente cuando:

- El folio exista.
- El hash del token coincida.
- El acceso no esté revocado.
- El acceso no haya expirado.

Cada consulta válida incrementará `accessCount` y actualizará
`lastAccessedAt`.

## Decisión sobre el token en URL

La API no recibe el token mediante query string para evitar que aparezca en:

- Logs HTTP.
- Historial del navegador.
- Herramientas de monitoreo.
- Encabezados de referencia.

Durante la integración del frontend, un enlace de correo podrá transportar el
token mediante un fragmento de URL y el navegador lo enviará a la API mediante
el header seguro.

## Errores previstos

- `VALIDATION_ERROR`
- `GUEST_SESSION_REQUIRED`
- `INVALID_GUEST_SESSION`
- `IDEMPOTENCY_KEY_REQUIRED`
- `INVALID_IDEMPOTENCY_KEY`
- `IDEMPOTENCY_CONFLICT`
- `IDEMPOTENCY_IN_PROGRESS`
- `QUOTE_NOT_FOUND`
- `QUOTE_EXPIRED`
- `QUOTE_ALREADY_CONSUMED`
- `GUEST_ORDER_TOKEN_REQUIRED`
- `INVALID_GUEST_ORDER_TOKEN`
- `GUEST_ORDER_NOT_FOUND`

Los errores de folio inexistente, token incorrecto, token expirado o acceso
revocado no revelarán cuál condición falló.

## Fuera de este paso

- Envío real del correo.
- Pago real.
- Proveedor real de impresión.
- Integración con el frontend.
