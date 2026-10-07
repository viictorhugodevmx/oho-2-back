# OHO 2.0 — Contrato de pedidos con cuenta v0.1

## Objetivo

Crear pedidos persistentes para usuarios autenticados utilizando una
cotización vigente y una clave de idempotencia.

El backend es la fuente de autoridad de artículos, precios, propietario,
importes y estados.

## Endpoints

```text
POST /api/v1/orders
GET  /api/v1/orders/me
GET  /api/v1/orders/me/:orderNumber
```

Los tres endpoints requieren un access token válido:

```text
Authorization: Bearer <access-token>
```

## Creación del pedido

```text
POST /api/v1/orders
```

La solicitud requiere una clave de idempotencia:

```text
Idempotency-Key: checkout-identificador-unico
```

La clave:

- Identifica un intento lógico de creación.
- Se vincula al usuario autenticado.
- No se almacena en texto plano.
- Puede contener entre 16 y 160 caracteres.
- Solamente acepta letras, números, puntos, guiones, guiones bajos y dos puntos.

## Solicitud

```json
{
  "quoteId": "identificador-de-la-cotizacion",
  "contact": {
    "fullName": "Víctor Hugo Segundo Aguilar",
    "email": "victor@example.com",
    "phone": "4433065417"
  },
  "shippingAddress": {
    "addressLine1": "José María Rojo 160",
    "addressLine2": "",
    "neighborhood": "Moctezuma",
    "city": "Morelia",
    "state": "Michoacán",
    "postalCode": "58030",
    "country": "México",
    "references": "Portón negro"
  }
}
```

## Datos que no acepta como autoridad

El frontend no determina:

- `userId`.
- Artículos.
- Productos o diseños.
- Formatos u opciones.
- Precios.
- Subtotal.
- Envío.
- Total.
- Moneda.
- Folio.
- Estados.
- Propiedad de la cotización.

Todos esos datos se obtienen o generan en el backend.

## Validaciones

El backend comprobará:

- Sesión autenticada válida.
- Header `Idempotency-Key` presente y válido.
- Solicitud estructuralmente válida.
- Cotización existente.
- Cotización perteneciente al usuario autenticado.
- Cotización vigente.
- Cotización todavía no consumida.
- Artículos y precios previamente calculados por el backend.
- Correo, teléfono y dirección válidos.

## Idempotencia

Para una misma cuenta:

- La misma clave y la misma solicitud devuelven el pedido ya creado.
- La misma clave con una solicitud diferente devuelve
  `IDEMPOTENCY_CONFLICT`.
- Una cotización solamente puede producir un pedido.
- Los reintentos no crean folios adicionales.
- La clave y la solicitud se almacenan únicamente como hashes.
- Los registros de idempotencia tienen expiración.

## Persistencia

La orden conservará:

- `quoteId`.
- Folio único.
- Usuario propietario.
- Contacto y dirección de entrega.
- Snapshot de productos y diseños.
- Snapshot del formato.
- Snapshot de opciones seleccionadas.
- Precios en centavos.
- Subtotal, envío y total.
- Moneda.
- Estados separados.
- Fechas de creación y actualización.

Después de crear el pedido, la cotización queda marcada como consumida.

## Estados iniciales

Pedido:

```text
pending
```

Pago:

```text
pending
```

Producción y entrega:

```text
pending
```

Los cambios posteriores de pago e impresión se implementarán en el paso
correspondiente.

## Respuesta de creación

Estado HTTP inicial:

```text
201 Created
```

```json
{
  "data": {
    "id": "mongo-document-id",
    "orderNumber": "OHO-XXXXXXXX-XXXX",
    "quoteId": "identificador-de-la-cotizacion",
    "customerType": "account",
    "contact": {
      "fullName": "Víctor Hugo Segundo Aguilar",
      "email": "victor@example.com",
      "phone": "4433065417"
    },
    "shippingAddress": {
      "addressLine1": "José María Rojo 160",
      "addressLine2": "",
      "neighborhood": "Moctezuma",
      "city": "Morelia",
      "state": "Michoacán",
      "postalCode": "58030",
      "country": "México",
      "references": "Portón negro"
    },
    "items": [],
    "currency": "MXN",
    "subtotalCents": 84900,
    "shippingCents": 14900,
    "totalCents": 99800,
    "status": "pending",
    "paymentStatus": "pending",
    "fulfillmentStatus": "pending",
    "createdAt": "2026-10-07T18:00:00.000Z",
    "updatedAt": "2026-10-07T18:00:00.000Z"
  }
}
```

Una repetición idempotente devuelve el mismo pedido sin crear otro.

## Historial de la cuenta

```text
GET /api/v1/orders/me
```

Devuelve únicamente los pedidos cuyo `userId` coincide con la cuenta
autenticada, ordenados del más reciente al más antiguo.

## Detalle de la cuenta

```text
GET /api/v1/orders/me/:orderNumber
```

Devuelve el pedido solamente si pertenece a la cuenta autenticada.

Conocer el folio de otra cuenta no concede acceso.

## Errores previstos

- `VALIDATION_ERROR`
- `UNAUTHORIZED`
- `IDEMPOTENCY_KEY_REQUIRED`
- `INVALID_IDEMPOTENCY_KEY`
- `IDEMPOTENCY_CONFLICT`
- `IDEMPOTENCY_IN_PROGRESS`
- `QUOTE_NOT_FOUND`
- `QUOTE_EXPIRED`
- `QUOTE_ALREADY_CONSUMED`
- `ORDER_NOT_FOUND`
- `CONFLICT`
- `RATE_LIMIT_EXCEEDED`
- `INTERNAL_SERVER_ERROR`

## Fuera del alcance de este paso

- Creación de pedidos invitados.
- Tokens de acceso a pedidos invitados.
- Cobro real o simulado.
- Envío a impresión.
- Correos de confirmación.
- Integración del frontend con estos endpoints.
