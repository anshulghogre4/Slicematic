import { describe, it, expect } from "vitest";
import { validateCustomer, validateOrderLines, calculateBill, money } from "./pricing";
import { CartLine, MenuPayload } from "./types";
import { seedMenu } from "./seed-data";

describe("TDD Parity: Name Validation", () => {
  it("fails on empty strings", () => {
    expect(validateCustomer("", "9876543210", "123 Main St", "2-4").name).toBe("Name must contain alphabetic characters and be 2-40 characters long.");
    expect(validateCustomer("   ", "9876543210", "123 Main St", "2-4").name).toBe("Name must contain alphabetic characters and be 2-40 characters long.");
  });

  it("fails on single char", () => {
    expect(validateCustomer("A", "9876543210", "123 Main St", "2-4").name).toBe("Name must contain alphabetic characters and be 2-40 characters long.");
  });

  it("fails on hyphens and digits", () => {
    expect(validateCustomer("Jean-Paul", "9876543210", "123 Main St", "2-4").name).toBe("Name must contain alphabetic characters and be 2-40 characters long.");
    expect(validateCustomer("John123", "9876543210", "123 Main St", "2-4").name).toBe("Name must contain alphabetic characters and be 2-40 characters long.");
  });

  it("fails on 41 characters", () => {
    expect(validateCustomer("A".repeat(41), "9876543210", "123 Main St", "2-4").name).toBe("Name must contain alphabetic characters and be 2-40 characters long.");
  });

  it("passes on valid names", () => {
    expect(validateCustomer("AB", "9876543210", "123 Main St", "2-4").name).toBeUndefined();
    expect(validateCustomer("A".repeat(40), "9876543210", "123 Main St", "2-4").name).toBeUndefined();
    expect(validateCustomer("Aman Sharma", "9876543210", "123 Main St", "2-4").name).toBeUndefined();
    expect(validateCustomer("  Aman  ", "9876543210", "123 Main St", "2-4").name).toBeUndefined();
  });
});

describe("TDD Parity: Phone Validation", () => {
  it("fails on empty strings", () => {
    expect(validateCustomer("Aman Sharma", "", "123 Main St", "2-4").phone).toBe("Phone number is required.");
  });

  it("fails on invalid lengths", () => {
    expect(validateCustomer("Aman Sharma", "98765432", "123 Main St", "2-4").phone).toBe("Phone number must be exactly 10 digits.");
    expect(validateCustomer("Aman Sharma", "12345678901", "123 Main St", "2-4").phone).toBe("Phone number must be exactly 10 digits.");
  });

  it("fails on containing letters", () => {
    expect(validateCustomer("Aman Sharma", "987654321a", "123 Main St", "2-4").phone).toBe("Phone number must be exactly 10 digits.");
  });

  it("fails on spaces and +91 prefix", () => {
    expect(validateCustomer("Aman Sharma", "98765 43210", "123 Main St", "2-4").phone).toBe("Phone number must be exactly 10 digits.");
    expect(validateCustomer("Aman Sharma", "+919876543210", "123 Main St", "2-4").phone).toBe("Phone number must be exactly 10 digits.");
  });

  it("fails on invalid starting digits", () => {
    expect(validateCustomer("Aman Sharma", "1234567890", "123 Main St", "2-4").phone).toBe("Enter a valid Indian mobile number starting with 6, 7, 8, or 9.");
    expect(validateCustomer("Aman Sharma", "0000000000", "123 Main St", "2-4").phone).toBe("Enter a valid Indian mobile number starting with 6, 7, 8, or 9.");
    expect(validateCustomer("Aman Sharma", "5555555555", "123 Main St", "2-4").phone).toBe("Enter a valid Indian mobile number starting with 6, 7, 8, or 9.");
  });

  it("passes on valid starting digits", () => {
    expect(validateCustomer("Aman", "6000000000", "123 Main St", "2-4").phone).toBeUndefined();
    expect(validateCustomer("Aman", "7000000000", "123 Main St", "2-4").phone).toBeUndefined();
    expect(validateCustomer("Aman", "8000000000", "123 Main St", "2-4").phone).toBeUndefined();
    expect(validateCustomer("Aman", "9876543210", "123 Main St", "2-4").phone).toBeUndefined();
  });
});

describe("TDD Parity: Quantity Validation", () => {
  const getLine = (qty: any): CartLine => ({
    id: "test", pizzaId: 1, baseId: 1, sizeId: "M", toppingIds: [], quantity: qty
  });

  it("fails on floats", () => {
    expect(validateOrderLines([getLine(2.5)], seedMenu)["quantity_1"]).toBe("Quantity must be a whole number from 1 to 10.");
  });

  it("fails on zero or negative", () => {
    expect(validateOrderLines([getLine(0)], seedMenu)["quantity_1"]).toBe("Quantity must be between 1 and 10.");
    expect(validateOrderLines([getLine(-1)], seedMenu)["quantity_1"]).toBe("Quantity must be between 1 and 10.");
  });

  it("fails on exceeding capacity", () => {
    expect(validateOrderLines([getLine(11)], seedMenu)["quantity_1"]).toBe("Maximum outlet capacity is 10 pizzas per order.");
    expect(validateOrderLines([getLine(100)], seedMenu)["quantity_1"]).toBe("Maximum outlet capacity is 10 pizzas per order.");
  });

  it("passes on valid quantities", () => {
    expect(validateOrderLines([getLine(1)], seedMenu)["quantity_1"]).toBeUndefined();
    expect(validateOrderLines([getLine(5)], seedMenu)["quantity_1"]).toBeUndefined();
    expect(validateOrderLines([getLine(10)], seedMenu)["quantity_1"]).toBeUndefined();
  });
});

describe("TDD Parity: Billing Logic Edge Cases", () => {
  const mockMenu: MenuPayload = {
    ...seedMenu,
    bases: [{ id: 1, code: "B1", name: "Thin Crust", price: 149, available: true, description: "" }, { id: 3, code: "B3", name: "Cheese Burst", price: 229, available: true, description: "" }],
    pizzas: [{ id: 1, code: "P1", name: "Margherita", price: 299, available: true, description: "", image: "", badge: "", tags: [], prepMinutes: 10 }, { id: 7, code: "P7", name: "BBQ Chicken", price: 379, available: true, description: "", image: "", badge: "", tags: [], prepMinutes: 10 }],
    toppings: [{ id: 1, code: "T1", name: "Extra Cheese", price: 69, available: true }],
    sizes: [{ id: "M", name: "Medium", extra: 0, detail: "", available: true }]
  };

  const getLine = (baseId: number, pizzaId: number, toppingIds: number[], quantity: number): CartLine => ({
    id: "test", pizzaId, baseId, sizeId: "M", toppingIds, quantity
  });

  it("PRD Sample (qty=5 discount logic)", () => {
    const bill = calculateBill([getLine(3, 7, [1], 5)], mockMenu);
    expect(bill.subtotal).toBe(3385);
    expect(bill.discount).toBe(339); // 338.5 rounded
    expect(bill.taxable).toBe(3046); // 3385 - 339
    expect(bill.gst).toBe(548);      // 3046 * 0.18 = 548.28 rounded
    expect(bill.finalTotal).toBe(3594); // 3046 + 548
  });

  it("qty=4 no discount", () => {
    const bill = calculateBill([getLine(1, 1, [1], 4)], mockMenu);
    expect(bill.subtotal).toBe(2068);
    expect(bill.discount).toBe(0);
  });

  it("qty=1 exact float math", () => {
    const bill = calculateBill([getLine(3, 7, [1], 1)], mockMenu);
    expect(bill.discount).toBe(0);
    expect(bill.finalTotal).toBe(799); // 677 + 122(gst)
  });
});

describe("TDD Parity: Currency Formatting", () => {
  it("formats money with rounded integer", () => {
    expect(money(2988)).toBe("Rs. 2,988");
    expect(money(484.056)).toBe("Rs. 484");
    expect(money(298.8)).toBe("Rs. 299");
  });
});
