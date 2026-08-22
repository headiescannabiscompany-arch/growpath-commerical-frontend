import { describe, expect, it } from "@jest/globals";

import {
  formatBasisPoints,
  formatMoneyMinor,
  formatScaledIntegerInput,
  multiplyMoneyByQuantityMicros,
  parseDecimalToScaledInteger,
  parseMoneyInput,
  parsePercentInput,
  parseQuantityInput,
  resolveCurrencyContext
} from "../../src/features/businessDesk/money";

describe("Business Desk money input", () => {
  it("pins currency exponents rather than assuming cents", () => {
    expect(resolveCurrencyContext("usd")).toEqual({
      currency: "USD",
      minorUnitDigits: 2
    });
    expect(resolveCurrencyContext("JPY")).toEqual({
      currency: "JPY",
      minorUnitDigits: 0
    });
    expect(resolveCurrencyContext("KWD")).toEqual({
      currency: "KWD",
      minorUnitDigits: 3
    });
  });

  it("converts supported decimal money and rejects excess precision", () => {
    expect(parseMoneyInput("12.34", { currency: "USD", minorUnitDigits: 2 })).toBe(1234);
    expect(parseMoneyInput("12.5", { currency: "KWD", minorUnitDigits: 3 })).toBe(12500);
    expect(() =>
      parseMoneyInput(
        "12.345",
        { currency: "USD", minorUnitDigits: 2 },
        { label: "Cost" }
      )
    ).toThrow("Cost supports at most 2 decimal places");
    expect(() =>
      parseMoneyInput(
        "12.340",
        { currency: "USD", minorUnitDigits: 2 },
        { label: "Cost" }
      )
    ).toThrow("Cost supports at most 2 decimal places");
  });

  it("uses exact quantity micros and percentage basis points", () => {
    expect(parseQuantityInput("1.234567")).toBe(1_234_567);
    expect(parsePercentInput("12.34")).toBe(1234);
    expect(() => parseQuantityInput("1.2345674")).toThrow("at most 6 decimal places");
    expect(() => parsePercentInput("12.345")).toThrow("at most 2 decimal places");
    expect(() => parsePercentInput("100.01")).toThrow("cannot exceed 100%");
  });

  it("supports explicit blanks and rejects formatted or negative input", () => {
    expect(
      parseDecimalToScaledInteger("", 2, { allowBlank: true, label: "Cost" })
    ).toBeNull();
    expect(() => parseQuantityInput("1,000")).toThrow("non-negative number");
    expect(() => parseMoneyInput("-1", { currency: "USD", minorUnitDigits: 2 })).toThrow(
      "non-negative"
    );
  });

  it("renders unknown profitability distinctly from zero", () => {
    expect(formatMoneyMinor(null, { currency: "USD", minorUnitDigits: 2 })).toBe(
      "Unknown"
    );
    expect(formatBasisPoints(null)).toBe("Incomplete");
    expect(formatBasisPoints(0)).toBe("0%");
  });

  it("formats safe-integer minor units without losing the last unit", () => {
    expect(
      parseMoneyInput("90071992547409.91", {
        currency: "USD",
        minorUnitDigits: 2
      })
    ).toBe(Number.MAX_SAFE_INTEGER);
    expect(() =>
      parseMoneyInput("90071992547409.92", {
        currency: "USD",
        minorUnitDigits: 2
      })
    ).toThrow("too large");
    expect(
      formatMoneyMinor(Number.MAX_SAFE_INTEGER, {
        currency: "USD",
        minorUnitDigits: 2
      })
    ).toBe("$90,071,992,547,409.91");
    expect(formatMoneyMinor(-1, { currency: "USD", minorUnitDigits: 2 })).toBe("-$0.01");
  });

  it("formats review inputs exactly at safe-integer money and quantity boundaries", () => {
    expect(formatScaledIntegerInput(Number.MAX_SAFE_INTEGER, 2)).toBe(
      "90071992547409.91"
    );
    expect(
      formatScaledIntegerInput(Number.MAX_SAFE_INTEGER, 6, {
        trimTrailingZeros: true
      })
    ).toBe("9007199254.740991");
    expect(formatScaledIntegerInput(1, 6, { trimTrailingZeros: true })).toBe("0.000001");
    expect(formatScaledIntegerInput(1_500_000, 6, { trimTrailingZeros: true })).toBe(
      "1.5"
    );
  });

  it("extends money by micro-quantity with half-away component rounding", () => {
    expect(multiplyMoneyByQuantityMicros(101, 1_500_000)).toBe(152);
    expect(multiplyMoneyByQuantityMicros(1, 500_000)).toBe(1);
    expect(() => multiplyMoneyByQuantityMicros(-1, 1_000_000)).toThrow("non-negative");
  });
});
