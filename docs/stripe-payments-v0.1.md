# OHO 2.0 — Stripe Checkout y producción simulada v0.1

## Objetivo

Procesar pagos mediante Stripe Checkout dentro de un Sandbox de Stripe y
simular el envío posterior del pedido al proveedor de impresión.

No se realizarán cargos reales durante esta etapa.

## Fuente de autoridad

El backend conserva la autoridad sobre:

- Pedido.
- Artículos.
- Cantidades.
- Moneda.
- Subtotal.
- Envío.
- Total.
- Propietario.
- Estados de pago e impresión.

El frontend nunca enviará importes confiables a Stripe.

## Flujo general

1. El backend crea el pedido con pago pendiente.
2. El comprador solicita una sesión de Stripe Checkout.
3. El backend comprueba que puede acceder al pedido.
4. El backend crea o recupera una sesión activa.
5. El frontend redirige al comprador a la URL de Stripe.
6. Stripe procesa un pago de prueba.
7. Stripe envía un webhook firmado.
8. El backend verifica la firma y procesa el evento una sola vez.
9. El pedido cambia a confirmado y pagado.
10. El adaptador de impresión simulada registra el envío.
11. El frontend consulta el pedido actualizado.

La redirección del navegador no confirma el pago. Solamente un evento
verificado de Stripe puede cambiar el pedido a pagado.

## Endpoints

### Pedido con cuenta

```text
POST /api/v1/orders/me/:orderNumber/checkout-session
Authorization: Bearer <access-token>
```

### Pedido invitado

```text
POST /api/v1/guest-orders/:orderNumber/checkout-session
X-OHO-Guest-Order-Token: <guest-access-token>
```

### Webhook de Stripe

```text
POST /api/v1/payments/stripe/webhook
Stripe-Signature: <firma-generada-por-stripe>
```

El webhook recibirá el cuerpo crudo antes de que Express ejecute
`express.json()`.

## Respuesta de Checkout

```json
{
  "data": {
    "checkoutSessionId": "cs_test_identificador",
    "checkoutUrl": "https://checkout.stripe.com/...",
    "expiresAt": "fecha ISO"
  }
}
```

## Creación de la sesión

La sesión utilizará:

- `mode: payment`.
- Moneda `mxn`.
- Importes en centavos.
- Datos obtenidos exclusivamente del pedido persistido.
- Correo de contacto del pedido.
- Folio e identificador interno en metadata.
- URL de éxito del frontend.
- URL de cancelación del frontend.
- Clave de idempotencia en la solicitud hacia Stripe.

Los tokens de invitado, access tokens, direcciones y secretos nunca se
incluirán en metadata.

El envío se representará como una línea separada cuando su importe sea mayor
que cero, de modo que el total de Stripe coincida con el total autoritativo
del pedido.

## Reutilización

Si existe una sesión abierta y vigente para el pedido, el backend devolverá
esa misma sesión.

Si la sesión expiró sin pago, podrá generarse un nuevo intento.

Un pedido pagado no podrá crear otra sesión de Checkout.

## Eventos previstos

### `checkout.session.completed`

Cuando `payment_status` sea `paid`:

- Marca el intento como completado.
- Marca el pago del pedido como `paid`.
- Marca el pedido como `confirmed`.
- Registra la fecha de pago.
- Solicita la producción simulada.

### `checkout.session.async_payment_succeeded`

Aplica las mismas transiciones que un pago completado.

### `checkout.session.async_payment_failed`

- Marca el intento como fallido.
- Marca el estado del pago como `failed`.
- No envía el pedido a impresión.

### `checkout.session.expired`

- Marca el intento como expirado.
- Mantiene el pedido disponible para un nuevo intento.
- No envía el pedido a impresión.

Los eventos desconocidos responderán correctamente sin modificar pedidos.

## Idempotencia del webhook

Cada evento de Stripe tendrá un identificador único persistido.

Si Stripe repite un evento:

- El backend responderá correctamente.
- No repetirá las transiciones.
- No duplicará el envío a impresión.
- No creará efectos secundarios adicionales.

## Estados

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
cancelled
```

Un pedido nuevo comienza con:

```text
status: pending
paymentStatus: pending
fulfillmentStatus: not_requested
```

Después de un pago exitoso y una simulación correcta:

```text
status: confirmed
paymentStatus: paid
fulfillmentStatus: submitted
```

## Intentos de pago

Cada intento persistirá como mínimo:

- Pedido.
- Proveedor.
- Identificador de sesión.
- Estado.
- Moneda.
- Importe esperado.
- Fecha de expiración.
- Identificador de PaymentIntent cuando exista.
- Fechas de creación y actualización.

No se almacenarán números de tarjeta, CVC ni datos bancarios.

## Impresión simulada

La integración utilizará una interfaz `PrintProvider`.

El adaptador local:

- No se conecta con Printful.
- Genera una referencia de producción.
- Devuelve el estado `submitted`.
- Puede ejecutarse de forma idempotente.
- Nunca se ejecuta antes de confirmar el pago.

## URLs del frontend

```text
Éxito:
<FRONTEND_URL>/checkout/success?session_id={CHECKOUT_SESSION_ID}

Cancelación:
<FRONTEND_URL>/checkout?payment=cancelled&order=<folio>
```

El `session_id` permite al frontend consultar el resultado, pero no sustituye
la confirmación mediante webhook.

## Variables privadas

```text
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_CHECKOUT_SESSION_TTL_MINUTES
```

Los secretos se guardarán únicamente en `.env`.

`.env.example` utilizará marcadores sin credenciales reales.

## Pruebas locales

La prueba manual utilizará:

- Stripe Sandbox.
- Stripe Checkout alojado.
- Stripe CLI para reenviar webhooks.
- Tarjetas oficiales de prueba.
- Backend en `http://localhost:4000`.
- Frontend en `http://localhost:3000`.

No se usarán datos de tarjetas reales.

## Validación de extremo a extremo

El flujo local debe comprobar:

- Creación de una sesión real de Stripe Checkout dentro del Sandbox.
- Pago exitoso utilizando una tarjeta oficial de prueba.
- Recepción de `checkout.session.completed` mediante Stripe CLI.
- Validación criptográfica del cuerpo crudo y la firma del webhook.
- Respuesta HTTP `200` después de procesar el evento.
- Actualización del pedido a `confirmed` y `paid`.
- Registro del intento de pago como `completed`.
- Envío al proveedor de impresión simulado.
- Persistencia idempotente del evento de Stripe.
- Ausencia de claves privadas y secretos de webhook en MongoDB.

La redirección hacia el frontend no confirma el pago. El webhook firmado
continúa siendo la única fuente autorizada para cambiar el pedido a pagado.
