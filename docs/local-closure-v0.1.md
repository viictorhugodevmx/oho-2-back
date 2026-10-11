# OHO 2.0 — Cierre local de la Fase 1 v0.1

Estado: implementada y validada localmente.

Fecha de cierre técnico: 11 de octubre de 2026.

## Alcance alcanzado

La Fase 1 conecta el frontend Next.js con la API de OHO para:

- Autenticación y sesiones reales.
- Catálogo persistente de productos y diseños.
- Personalización y carrito persistente.
- Cotizaciones autoritativas.
- Pedidos con cuenta y como invitado.
- Acceso privado a pedidos invitados.
- Correos locales mediante Mailpit.
- Stripe Checkout dentro del Sandbox.
- Webhooks firmados e idempotentes.
- Producción simulada después del pago.
- Retornos de pago exitoso y cancelado.
- Historial y detalle de pedidos.

## Validación automatizada

### Backend

- 62 archivos de prueba.
- 250 pruebas unitarias y de integración.
- ESLint.
- TypeScript para aplicación y pruebas.
- Formato validado mediante Prettier.
- Build de producción.

### Frontend

- 5 archivos de prueba.
- 22 pruebas automatizadas.
- Cliente HTTP y normalización de errores.
- Acceso privado de pedidos invitados.
- Contexto privado de retorno desde Stripe.
- Autorización de sesiones de pago.
- Cotizaciones sin precios confiados al navegador.
- Deduplicación de cotizaciones simultáneas.
- ESLint, TypeScript y build de producción.
- Cero vulnerabilidades en dependencias de producción.

## Validación manual

Se comprobaron satisfactoriamente:

- Registro, login, renovación y logout.
- Catálogo, filtros, personalización, favoritos y carrito.
- Compra autenticada.
- Compra como invitado.
- Correos de confirmación.
- Acceso privado desde el enlace del correo.
- Stripe Checkout con tarjeta oficial de prueba.
- Webhook `checkout.session.completed`.
- Pago confirmado y producción simulada.
- Retorno después de pago exitoso.
- Regreso después de cancelar el pago.
- Persistencia de pedidos e intentos de pago.
- Ausencia de secretos de Stripe en MongoDB.
- Redacción de credenciales en logs.

## Seguridad

- Los secretos permanecen fuera de Git.
- Los precios y totales se calculan en el backend.
- Los tokens privados se envían mediante headers.
- Los tokens de enlaces se retiran de la barra del navegador.
- Los logs censuran credenciales y firmas.
- Los webhooks validan el cuerpo crudo y la firma de Stripe.
- La idempotencia evita duplicar pedidos, pagos y producción.

La auditoría completa del frontend conserva avisos dentro del tooling de ESLint.
No afectan las dependencias de producción y no se aplicará una degradación
forzada para ocultarlos.

## Estrategia de ramas

El cierre se conserva en `feature/fullstack-integration` tanto en frontend como
en backend.

Las ramas `main` permanecen sin fusionar para no reemplazar la demo pública de
Netlify antes de disponer de una API pública y del hosting definitivo.

## Fuera de la Fase 1

Quedan para la Fase 2:

- Selección del proveedor real de impresión bajo demanda.
- Integración del proveedor mediante la interfaz `PrintProvider`.
- Pruebas con muestras físicas.
- Definición de márgenes, envíos, devoluciones e impuestos.
- Infraestructura pública y observabilidad.
- Presupuesto real de lanzamiento y operación.
- Migración controlada desde Stripe Sandbox.
