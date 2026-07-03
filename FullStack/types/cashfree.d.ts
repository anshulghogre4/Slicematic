declare module "@cashfreepayments/cashfree-js" {
  interface CashfreeCheckoutResult {
    error?: { message: string };
    redirect?: boolean;
    paymentDetails?: { paymentMessage: string };
  }

  interface CashfreeInstance {
    checkout(options: {
      paymentSessionId: string;
      returnUrl?: string;
      redirectTarget?: "_self" | "_blank" | "_top";
    }): Promise<CashfreeCheckoutResult>;
    version(): string;
  }

  export function load(options: {
    mode: "sandbox" | "production";
  }): Promise<CashfreeInstance>;
}
