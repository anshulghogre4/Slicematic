import { describe, expect, it } from "vitest";
import { getOrderJourney } from "../features/order-tracking/orderJourney";

describe("getOrderJourney", () => {
  it("treats delivery status as the delivery step, not confirmed", () => {
    const steps = getOrderJourney("delivery");
    expect(steps.find((step) => step.state === "current")?.id).toBe("delivery");
    expect(steps.filter((step) => step.state === "complete")).toHaveLength(3);
  });

  it("keeps placed orders on the confirmed step", () => {
    const steps = getOrderJourney("Placed");
    expect(steps.find((step) => step.state === "current")?.id).toBe("confirmed");
  });
});
