// Centralized pricing constants for GrowPath plans.
// Stripe may show monthly equivalents for annual billing; app copy should show
// the billed amount clearly.

export const PLAN_PRICING = {
  pro: {
    title: "Pro Grower",
    eyebrow: "Personal"
  },
  commercial: {
    title: "Commercial",
    eyebrow: "Brand"
  },
  facility: {
    title: "Facility",
    eyebrow: "Operations"
  }
};

export const PRO_PLAN_PRICE = null;
export const PRO_PLAN_PRICE_DISPLAY = "Current verified Stripe price";

export const COMMERCIAL_PLAN_PRICE = null;
export const COMMERCIAL_PLAN_PRICE_DISPLAY = "Current verified Stripe price";

export const FACILITY_PLAN_PRICE = null;
export const FACILITY_PLAN_PRICE_DISPLAY = "Current verified Stripe price";

export function formatPlanPrice(planKey, interval = "monthly") {
  void planKey;
  void interval;
  return "See verified Stripe price";
}

export function formatPlanBillingNote(planKey, interval = "monthly") {
  void planKey;
  return interval === "yearly"
    ? "The verified annual total is shown before Stripe opens."
    : "The verified monthly total is shown before Stripe opens.";
}

export function verifiedPlanQuote(quotes, planKey, interval = "monthly") {
  const quote = quotes?.[planKey]?.[interval];
  return quote?.available === true && Number.isInteger(Number(quote.unitAmount))
    ? quote
    : null;
}

export function formatVerifiedPlanPrice(quote) {
  return quote?.formattedAmount || "Unavailable";
}

export function formatVerifiedPlanBillingNote(quote) {
  if (!quote) return "Stripe pricing is unavailable. Checkout is disabled.";
  if (quote.interval !== "yearly") return "Billed monthly by Stripe.";
  const equivalent = Number(quote.unitAmount) / 100 / 12;
  const currency = String(quote.currency || "usd").toUpperCase();
  return `Billed once yearly by Stripe. Equivalent to ${new Intl.NumberFormat(
    "en-US",
    { style: "currency", currency }
  ).format(equivalent)}/month.`;
}
