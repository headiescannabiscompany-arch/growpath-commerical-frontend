import {
  COMMERCIAL_PLAN_PRICE_DISPLAY,
  FACILITY_PLAN_PRICE_DISPLAY,
  formatPlanBillingNote,
  formatPlanPrice,
  PLAN_PRICING,
  PRO_PLAN_PRICE_DISPLAY
} from "../../src/constants/pricing";
import fs from "fs";
import path from "path";

describe("pricing constants", () => {
  it("keeps published monthly and yearly plan prices exact", () => {
    expect(PLAN_PRICING.pro.monthly).toBe(10);
    expect(PLAN_PRICING.pro.yearly).toBe(100);
    expect(PLAN_PRICING.commercial.monthly).toBe(50);
    expect(PLAN_PRICING.commercial.yearly).toBe(500);
    expect(PLAN_PRICING.facility.monthly).toBe(100);
    expect(PLAN_PRICING.facility.yearly).toBe(1000);

    expect(PRO_PLAN_PRICE_DISPLAY).toBe("$10/month or $100/year");
    expect(COMMERCIAL_PLAN_PRICE_DISPLAY).toBe("$50/month or $500/year");
    expect(FACILITY_PLAN_PRICE_DISPLAY).toBe("$100/month or $1,000/year");
  });

  it("shows annual billing as billed yearly with clear monthly equivalent", () => {
    expect(formatPlanPrice("commercial", "yearly")).toBe("$500");
    expect(formatPlanBillingNote("commercial", "yearly")).toBe(
      "Billed once yearly. Equivalent to $41.67/month."
    );
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
    expect(source).not.toMatch(/â/);
  });
});
