import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CartLine, CustomerDetails, PaymentMode, PricingConfig, Recommendation, SavedOrder } from "./types";
import { defaultPricingConfig } from "./pricing";

interface AppState {
  cart: CartLine[];
  customer: CustomerDetails;
  pricingConfig: PricingConfig;
  paymentMode: PaymentMode;
  lastOrder: SavedOrder | null;
  recommendation: Recommendation | null;

  setCart: (updater: CartLine[] | ((prev: CartLine[]) => CartLine[])) => void;
  setCustomer: (updater: CustomerDetails | ((prev: CustomerDetails) => CustomerDetails)) => void;
  setPricingConfig: (updater: PricingConfig | ((prev: PricingConfig) => PricingConfig)) => void;
  setPaymentMode: (updater: PaymentMode | ((prev: PaymentMode) => PaymentMode)) => void;
  setLastOrder: (updater: SavedOrder | null | ((prev: SavedOrder | null) => SavedOrder | null)) => void;
  setRecommendation: (updater: Recommendation | null | ((prev: Recommendation | null) => Recommendation | null)) => void;
  clearCheckout: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      cart: [],
      customer: { name: "", phone: "", address: "", deliveryZone: "2-4", note: "" },
      pricingConfig: defaultPricingConfig,
      paymentMode: "UPI",
      lastOrder: null,
      recommendation: null,

      setCart: (updater) => set((state) => ({ cart: typeof updater === "function" ? updater(state.cart) : updater })),
      setCustomer: (updater) => set((state) => ({ customer: typeof updater === "function" ? updater(state.customer) : updater })),
      setPricingConfig: (updater) => set((state) => ({ pricingConfig: typeof updater === "function" ? updater(state.pricingConfig) : updater })),
      setPaymentMode: (updater) => set((state) => ({ paymentMode: typeof updater === "function" ? updater(state.paymentMode) : updater })),
      setLastOrder: (updater) => set((state) => ({ lastOrder: typeof updater === "function" ? updater(state.lastOrder) : updater })),
      setRecommendation: (updater) => set((state) => ({ recommendation: typeof updater === "function" ? updater(state.recommendation) : updater })),
      clearCheckout: () => set({ cart: [] }),
    }),
    {
      name: "slicematic-storage",
    }
  )
);
