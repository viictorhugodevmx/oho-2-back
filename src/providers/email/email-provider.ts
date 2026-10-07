export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface EmailDeliveryResult {
  messageId: string;
}

export interface EmailProvider {
  verify(): Promise<void>;

  send(message: EmailMessage): Promise<EmailDeliveryResult>;
}
