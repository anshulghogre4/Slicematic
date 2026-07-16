export type KitchenOrderStatus =
  | "order_accepted"
  | "in_kitchen"
  | "quality_check"
  | "ready_for_pickup"
  | "completed"
  | "cancelled";

export type DeliveryStatus =
  | "not_required"
  | "unassigned"
  | "offered"
  | "accepted"
  | "picked_up"
  | "arriving"
  | "delivered"
  | "rejected"
  | "expired"
  | "cancelled";

export type DeliveryActor = "system" | "admin" | "rider" | "customer";

export type DeliveryTransition = {
  from: DeliveryStatus;
  to: DeliveryStatus;
  actors: DeliveryActor[];
  label: string;
};

const DELIVERY_TRANSITIONS: DeliveryTransition[] = [
  {
    from: "unassigned",
    to: "offered",
    actors: ["admin", "system"],
    label: "Offer assignment to rider"
  },
  {
    from: "offered",
    to: "accepted",
    actors: ["rider"],
    label: "Rider accepted assignment"
  },
  {
    from: "offered",
    to: "rejected",
    actors: ["rider"],
    label: "Rider rejected assignment"
  },
  {
    from: "offered",
    to: "expired",
    actors: ["system"],
    label: "Assignment offer expired"
  },
  {
    from: "rejected",
    to: "offered",
    actors: ["admin", "system"],
    label: "Offer assignment to another rider"
  },
  {
    from: "expired",
    to: "offered",
    actors: ["admin", "system"],
    label: "Retry assignment offer"
  },
  {
    from: "accepted",
    to: "picked_up",
    actors: ["rider", "admin"],
    label: "Order picked up"
  },
  {
    from: "picked_up",
    to: "arriving",
    actors: ["rider", "system"],
    label: "Rider near customer"
  },
  {
    from: "arriving",
    to: "delivered",
    actors: ["rider", "admin"],
    label: "Delivered with proof"
  },
  {
    from: "accepted",
    to: "cancelled",
    actors: ["admin"],
    label: "Cancel active assignment"
  },
  {
    from: "picked_up",
    to: "cancelled",
    actors: ["admin"],
    label: "Cancel after pickup exception"
  },
  {
    from: "arriving",
    to: "cancelled",
    actors: ["admin"],
    label: "Cancel arrival exception"
  }
];

const TERMINAL_DELIVERY_STATUSES = new Set<DeliveryStatus>([
  "not_required",
  "delivered",
  "cancelled"
]);

const LOCATION_VISIBLE_STATUSES = new Set<DeliveryStatus>([
  "accepted",
  "picked_up",
  "arriving"
]);

export function getDeliveryTransitions(status: DeliveryStatus): DeliveryTransition[] {
  return DELIVERY_TRANSITIONS.filter((transition) => transition.from === status);
}

export function canTransitionDelivery(
  from: DeliveryStatus,
  to: DeliveryStatus,
  actor: DeliveryActor
): boolean {
  return DELIVERY_TRANSITIONS.some(
    (transition) =>
      transition.from === from &&
      transition.to === to &&
      transition.actors.includes(actor)
  );
}

export function isTerminalDeliveryStatus(status: DeliveryStatus): boolean {
  return TERMINAL_DELIVERY_STATUSES.has(status);
}

export function shouldShowLiveLocation(status: DeliveryStatus): boolean {
  return LOCATION_VISIBLE_STATUSES.has(status);
}

export function deliveryStatusLabel(status: DeliveryStatus): string {
  switch (status) {
    case "not_required":
      return "No delivery needed";
    case "unassigned":
      return "Waiting for rider";
    case "offered":
      return "Offered to rider";
    case "accepted":
      return "Rider assigned";
    case "picked_up":
      return "Picked up";
    case "arriving":
      return "Arriving soon";
    case "delivered":
      return "Delivered";
    case "rejected":
      return "Rider declined";
    case "expired":
      return "Offer expired";
    case "cancelled":
      return "Delivery cancelled";
  }
}
