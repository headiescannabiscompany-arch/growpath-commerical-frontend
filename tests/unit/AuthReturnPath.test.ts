import {
  buildAuthReturnPath,
  GIFT_CHECKOUT_CANCEL_PATH,
  GIFT_CHECKOUT_RECOVERY_PATH,
  GIFT_CHECKOUT_SUCCESS_PATH,
  isCanonicalLegacyCancelReturn,
  OFFERS_GIFT_RETURN_PATH,
  parseAuthReturnPath,
  parseSafeLoginReturnPath,
  resolveAuthReturnPath,
  safeLoginPath
} from "@/utils/authReturnPath";

const SESSION_ID = "cs_test_valid_session_123";
const ATTEMPT_ID = "123e4567-e89b-42d3-a456-426614174000";

describe("internal authentication return allowlist", () => {
  it.each([
    [
      `${GIFT_CHECKOUT_SUCCESS_PATH}?session_id=${SESSION_ID}`,
      `${GIFT_CHECKOUT_SUCCESS_PATH}?session_id=${SESSION_ID}`
    ],
    [
      `${GIFT_CHECKOUT_CANCEL_PATH}?checkout_attempt_id=${ATTEMPT_ID}`,
      `${GIFT_CHECKOUT_CANCEL_PATH}?checkout_attempt_id=${ATTEMPT_ID}`
    ],
    [GIFT_CHECKOUT_CANCEL_PATH, GIFT_CHECKOUT_CANCEL_PATH],
    [GIFT_CHECKOUT_RECOVERY_PATH, GIFT_CHECKOUT_RECOVERY_PATH],
    [OFFERS_GIFT_RETURN_PATH, OFFERS_GIFT_RETURN_PATH]
  ])("accepts exact internal continuation %s", (raw, expected) => {
    expect(parseAuthReturnPath(raw)).toBe(expected);
  });

  it.each([
    "https://evil.example/account/gift-checkout/recover",
    "//evil.example/account/gift-checkout/recover",
    `${GIFT_CHECKOUT_RECOVERY_PATH}#paid`,
    `${GIFT_CHECKOUT_RECOVERY_PATH}?extra=1`,
    `${GIFT_CHECKOUT_SUCCESS_PATH}`,
    `${GIFT_CHECKOUT_SUCCESS_PATH}?session_id=${SESSION_ID}&extra=1`,
    `${GIFT_CHECKOUT_SUCCESS_PATH}?session_id=${SESSION_ID}&session_id=${SESSION_ID}`,
    `${GIFT_CHECKOUT_SUCCESS_PATH}?%73ession_id=${SESSION_ID}`,
    `${GIFT_CHECKOUT_SUCCESS_PATH}?session_id=javascript:paid`,
    `${GIFT_CHECKOUT_CANCEL_PATH}?`,
    `${GIFT_CHECKOUT_CANCEL_PATH}?extra=1`,
    `${GIFT_CHECKOUT_CANCEL_PATH}?checkout_attempt_id=${ATTEMPT_ID}&extra=1`,
    `${GIFT_CHECKOUT_CANCEL_PATH}?checkout_attempt_%69d=${ATTEMPT_ID}`,
    `${GIFT_CHECKOUT_CANCEL_PATH}?checkout_attempt_id=short`,
    "/offers",
    "/offers?gift=0",
    "/offers?gift=%31",
    "/offers?gift=1&extra=1",
    "/offers?gift=1&gift=1",
    "/offers?gift=1#checkout",
    `/account/gift-checkout/../sent-gifts`,
    `/${"a".repeat(1100)}`,
    "/account\\gift-checkout\\recover"
  ])("rejects unsafe return %s", (raw) => {
    expect(parseAuthReturnPath(raw)).toBe("");
  });

  it("rejects duplicate arrays, extra parameters, and fragments from route state", () => {
    expect(
      buildAuthReturnPath(GIFT_CHECKOUT_SUCCESS_PATH, {
        session_id: [SESSION_ID, SESSION_ID]
      })
    ).toBe("");
    expect(
      buildAuthReturnPath(GIFT_CHECKOUT_CANCEL_PATH, {
        checkout_attempt_id: ATTEMPT_ID,
        extra: "1"
      })
    ).toBe("");
    expect(buildAuthReturnPath(GIFT_CHECKOUT_RECOVERY_PATH, {}, "#paid")).toBe("");
    expect(buildAuthReturnPath(GIFT_CHECKOUT_RECOVERY_PATH, {}, 0 as any)).toBe("");
    expect(buildAuthReturnPath(GIFT_CHECKOUT_CANCEL_PATH, {})).toBe(
      GIFT_CHECKOUT_CANCEL_PATH
    );
    expect(buildAuthReturnPath("/offers", { gift: "1" })).toBe(OFFERS_GIFT_RETURN_PATH);
    expect(buildAuthReturnPath("/offers", { gift: ["1", "1"] })).toBe("");
    expect(buildAuthReturnPath("/offers", { gift: "1", extra: "1" })).toBe("");
  });

  it("requires decoded web route state to match the exact raw browser URL", () => {
    const canonical = `${GIFT_CHECKOUT_SUCCESS_PATH}?session_id=${SESSION_ID}`;
    const decodedParams = { session_id: SESSION_ID };

    expect(
      resolveAuthReturnPath(GIFT_CHECKOUT_SUCCESS_PATH, decodedParams, "", canonical)
    ).toBe(canonical);
    expect(
      resolveAuthReturnPath(
        GIFT_CHECKOUT_SUCCESS_PATH,
        decodedParams,
        "",
        `${GIFT_CHECKOUT_SUCCESS_PATH}?%73ession_id=${SESSION_ID}`
      )
    ).toBe("");
    expect(
      resolveAuthReturnPath(GIFT_CHECKOUT_SUCCESS_PATH, decodedParams, "", null)
    ).toBe("");
    expect(resolveAuthReturnPath(GIFT_CHECKOUT_SUCCESS_PATH, decodedParams)).toBe(
      canonical
    );
  });

  it("allows legacy bare cancel only for a canonical raw web path", () => {
    expect(isCanonicalLegacyCancelReturn(GIFT_CHECKOUT_CANCEL_PATH)).toBe(true);
    expect(isCanonicalLegacyCancelReturn()).toBe(true);
    expect(isCanonicalLegacyCancelReturn("/account/gift-checkout/%63ancel")).toBe(false);
    expect(isCanonicalLegacyCancelReturn(null)).toBe(false);
  });

  it("preserves the existing tokenless claim continuation separately", () => {
    expect(parseAuthReturnPath("/claim-gift?token=private-token")).toBe("");
    expect(parseSafeLoginReturnPath("/claim-gift?token=private-token")).toBe(
      "/claim-gift"
    );
  });

  it("builds sign-in links only from validated continuations", () => {
    expect(
      safeLoginPath(
        "Buyer@Example.com",
        `${GIFT_CHECKOUT_CANCEL_PATH}?checkout_attempt_id=${ATTEMPT_ID}`
      )
    ).toBe(
      "/login?email=buyer%40example.com&next=%2Faccount%2Fgift-checkout%2Fcancel%3Fcheckout_attempt_id%3D123e4567-e89b-42d3-a456-426614174000"
    );
    expect(safeLoginPath("", "https://evil.example/")).toBe("/login");
    expect(safeLoginPath("", OFFERS_GIFT_RETURN_PATH)).toBe(
      "/login?next=%2Foffers%3Fgift%3D1"
    );
  });
});
