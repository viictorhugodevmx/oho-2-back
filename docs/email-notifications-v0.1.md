# OHO 2.0 — Correos locales con Mailpit v0.1

## Objetivo

Enviar correos de confirmación después de crear pedidos con cuenta o pedidos
invitados, utilizando SMTP local y Mailpit durante el desarrollo.

El correo es una consecuencia del pedido. Una falla temporal de SMTP no revierte
ni elimina un pedido creado correctamente.

## Infraestructura local

Mailpit se ejecuta mediante Docker Compose:

```bash
docker compose up -d mailpit
docker compose ps mailpit
```

Servicios locales:

```text
Interfaz web: http://localhost:8025
Servidor SMTP: 127.0.0.1:1025
```

El archivo `compose.yaml` mantiene los mensajes en el volumen
`mailpit_data`.

## Variables de entorno

```text
SMTP_HOST=127.0.0.1
SMTP_PORT=1025
SMTP_SECURE=false
MAIL_FROM=OHO 2.0 <no-reply@oho20.local>
```

Estas variables son validadas al iniciar la aplicación.

## Proveedor de correo

La integración SMTP está desacoplada mediante la interfaz `EmailProvider`.

El proveedor basado en Nodemailer permite:

- Verificar la conexión SMTP.
- Enviar contenido de texto y HTML.
- Devolver el identificador asignado al mensaje.
- Sustituir el transporte durante las pruebas.

## Confirmación de pedidos

Se envía un correo después de crear:

- Un pedido de usuario autenticado.
- Un pedido invitado.

El correo contiene:

- Folio.
- Artículos y cantidades.
- Diseño, formato y opciones seleccionadas.
- Subtotal, envío y total.
- Dirección de entrega.
- Enlace para consultar el pedido.

## Pedidos invitados

El enlace de un pedido invitado transporta el token privado en el fragmento de
la URL:

```text
/orders/<folio>#token=<token-invitado>
```

El fragmento no se envía automáticamente al servidor web como parte de la
solicitud HTTP.

El token:

- Se entrega al comprador.
- No se escribe en los logs del servicio de notificaciones.
- No se almacena en texto plano en MongoDB.
- No se incluye en correos de pedidos asociados a una cuenta.

## Idempotencia

El correo solamente se solicita cuando el pedido se crea por primera vez.

Repetir una solicitud con la misma clave de idempotencia:

- Recupera el mismo pedido.
- Recupera el mismo token invitado cuando corresponde.
- No genera un segundo correo.

## Tolerancia a fallos

Si SMTP no está disponible:

- El pedido conserva su respuesta exitosa.
- El error se registra sin incluir tokens privados.
- El servicio devuelve internamente que la entrega no fue completada.

Una estrategia de reintentos persistentes queda fuera de esta versión local.

## Comprobaciones realizadas

- Conexión real con el servidor SMTP de Mailpit.
- Envío directo mediante el proveedor SMTP.
- Confirmación real de pedido con cuenta.
- Confirmación real de pedido invitado.
- Ausencia de correo duplicado durante una repetición idempotente.
- Plantillas de texto y HTML.
- Escape de contenido dinámico.
- Pruebas unitarias del proveedor, plantilla y coordinador.
- Pruebas de integración de ambos tipos de pedido.
