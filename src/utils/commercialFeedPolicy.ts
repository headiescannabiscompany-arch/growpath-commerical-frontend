const FACILITY_SALES_PATTERNS = [
  /\bfor sale\b/i,
  /\bsale\b/i,
  /\bsales\b/i,
  /\bwholesale\b/i,
  /\bpricing\b/i,
  /\bprice\b/i,
  /\bdiscount\b/i,
  /\bpromo(?:tion| code)?\b/i,
  /\border now\b/i,
  /\bbulk order\b/i,
  /\bdm for\b/i,
  /\bbuy\b/i,
  /\bpurchase\b/i,
  /\bdeal\b/i,
  /\bshipping\b/i,
  /\bavailable now\b/i,
  /\$/i
];

export function hasFacilitySalesLanguage(input: string | string[]) {
  const text = Array.isArray(input) ? input.join(" ") : input;
  return FACILITY_SALES_PATTERNS.some((pattern) => pattern.test(text || ""));
}

export function facilitySalesPolicyText() {
  return "Facility feed campaigns must be educational or outreach content, not direct sales listings.";
}
