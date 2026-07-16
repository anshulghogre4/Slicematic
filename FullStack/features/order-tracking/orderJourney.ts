export type OrderJourneyStepState = "complete" | "current" | "upcoming";

export type OrderJourneyStep = {
  id: "confirmed" | "preparing" | "ready" | "delivery" | "delivered";
  label: string;
  description: string;
  state: OrderJourneyStepState;
};

const STATUS_PROGRESS: Record<string, number> = {
  confirmed: 0,
  accepted: 0,
  placed: 0,
  preparing: 1,
  "in preparation": 1,
  "in the oven": 1,
  ready: 2,
  "ready for pickup": 2,
  picked_up: 3,
  "picked up": 3,
  "out for delivery": 3,
  arriving: 3,
  delivered: 4,
};

const STEP_CONTENT = [
  ["confirmed", "Order confirmed", "Your order has been received by SliceMatic."],
  ["preparing", "Kitchen preparation", "The kitchen will prepare your selected crust and toppings."],
  ["ready", "Ready for handoff", "The order will be checked and packed before handoff."],
  ["delivery", "Delivery in progress", "Delivery details appear only after a real handoff is recorded."],
  ["delivered", "Delivered", "The journey completes after delivery is confirmed."],
] as const;

export function getOrderJourney(status?: string | null): OrderJourneyStep[] {
  const normalized = status?.trim().toLowerCase() ?? "";
  const currentIndex = STATUS_PROGRESS[normalized] ?? 0;

  return STEP_CONTENT.map(([id, label, description], index) => ({
    id,
    label,
    description,
    state: index < currentIndex ? "complete" : index === currentIndex ? "current" : "upcoming",
  }));
}
