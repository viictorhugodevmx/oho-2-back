# OHO 2.0 — Contrato de cotización v0.1

## Objetivo

La cotización permite que el backend valide el carrito y calcule precios,
envío y totales antes de crear un pedido.

El frontend nunca enviará precios ni totales como datos confiables.

## Endpoint

```text
POST /api/v1/checkout/quote
```

## Propiedad de la cotización

La cotización puede pertenecer a una cuenta autenticada o a una sesión
invitada.

Una cuenta envía su access token mediante:

```text
Authorization: Bearer <token>
```

Un invitado primero solicita una sesión:

```text
POST /api/v1/checkout/guest-session
```

La respuesta tiene estado `201`:

```json
{
  "guestSessionToken": "token-generado-por-el-backend",
  "headerName": "x-oho-guest-session-token"
}
```

Después envía el token mediante:

```text
x-oho-guest-session-token: <token>
```

El token invitado original no se almacena. La cotización conserva únicamente
su hash SHA-256.

## Solicitud

```json
{
  "items": [
    {
      "productSlug": "hoodie-after-hours",
      "designSlug": "front-row-pressure",
      "format": "standard",
      "quantity": 2,
      "selectedOptions": [
        {
          "optionId": "size",
          "valueId": "size-m"
        },
        {
          "optionId": "color",
          "valueId": "color-black"
        }
      ]
    }
  ]
}
```

## Datos aceptados del frontend

Cada artículo solamente puede enviar:

- `productSlug`
- `designSlug`
- `format`
- `quantity`
- `selectedOptions`
  - `optionId`
  - `valueId`

No se aceptan como fuente de verdad:

- Nombre del producto.
- Nombre del diseño.
- Imágenes.
- Etiquetas de formatos u opciones.
- Ajustes de precio.
- Precio unitario.
- Subtotal.
- Envío.
- Total.

## Validaciones

El backend debe comprobar:

- Entre 1 y 20 líneas de carrito.
- Cantidad entre 1 y 10 por línea.
- Producto existente y activo.
- Diseño existente y activo.
- Formato disponible para el producto.
- Una selección por cada opción definida por el producto.
- Opción existente.
- Valor perteneciente a la opción indicada.
- Ausencia de opciones duplicadas.
- Ausencia de opciones adicionales que no pertenezcan al producto.

Aunque `selectedOptions` puede omitirse en la validación estructural, el
servicio rechazará el artículo cuando el producto tenga opciones obligatorias
y no se hayan enviado todas.

## Cálculo autoritativo

```text
precio unitario =
  precio base del producto
  + ajuste del formato
  + suma de ajustes de opciones
```

```text
total de línea = precio unitario × cantidad
subtotal = suma de totales de línea
```

Reglas iniciales:

- Moneda: MXN.
- Importes almacenados y enviados en centavos.
- Envío normal: 14900 centavos.
- Envío gratuito desde un subtotal de 150000 centavos.
- Vigencia de la cotización: 15 minutos.

## Respuesta exitosa

```json
{
  "quoteId": "identificador-generado-por-el-backend",
  "currency": "MXN",
  "expiresAt": "2026-09-27T17:00:00.000Z",
  "items": [
    {
      "productId": "product-002",
      "productSlug": "hoodie-after-hours",
      "productName": "Hoodie After Hours",
      "productImageUrl": "https://example.com/product.jpg",
      "designId": "design-002",
      "designSlug": "front-row-pressure",
      "designTitle": "Front Row Pressure",
      "designImageUrl": "https://example.com/design.jpg",
      "format": "standard",
      "formatLabel": "Estándar",
      "formatPriceAdjustmentCents": 0,
      "selectedOptions": [
        {
          "optionId": "size",
          "optionName": "Talla",
          "valueId": "size-m",
          "valueLabel": "M",
          "value": "m",
          "priceModifierCents": 0
        }
      ],
      "quantity": 2,
      "basePriceCents": 84900,
      "unitPriceCents": 84900,
      "lineTotalCents": 169800
    }
  ],
  "subtotalCents": 169800,
  "shippingCents": 0,
  "totalCents": 169800
}
```

## Vigencia y uso posterior

- El backend genera `quoteId`.
- La cotización expira después de 15 minutos.
- Crear el pedido requerirá una cotización vigente.
- El backend volverá a comprobar disponibilidad y precios.
- Una cotización expirada no podrá crear un pedido.
- La cotización queda asociada al usuario autenticado o al hash de la sesión
  invitada.
- Una cotización no puede utilizarse desde otra cuenta o sesión invitada.
- La cotización permanece sin consumir hasta que se integre la creación del
  pedido.

## Errores previstos

- `VALIDATION_ERROR`
- `PRODUCT_UNAVAILABLE`
- `DESIGN_UNAVAILABLE`
- `FORMAT_UNAVAILABLE`
- `OPTION_REQUIRED`
- `OPTION_INVALID`
- `OPTION_VALUE_INVALID`
- `QUOTE_EXPIRED`
- `GUEST_SESSION_REQUIRED`
- `INVALID_GUEST_SESSION`
- `UNAUTHORIZED`
- `RATE_LIMIT_EXCEEDED`

## Límites temporales

- Máximo 30 solicitudes de sesión invitada cada 15 minutos.
- Máximo 120 solicitudes de cotización cada 15 minutos.
