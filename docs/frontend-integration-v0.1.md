# OHO 2.0 — Integración del frontend v0.1

Estado: implementada y validada localmente.

## Objetivo

Conectar el frontend Next.js con la API del backend sin confiar en identidad,
precios, totales o estados calculados por el navegador.

## Servicios locales

```text
Frontend: http://localhost:3000
Backend:  http://localhost:4000
Mailpit:  http://localhost:8025
```

La URL base pública del frontend se configura mediante:

```text
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1
```

Los secretos de Stripe pertenecen exclusivamente al backend.

## Autenticación

El frontend consume:

```text
POST /auth/register
POST /auth/login
POST /auth/refresh
POST /auth/logout
GET  /auth/me
```

El refresh token se entrega como cookie `HttpOnly`. Las contraseñas y los
refresh tokens no se guardan en almacenamiento accesible desde JavaScript.

## Catálogo

El frontend obtiene productos y diseños desde:

```text
GET /products
GET /products/:slug
GET /designs
GET /designs/:slug
```

La selección visual puede mostrar importes derivados del catálogo, pero el
checkout vuelve a cotizar en el backend.

## Sesión invitada y cotización

El invitado solicita:

```text
POST /checkout/guest-session
```

La cotización utiliza:

```text
POST /checkout/quote
```

Una cuenta envía `Authorization: Bearer <token>`.

Un invitado envía:

```text
X-OHO-Guest-Session-Token: <token>
```

El frontend solo envía identificadores públicos, formato, opciones y cantidad.
El backend devuelve todos los importes en centavos.

## Pedidos con cuenta

```text
POST /orders
GET  /orders/me
GET  /orders/me/:orderNumber
POST /orders/me/:orderNumber/checkout-session
```

La creación requiere `Idempotency-Key`. El backend determina al propietario
desde el access token y nunca acepta un `userId` enviado por el navegador.

## Pedidos invitados

```text
POST /guest-orders
GET  /guest-orders/:orderNumber
POST /guest-orders/:orderNumber/checkout-session
```

La creación requiere:

```text
X-OHO-Guest-Session-Token
Idempotency-Key
```

La consulta y el pago requieren:

```text
X-OHO-Guest-Order-Token
```

El folio no funciona como credencial.

## Enlaces de correo

Cuenta:

```text
/account/orders/<folio>
```

Invitado:

```text
/order-confirmation/<folio>#token=<token>
```

El fragmento no se envía automáticamente al servidor. El frontend lo extrae,
consulta la API mediante un header y lo elimina de la barra de dirección.

## Stripe Checkout

El frontend solicita una sesión al backend y valida que la URL recibida:

- Utilice HTTPS.
- Pertenezca a `checkout.stripe.com`.

Éxito:

```text
/checkout/success?session_id={CHECKOUT_SESSION_ID}
```

Cancelación con cuenta:

```text
/account/orders/<folio>?payment=cancelled
```

Cancelación invitada:

```text
/order-confirmation/<folio>?payment=cancelled
```

La redirección de éxito no confirma el pago. El estado cambia únicamente
después de procesar el webhook firmado:

```text
POST /payments/stripe/webhook
```

## Persistencia

El backend conserva en MongoDB:

- Usuarios y sesiones renovables.
- Catálogo.
- Cotizaciones.
- Pedidos.
- Accesos invitados.
- Claves de idempotencia.
- Intentos de pago.
- Eventos de Stripe.
- Estados de producción simulada.

El navegador conserva solamente:

- Favoritos.
- Carrito.
- Borrador de checkout.
- Acceso invitado temporal.
- Contexto temporal de retorno desde Stripe.

## Seguridad

- CORS se limita al frontend configurado.
- Los precios del navegador no son confiables.
- Los pedidos utilizan idempotencia persistente.
- Las cuentas solo consultan pedidos propios.
- El acceso invitado es aleatorio, limitado y con caducidad.
- Los webhooks validan la firma sobre el cuerpo crudo.
- Los secretos no se guardan en MongoDB.
- Los headers privados se muestran como `[REDACTED]` en los logs.
- La producción simulada nunca comienza antes de confirmar el pago.

## Validación manual

Se comprobaron los flujos de cuenta e invitado para:

- Registro e inicio de sesión.
- Catálogo y personalización.
- Carrito persistente.
- Cotización autoritativa.
- Creación del pedido.
- Historial y detalle privado.
- Enlace recibido en Mailpit.
- Stripe Checkout exitoso.
- Webhook con respuesta HTTP 200.
- Pedido confirmado y pagado.
- Producción simulada enviada.
- Cancelación y reintento de pago.

## Validación técnica

La regresión del backend aprobó:

```text
62 archivos de prueba
250 pruebas
```

El frontend aprobó lint, TypeScript y build de producción con 13 rutas
generadas.

## Alcance pendiente

Permanece fuera de esta etapa:

- Cobro con Stripe en modo producción.
- Correo externo.
- Proveedor real de impresión.
- Seguimiento real de envíos.
- Infraestructura en nube.
- Dominio y observabilidad de producción.
