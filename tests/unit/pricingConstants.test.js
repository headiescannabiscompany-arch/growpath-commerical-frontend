import {
  COMMERCIAL_PLAN_PRICE_DISPLAY,
  FACILITY_PLAN_PRICE_DISPLAY,
  formatPlanBillingNote,
  formatPlanPrice,
  formatVerifiedPlanBillingNote,
  formatVerifiedPlanPrice,
  PLAN_PRICING,
  PRO_PLAN_PRICE_DISPLAY,
  verifiedPlanQuote
} from "../../src/constants/pricing";
import fs from "fs";
import path from "path";

describe("pricing constants", () => {
  it("keeps plan metadata free of client-authored payment amounts", () => {
    for (const plan of Object.values(PLAN_PRICING)) {
      expect(plan).not.toHaveProperty("monthly");
      expect(plan).not.toHaveProperty("yearly");
    }

    expect(PRO_PLAN_PRICE_DISPLAY).toBe("Current verified Stripe price");
    expect(COMMERCIAL_PLAN_PRICE_DISPLAY).toBe("Current verified Stripe price");
    expect(FACILITY_PLAN_PRICE_DISPLAY).toBe("Current verified Stripe price");
    expect(PLAN_PRICING.commercial.eyebrow).toBe("Brand");
  });

  it("requires a verified provider quote before displaying a price", () => {
    expect(formatPlanPrice("commercial", "yearly")).toBe("See verified Stripe price");
    expect(formatPlanBillingNote("commercial", "yearly")).toBe(
      "The verified annual total is shown before Stripe opens."
    );

    const quotes = {
      commercial: {
        yearly: {
          available: true,
          interval: "yearly",
          unitAmount: 50000,
          currency: "usd",
          formattedAmount: "$500"
        }
      }
    };
    const quote = verifiedPlanQuote(quotes, "commercial", "yearly");
    expect(formatVerifiedPlanPrice(quote)).toBe("$500");
    expect(formatVerifiedPlanBillingNote(quote)).toBe(
      "Billed once yearly by Stripe. Equivalent to $41.67/month."
    );
    expect(verifiedPlanQuote({}, "commercial", "yearly")).toBeNull();
    expect(formatVerifiedPlanPrice(null)).toBe("Unavailable");
  });

  it("keeps the public plan feature matrix tied to shared pricing", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/screens/PlanFeatureMatrixScreen.js"),
      "utf8"
    );

    expect(source).toContain("PRO_PLAN_PRICE_DISPLAY");
    expect(source).toContain("COMMERCIAL_PLAN_PRICE_DISPLAY");
    expect(source).toContain("FACILITY_PLAN_PRICE_DISPLAY");
    expect(source).not.toContain("Facility ($50/mo)");
    expect(source).not.toContain("Creator Plus");
    expect(source).not.toContain("pricing TBD");
    expect(source).not.toMatch(/â/);
  });
});
