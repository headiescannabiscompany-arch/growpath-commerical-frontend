export const BUSINESS_DESK_QUANTITY_SCALE = 1_000_000;
export const BUSINESS_DESK_BASIS_POINT_SCALE = 10_000;

export type CurrencyContext = {
  currency: string;
  minorUnitDigits: number;
};

function inputError(message: string) {
  return new Error(message);
}

export function resolveCurrencyContext(rawCurrency: string): CurrencyContext {
  const currency = String(rawCurrency || "")
    .trim()
    .toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw inputError("Enter a three-letter currency code, such as USD or CAD.");
  }

  try {
    const minorUnitDigits = Number(
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency
      }).resolvedOptions().maximumFractionDigits
    );
    if (
      !Number.isInteger(minorUnitDigits) ||
      minorUnitDigits < 0 ||
      minorUnitDigits > 4
    ) {
      throw new Error("unsupported currency exponent");
    }
    return { currency, minorUnitDigits };
  } catch (_error) {
    throw inputError(`${currency} is not supported by this device.`);
  }
}

export function parseDecimalToScaledInteger(
  rawValue: string,
  scaleDigits: number,
  options: { label?: string; allowNegative?: boolean; allowBlank?: boolean } = {}
): number | null {
  const label = options.label || "Value";
  const raw = String(rawValue ?? "").trim();
  if (!raw && options.allowBlank) return null;
  if (!raw) throw inputError(`${label} is required.`);
  if (!Number.isInteger(scaleDigits) || scaleDigits < 0 || scaleDigits > 6) {
    throw inputError(`${label} uses an unsupported precision.`);
  }

  const match = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(raw);
  if (!match || (!options.allowNegative && match[1] === "-")) {
    throw inputError(
      `${label} must be a ${options.allowNegative ? "plain" : "non-negative"} number.`
    );
  }

  const fraction = match[3] || "";
  if (fraction.length > scaleDigits) {
    throw inputError(
      `${label} supports at most ${scaleDigits} decimal place${scaleDigits === 1 ? "" : "s"}.`
    );
  }
  const kept = fraction.padEnd(scaleDigits, "0");
  const absolute = BigInt(match[2]) * 10n ** BigInt(scaleDigits) + BigInt(kept || "0");
  if (absolute > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw inputError(`${label} is too large.`);
  }
  const scaled = Number(absolute);
  return match[1] === "-" ? -scaled : scaled;
}

/**
 * Formats a safe scaled integer as an exact plain-decimal form input without
 * passing through IEEE-754 division. This is deliberately not locale-formatted.
 */
export function formatScaledIntegerInput(
  value: number | null | undefined,
  scaleDigits: number,
  options: { trimTrailingZeros?: boolean } = {}
) {
  if (value === null || value === undefined) return "";
  if (!Number.isSafeInteger(value)) return "";
  if (!Number.isInteger(scaleDigits) || scaleDigits < 0 || scaleDigits > 6) return "";
  const negative = value < 0;
  const absolute = BigInt(negative ? -value : value);
  const scale = 10n ** BigInt(scaleDigits);
  const whole = absolute / scale;
  let fraction = (absolute % scale).toString().padStart(scaleDigits, "0");
  if (options.trimTrailingZeros) fraction = fraction.replace(/0+$/, "");
  const decimal = fraction ? `.${fraction}` : "";
  return `${negative ? "-" : ""}${whole.toString()}${decimal}`;
}

export function parseMoneyInput(
  rawValue: string,
  context: CurrencyContext,
  options: { label?: string; allowNegative?: boolean; allowBlank?: boolean } = {}
) {
  return parseDecimalToScaledInteger(rawValue, context.minorUnitDigits, options);
}

export function parseQuantityInput(
  rawValue: string,
  options: { label?: string; allowBlank?: boolean } = {}
) {
  return parseDecimalToScaledInteger(rawValue, 6, {
    ...options,
    allowNegative: false
  });
}

export function parsePercentInput(
  rawValue: string,
  options: { label?: string; allowBlank?: boolean } = {}
) {
  const basisPoints = parseDecimalToScaledInteger(rawValue, 2, {
    label: options.label || "Percentage",
    allowBlank: options.allowBlank,
    allowNegative: false
  });
  if (basisPoints !== null && basisPoints > BUSINESS_DESK_BASIS_POINT_SCALE) {
    throw inputError(`${options.label || "Percentage"} cannot exceed 100%.`);
  }
  return basisPoints;
}

export function multiplyMoneyByQuantityMicros(
  amountMinor: number,
  quantityMicros: number,
  label = "Amount"
) {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) {
    throw inputError(`${label} must be a non-negative safe integer amount.`);
  }
  if (!Number.isSafeInteger(quantityMicros) || quantityMicros < 0) {
    throw inputError(`${label} quantity must be a non-negative safe integer.`);
  }
  const numerator = BigInt(amountMinor) * BigInt(quantityMicros);
  const denominator = BigInt(BUSINESS_DESK_QUANTITY_SCALE);
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  const rounded = remainder * 2n >= denominator ? quotient + 1n : quotient;
  const result = Number(rounded);
  if (!Number.isSafeInteger(result)) throw inputError(`${label} is too large.`);
  return result;
}

export function formatMoneyMinor(
  amountMinor: number | null | undefined,
  context: CurrencyContext
) {
  if (amountMinor === null || amountMinor === undefined) return "Unknown";
  if (!Number.isSafeInteger(amountMinor)) return "Unknown";
  const digits = context.minorUnitDigits;
  if (!Number.isInteger(digits) || digits < 0 || digits > 4) return "Unknown";

  const negative = amountMinor < 0;
  const absoluteMinor = BigInt(amountMinor < 0 ? -amountMinor : amountMinor);
  const scale = 10n ** BigInt(digits);
  const whole = absoluteMinor / scale;
  const fraction = (absoluteMinor % scale).toString().padStart(digits, "0");
  try {
    const currencyFormatter = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: context.currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    });
    const groupedWhole = new Intl.NumberFormat(undefined, {
      maximumFractionDigits: 0,
      useGrouping: true
    }).format(whole);
    let insertedInteger = false;
    return currencyFormatter
      .formatToParts(negative ? -1 : 0)
      .map((part) => {
        if (part.type === "integer") {
          if (insertedInteger) return "";
          insertedInteger = true;
          return groupedWhole;
        }
        if (part.type === "group") return "";
        if (part.type === "fraction") return fraction;
        return part.value;
      })
      .join("");
  } catch (_error) {
    const decimal = digits ? `.${fraction}` : "";
    return `${context.currency} ${negative ? "-" : ""}${whole.toString()}${decimal}`;
  }
}

export function formatQuantityMicros(quantityMicros: number | null | undefined) {
  if (quantityMicros === null || quantityMicros === undefined) return "Unknown";
  return formatScaledIntegerInput(quantityMicros, 6, { trimTrailingZeros: true });
}

export function formatBasisPoints(basisPoints: number | null | undefined) {
  if (basisPoints === null || basisPoints === undefined) return "Incomplete";
  return `${(basisPoints / 100).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })}%`;
}
