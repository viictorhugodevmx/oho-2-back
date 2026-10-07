import { env } from "../../../config/env.js";
import type { OrderDto } from "../../orders/dtos/order.dto.js";
import type { EmailMessage } from "../../../providers/email/email-provider.js";

export interface OrderConfirmationInput {
  order: OrderDto;
  guestAccessToken?: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatMoney(cents: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(cents / 100);
}

function buildOrderUrl(
  orderNumber: string,
  guestAccessToken: string | undefined,
): string {
  const frontendUrl = env.FRONTEND_URL.replace(/\/$/, "");
  const orderUrl = `${frontendUrl}/orders/${encodeURIComponent(orderNumber)}`;

  if (!guestAccessToken) {
    return orderUrl;
  }

  return `${orderUrl}#token=${encodeURIComponent(guestAccessToken)}`;
}

function buildOptionsText(item: OrderDto["items"][number]): string {
  if (item.selectedOptions.length === 0) {
    return "";
  }

  return item.selectedOptions
    .map((option) => `${option.optionName}: ${option.valueLabel}`)
    .join(", ");
}

function buildItemsText(order: OrderDto): string {
  return order.items
    .map((item) => {
      const options = buildOptionsText(item);
      const details = [item.formatLabel, options, `Cantidad: ${item.quantity}`]
        .filter(Boolean)
        .join(" · ");

      return [
        `${item.productName} + ${item.designTitle}`,
        details,
        formatMoney(item.lineTotalCents),
      ].join("\n");
    })
    .join("\n\n");
}

function buildItemsHtml(order: OrderDto): string {
  return order.items
    .map((item) => {
      const options = buildOptionsText(item);

      return `
        <tr>
          <td style="padding: 16px 0; border-bottom: 1px solid #e7e2d9;">
            <strong style="display: block; color: #181818;">
              ${escapeHtml(item.productName)}
            </strong>
            <span style="display: block; margin-top: 4px; color: #555;">
              Diseño: ${escapeHtml(item.designTitle)}
            </span>
            <span style="display: block; margin-top: 4px; color: #777;">
              ${escapeHtml(item.formatLabel)}
              ${options ? ` · ${escapeHtml(options)}` : ""}
              · Cantidad: ${item.quantity}
            </span>
          </td>
          <td
            style="
              padding: 16px 0;
              border-bottom: 1px solid #e7e2d9;
              text-align: right;
              vertical-align: top;
              white-space: nowrap;
              color: #181818;
            "
          >
            ${escapeHtml(formatMoney(item.lineTotalCents))}
          </td>
        </tr>
      `;
    })
    .join("");
}

function buildAddressText(order: OrderDto): string {
  return [
    order.shippingAddress.addressLine1,
    order.shippingAddress.addressLine2,
    order.shippingAddress.neighborhood,
    `${order.shippingAddress.postalCode} ${order.shippingAddress.city}`,
    order.shippingAddress.state,
    order.shippingAddress.country,
    order.shippingAddress.references,
  ]
    .filter(Boolean)
    .join(", ");
}

export function buildOrderConfirmationEmail(
  input: OrderConfirmationInput,
): EmailMessage {
  const { order, guestAccessToken } = input;
  const orderUrl = buildOrderUrl(order.orderNumber, guestAccessToken);

  const subject = `Pedido ${order.orderNumber} recibido | OHO 2.0`;

  const text = [
    `Hola ${order.contact.fullName},`,
    "",
    "Recibimos tu pedido en OHO 2.0.",
    `Folio: ${order.orderNumber}`,
    "",
    buildItemsText(order),
    "",
    `Subtotal: ${formatMoney(order.subtotalCents)}`,
    `Envío: ${formatMoney(order.shippingCents)}`,
    `Total: ${formatMoney(order.totalCents)}`,
    "",
    `Entrega: ${buildAddressText(order)}`,
    "",
    `Consulta tu pedido: ${orderUrl}`,
    "",
    "Gracias por elegir OHO 2.0.",
  ].join("\n");

  const html = `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>${escapeHtml(subject)}</title>
      </head>
      <body style="margin: 0; background: #f4f1eb; color: #181818;">
        <div
          style="
            width: 100%;
            padding: 32px 16px;
            box-sizing: border-box;
            font-family: Arial, Helvetica, sans-serif;
          "
        >
          <div
            style="
              max-width: 640px;
              margin: 0 auto;
              overflow: hidden;
              background: #ffffff;
              border: 1px solid #ddd6ca;
              border-radius: 18px;
            "
          >
            <div
              style="
                padding: 28px 32px;
                background: #111111;
                color: #ffffff;
              "
            >
              <div
                style="
                  font-size: 13px;
                  letter-spacing: 0.24em;
                  text-transform: uppercase;
                  color: #d9ff48;
                "
              >
                OHO 2.0
              </div>
              <h1
                style="
                  margin: 12px 0 0;
                  font-size: 30px;
                  line-height: 1.1;
                "
              >
                Pedido recibido
              </h1>
            </div>

            <div style="padding: 32px;">
              <p style="margin: 0 0 10px; font-size: 17px;">
                Hola ${escapeHtml(order.contact.fullName)},
              </p>

              <p style="margin: 0 0 24px; color: #555; line-height: 1.6;">
                Recibimos tu pedido y ya quedó registrado con el folio
                <strong>${escapeHtml(order.orderNumber)}</strong>.
              </p>

              <table
                role="presentation"
                style="
                  width: 100%;
                  border-collapse: collapse;
                  font-size: 14px;
                "
              >
                <tbody>
                  ${buildItemsHtml(order)}
                </tbody>
              </table>

              <table
                role="presentation"
                style="
                  width: 100%;
                  margin-top: 22px;
                  border-collapse: collapse;
                  font-size: 14px;
                "
              >
                <tbody>
                  <tr>
                    <td style="padding: 5px 0; color: #666;">
                      Subtotal
                    </td>
                    <td style="padding: 5px 0; text-align: right;">
                      ${escapeHtml(formatMoney(order.subtotalCents))}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0; color: #666;">
                      Envío
                    </td>
                    <td style="padding: 5px 0; text-align: right;">
                      ${escapeHtml(formatMoney(order.shippingCents))}
                    </td>
                  </tr>
                  <tr>
                    <td
                      style="
                        padding: 12px 0 5px;
                        font-size: 18px;
                        font-weight: bold;
                      "
                    >
                      Total
                    </td>
                    <td
                      style="
                        padding: 12px 0 5px;
                        text-align: right;
                        font-size: 18px;
                        font-weight: bold;
                      "
                    >
                      ${escapeHtml(formatMoney(order.totalCents))}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div
                style="
                  margin-top: 28px;
                  padding: 18px;
                  border-radius: 12px;
                  background: #f4f1eb;
                "
              >
                <strong style="display: block; margin-bottom: 8px;">
                  Dirección de entrega
                </strong>
                <span style="color: #555; line-height: 1.6;">
                  ${escapeHtml(buildAddressText(order))}
                </span>
              </div>

              <div style="margin-top: 30px; text-align: center;">
                <a
                  href="${escapeHtml(orderUrl)}"
                  style="
                    display: inline-block;
                    padding: 14px 24px;
                    border-radius: 999px;
                    background: #111111;
                    color: #ffffff;
                    font-weight: bold;
                    text-decoration: none;
                  "
                >
                  Consultar pedido
                </a>
              </div>

              <p
                style="
                  margin: 30px 0 0;
                  color: #777;
                  font-size: 13px;
                  line-height: 1.6;
                  text-align: center;
                "
              >
                Gracias por elegir OHO 2.0.
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  return {
    to: order.contact.email,
    subject,
    text,
    html,
  };
}
