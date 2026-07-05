// Centralized pricing constants for GrowPath plans.
// Stripe may show monthly equivalents for annual billing; app copy should show
// the billed amount clearly.

export const PLAN_PRICING = {
  pro: {
    monthly: 10,
    yearly: 100,
    title: "Pro Grower",
    eyebrow: "Personal"
  },
  commercial: {
    monthly: 50,
    yearly: 500,
    title: "Commercial",
    eyebrow: "Business"
  },
  facility: {
    monthly: 100,
    yearly: 1000,
    title: "Facility",
    eyebrow: "Operations"
  }
};

export const PRO_PLAN_PRICE = PLAN_PRICING.pro.monthly;
export const PRO_PLAN_PRICE_DISPLAY = "$10/month or $100/year";

export const COMMERCIAL_PLAN_PRICE = PLAN_PRICING.commercial.monthly;
export const COMMERCIAL_PLAN_PRICE_DISPLAY = "$50/month or $500/year";

export const FACILITY_PLAN_PRICE = PLAN_PRICING.facility.monthly;
export const FACILITY_PLAN_PRICE_DISPLAY = "$100/month or $1,000/year";

export function formatPlanPrice(planKey, interval = "monthly") {
  const plan = PLAN_PRICING[planKey] || PLAN_PRICING.pro;
  const amount = interval === "yearly" ? plan.yearly : plan.monthly;
  return `$${amount.toLocaleString("en-US")}`;
}

export function formatPlanBillingNote(planKey, interval = "monthly") {
  const plan = PLAN_PRICING[planKey] || PLAN_PRICING.pro;
  if (interval !== "yearly") return "Billed monthly.";
  const equivalent = plan.yearly / 12;
  return `Billed once yearly. Equivalent to $${equivalent.toFixed(2)}/month.`;
}
