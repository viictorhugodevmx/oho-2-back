import type {
  PrintProvider,
  PrintSubmissionResult,
  SubmitPrintOrderInput,
} from "./print-provider.js";

function createReference(orderNumber: string): string {
  return `SIM-${orderNumber}`;
}

export class SimulatedPrintProvider implements PrintProvider {
  async submitOrder(
    input: SubmitPrintOrderInput,
  ): Promise<PrintSubmissionResult> {
    return Promise.resolve({
      provider: "simulated",
      reference: createReference(input.orderNumber),
      status: "submitted",
      submittedAt: input.submittedAt,
    });
  }
}

export const printProvider = new SimulatedPrintProvider();
