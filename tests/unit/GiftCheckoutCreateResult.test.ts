import { requireMatchingGiftCheckoutCreateResult } from "@/features/billing/giftCheckoutCreateResult";

const ATTEMPT_ID = "123e4567-e89b-42d3-a456-426614174000";
const OTHER_ATTEMPT_ID = "123e4567-e89b-42d3-a456-426614174001";
const SESSION_ID = "cs_test_matching_session";

function validResult(overrides: Record<string, unknown> = {}) {
  return {
    url: `https://checkout.stripe.com/c/pay/${SESSION_ID}?locale=en#fidkdWxOYHwnPyd1blpxYHZxWjA0`,
    sessionId: SESSION_ID,
    trialDays: 0,
    giftId: "507f1f77bcf86cd799439011",
    checkoutAttemptId: ATTEMPT_ID,
    amountCents: 1234,
    currency: "usd",
    expiresAt: "2099-01-01T12:30:00.000Z",
    ...overrides
  };
}

const expected = {
  checkoutAttemptId: ATTEMPT_ID,
  amountCents: 1234,
  currency: "usd"
};

describe("gift checkout create response correlation", () => {
  it("accepts one direct response whose Stripe session and reviewed quote all match", () => {
    expect(requireMatchingGiftCheckoutCreateResult(validResult(), expected)).toEqual(
      validResult()
    );
  });

  it.each([
    ["a nested wrapper", { data: validResult() }],
    ["a mismatched attempt", validResult({ checkoutAttemptId: OTHER_ATTEMPT_ID })],
    ["a missing session", validResult({ sessionId: undefined })],
    ["a malformed session", validResult({ sessionId: "not_a_session" })],
    [
      "a URL for another session",
      validResult({ url: "https://checkout.stripe.com/c/pay/cs_test_other_session" })
    ],
    [
      "a Stripe-lookalike host",
      validResult({
        url: `https://checkout.stripe.com.attacker.example/c/pay/${SESSION_ID}`
      })
    ],
    ["a trial", validResult({ trialDays: 1 })],
    ["a malformed gift id", validResult({ giftId: "gift-1" })],
    ["a mismatched amount", validResult({ amountCents: 1235 })],
    ["an unsafe amount", validResult({ amountCents: 1.5 })],
    ["a mismatched currency", validResult({ currency: "eur" })],
    ["a noncanonical currency", validResult({ currency: "USD" })],
    ["a malformed expiry", validResult({ expiresAt: "not-a-date" })],
    ["a noncanonical expiry", validResult({ expiresAt: "2099-01-01T12:30:00Z" })],
    ["an expired response", validResult({ expiresAt: "2020-01-01T12:30:00.000Z" })]
  ])("rejects %s", (_label, response) => {
    expect(() => requireMatchingGiftCheckoutCreateResult(response, expected)).toThrow(
      "did not match the reviewed attempt"
    );
  });

  it.each([
    { checkoutAttemptId: OTHER_ATTEMPT_ID },
    { amountCents: 1235 },
    { currency: "eur" }
  ])("rejects a response that does not match expectation %p", (override) => {
    expect(() =>
      requireMatchingGiftCheckoutCreateResult(validResult(), {
        ...expected,
        ...override
      })
    ).toThrow("did not match the reviewed attempt");
  });
});
