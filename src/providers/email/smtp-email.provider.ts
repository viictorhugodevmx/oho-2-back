import nodemailer, { type SendMailOptions } from "nodemailer";

import { env } from "../../config/env.js";
import type {
  EmailDeliveryResult,
  EmailMessage,
  EmailProvider,
} from "./email-provider.js";

export interface SmtpTransport {
  verify(): Promise<unknown>;

  sendMail(message: SendMailOptions): Promise<{
    messageId: string;
  }>;
}

function createSmtpTransport(): SmtpTransport {
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
  });
}

export class SmtpEmailProvider implements EmailProvider {
  constructor(
    private readonly transport: SmtpTransport = createSmtpTransport(),
  ) {}

  async verify(): Promise<void> {
    await this.transport.verify();
  }

  async send(message: EmailMessage): Promise<EmailDeliveryResult> {
    const result = await this.transport.sendMail({
      from: env.MAIL_FROM,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });

    return {
      messageId: result.messageId,
    };
  }
}

export const emailProvider = new SmtpEmailProvider();
