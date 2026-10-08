export interface PaymentLineItem {
  name: string;
  description: string;
  imageUrl: string;
  unitAmountCents: number;
  quantity: number;
}

export interface CreateCheckoutSessionInput {
  orderId: string;
  orderNumber: string;
  customerEmail: string;
  currency: "mxn";
  items: PaymentLineItem[];
  shippingCents: number;
  successUrl: string;
  cancelUrl: string;
  expiresAt: Date;
}

export interface CheckoutSessionResult {
  checkoutSessionId: string;
  checkoutUrl: string;
  expiresAt: Date;
}

export interface PaymentProvider {
  createCheckoutSession(
    input: CreateCheckoutSessionInput,
    idempotencyKey: string,
  ): Promise<CheckoutSessionResult>;
}
