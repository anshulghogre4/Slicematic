import { describe, expect, it } from "vitest";
import { getOrderJourney } from "../features/order-tracking/orderJourney";

describe("getOrderJourney", () => {
  it("defaults unknown states to confirmed only", () => {
    expect(getOrderJourney("Processing").map((step) => step.state)).toEqual(["current", "upcoming", "upcoming", "upcoming", "upcoming"]);
  });

  it("maps kitchen progress without implying delivery progress", () => {
    expect(getOrderJourney("In the oven").map((step) => step.state)).toEqual(["complete", "current", "upcoming", "upcoming", "upcoming"]);
  });

  it("maps delivered to the final current milestone", () => {
    expect(getOrderJourney("Delivered").map((step) => step.state)).toEqual(["complete", "complete", "complete", "complete", "current"]);
  });
});
