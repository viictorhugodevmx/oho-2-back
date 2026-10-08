export interface PrintOrderItem {
  productId: string;
  designId: string;
  format: string;
  quantity: number;
  printProviderProductId: string | null;
  printProviderFileId: string | null;
}

export interface SubmitPrintOrderInput {
  orderId: string;
  orderNumber: string;
  items: PrintOrderItem[];
  submittedAt: Date;
}

export interface PrintSubmissionResult {
  provider: "simulated";
  reference: string;
  status: "submitted";
  submittedAt: Date;
}

export interface PrintProvider {
  submitOrder(input: SubmitPrintOrderInput): Promise<PrintSubmissionResult>;
}
