import { beforeEach, describe, expect, it, vi } from "vitest";

import { env } from "../../../src/config/env.js";
import {
  SmtpEmailProvider,
  type SmtpTransport,
} from "../../../src/providers/email/smtp-email.provider.js";

describe("SmtpEmailProvider", () => {
  const verify = vi.fn();
  const sendMail = vi.fn();

  const transport: SmtpTransport = {
    verify,
    sendMail,
  };

  const provider = new SmtpEmailProvider(transport);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("verifica la conexión con el servidor SMTP", async () => {
    verify.mockResolvedValue(true);

    await expect(provider.verify()).resolves.toBeUndefined();

    expect(verify).toHaveBeenCalledOnce();
  });

  it("envía el mensaje utilizando el remitente configurado", async () => {
    sendMail.mockResolvedValue({
      messageId: "mailpit-message-001",
    });

    const result = await provider.send({
      to: "cliente@example.com",
      subject: "Tu pedido OHO",
      text: "Tu pedido fue recibido.",
      html: "<p>Tu pedido fue recibido.</p>",
    });

    expect(sendMail).toHaveBeenCalledWith({
      from: env.MAIL_FROM,
      to: "cliente@example.com",
      subject: "Tu pedido OHO",
      text: "Tu pedido fue recibido.",
      html: "<p>Tu pedido fue recibido.</p>",
    });

    expect(result).toEqual({
      messageId: "mailpit-message-001",
    });
  });

  it("propaga los errores SMTP al servicio que coordina el envío", async () => {
    const smtpError = new Error("SMTP connection failed.");

    sendMail.mockRejectedValue(smtpError);

    await expect(
      provider.send({
        to: "cliente@example.com",
        subject: "Tu pedido OHO",
        text: "Tu pedido fue recibido.",
        html: "<p>Tu pedido fue recibido.</p>",
      }),
    ).rejects.toBe(smtpError);
  });
});
