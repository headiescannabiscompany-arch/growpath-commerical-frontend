type CoursePriceFields = {
  priceCents?: unknown;
  price?: unknown;
  access?: unknown;
  pricingType?: unknown;
  stripePriceId?: unknown;
};

function amount(value: unknown): number {
  if (value == null || (typeof value === "string" && value.trim() === "")) return 0;
  return typeof value === "number" || typeof value === "string" ? Number(value) : NaN;
}

// Presentation only. The caller's existing paid/access/checkout decisions remain
// authoritative; missing amounts must not turn a paid course into a Free label.
export function coursePriceLabel(
  course: CoursePriceFields | null | undefined,
  paid = false
): string {
  const cents = amount(course?.priceCents);
  if (Number.isFinite(cents) && cents > 0) return `$${(cents / 100).toFixed(2)}`;
  const dollars = amount(course?.price);
  if (Number.isFinite(dollars) && dollars > 0) return `$${dollars.toFixed(2)}`;
  if (
    paid ||
    String(course?.access || "").toLowerCase() === "paid" ||
    String(course?.pricingType || "").toLowerCase() === "paid" ||
    (typeof course?.stripePriceId === "string" && course.stripePriceId.trim())
  )
    return "Paid — price unavailable";
  if (!Number.isFinite(cents) || !Number.isFinite(dollars) || cents < 0 || dollars < 0)
    return "Price unavailable";
  return "Free";
}
