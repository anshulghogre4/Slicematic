import { describe, expect, it } from "vitest";
import {
  canTransitionDelivery,
  deliveryStatusLabel,
  getDeliveryTransitions,
  isTerminalDeliveryStatus,
  shouldShowLiveLocation
} from "./delivery-state";

describe("delivery state contract", () => {
  it("allows the approved happy-path rider lifecycle", () => {
    expect(canTransitionDelivery("unassigned", "offered", "admin")).toBe(true);
    expect(canTransitionDelivery("offered", "accepted", "rider")).toBe(true);
    expect(canTransitionDelivery("accepted", "picked_up", "rider")).toBe(true);
    expect(canTransitionDelivery("picked_up", "arriving", "rider")).toBe(true);
    expect(canTransitionDelivery("arriving", "delivered", "rider")).toBe(true);
  });

  it("blocks customer-driven and invalid delivery transitions", () => {
    expect(canTransitionDelivery("unassigned", "accepted", "customer")).toBe(false);
    expect(canTransitionDelivery("delivered", "picked_up", "admin")).toBe(false);
    expect(canTransitionDelivery("accepted", "delivered", "rider")).toBe(false);
  });

  it("keeps live location visibility limited to active delivery statuses", () => {
    expect(shouldShowLiveLocation("unassigned")).toBe(false);
    expect(shouldShowLiveLocation("offered")).toBe(false);
    expect(shouldShowLiveLocation("accepted")).toBe(true);
    expect(shouldShowLiveLocation("picked_up")).toBe(true);
    expect(shouldShowLiveLocation("arriving")).toBe(true);
    expect(shouldShowLiveLocation("delivered")).toBe(false);
  });

  it("exposes next transitions for admin/rider UI controls", () => {
    expect(getDeliveryTransitions("offered").map((transition) => transition.to)).toEqual([
      "accepted",
      "rejected",
      "expired"
    ]);
  });

  it("marks only stable end states as terminal", () => {
    expect(isTerminalDeliveryStatus("delivered")).toBe(true);
    expect(isTerminalDeliveryStatus("cancelled")).toBe(true);
    expect(isTerminalDeliveryStatus("rejected")).toBe(false);
    expect(isTerminalDeliveryStatus("expired")).toBe(false);
  });

  it("provides customer/admin readable labels", () => {
    expect(deliveryStatusLabel("arriving")).toBe("Arriving soon");
    expect(deliveryStatusLabel("expired")).toBe("Offer expired");
  });
});
