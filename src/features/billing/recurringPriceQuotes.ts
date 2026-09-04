import {
  getVerifiedRecurringPriceQuote,
  type AvailableRecurringPriceQuote,
  type RecurringPriceInterval,
  type RecurringPricePlan,
  type RecurringPriceQuotes
} from "@/api/subscription";

export const RECURRING_PRICE_UNAVAILABLE = "Unavailable";

function currencyFractionDigits(currency: string): number {
  try {
    return (
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency.toUpperCase()
      }).resolvedOptions().maximumFractionDigits ?? 2
    );
  } catch {
    return 2;
  }
}

function formatMinorCurrency(
  unitAmount: number,
  currency: string,
  { trimWhole = false }: { trimWhole?: boolean } = {}
): string {
  const fractionDigits = currencyFractionDigits(currency);
  const majorAmount = unitAmount / 10 ** fractionDigits;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: trimWhole && Number.isInteger(majorAmount) ? 0 : undefined,
      maximumFractionDigits: fractionDigits
    }).format(majorAmount);
  } catch {
    return `${majorAmount.toFixed(fractionDigits)} ${currency.toUpperCase()}`;
  }
}

export function verifiedRecurringPriceQuote(
  quotes: RecurringPriceQuotes | unknown,
  plan: RecurringPricePlan,
  interval: RecurringPriceInterval
): AvailableRecurringPriceQuote | null {
  return getVerifiedRecurringPriceQuote(quotes, plan, interval);
}

export function formatVerifiedRecurringPrice(
  quote: AvailableRecurringPriceQuote | null
): string {
  if (!quote) return RECURRING_PRICE_UNAVAILABLE;
  return formatMinorCurrency(quote.unitAmount, quote.currency, { trimWhole: true });
}

export function formatVerifiedRecurringBillingNote(
  quote: AvailableRecurringPriceQuote | null
): string {
  if (!quote) return "Stripe pricing is unavailable. Checkout is disabled.";
  if (quote.interval === "monthly") return "Billed monthly by Stripe.";
  return `Billed once yearly by Stripe. Equivalent to ${formatMinorCurrency(
    quote.unitAmount / 12,
    quote.currency
  )}/month.`;
}
