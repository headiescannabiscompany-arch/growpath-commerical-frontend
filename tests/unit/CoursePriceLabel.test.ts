import { coursePriceLabel } from "@/utils/coursePriceLabel";

describe("R09-04P course price labels", () => {
  it.each([
    [
      "paid access with zero",
      { access: "paid", priceCents: 0 },
      false,
      "Paid — price unavailable"
    ],
    ["legacy paid pricing", { pricingType: "paid" }, false, "Paid — price unavailable"],
    [
      "provider price without amount",
      { stripePriceId: "price_synthetic" },
      false,
      "Paid — price unavailable"
    ],
    ["caller's paid decision", {}, true, "Paid — price unavailable"],
    ["saved cents preferred", { priceCents: 2500, price: 99 }, false, "$25.00"],
    ["legacy dollars fallback", { priceCents: 0, price: "12.50" }, false, "$12.50"],
    ["ordinary zero free", { access: "free", priceCents: 0, price: 0 }, false, "Free"],
    ["legacy absent free", {}, false, "Free"],
    [
      "nonfinite paid",
      { access: "paid", priceCents: Infinity },
      false,
      "Paid — price unavailable"
    ],
    ["negative amount", { price: -1 }, false, "Price unavailable"],
    ["malformed amount", { price: "unknown" }, false, "Price unavailable"],
    ["boolean is not an amount", { price: true }, false, "Price unavailable"]
  ] as const)("%s", (_name, course, paid, expected) => {
    const snapshot = { ...course };
    expect(coursePriceLabel(Object.freeze(course), paid)).toBe(expected);
    expect(course).toEqual(snapshot);
  });
});
