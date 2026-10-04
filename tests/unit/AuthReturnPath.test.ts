import {
  buildAuthReturnPath,
  GIFT_CHECKOUT_CANCEL_PATH,
  GIFT_CHECKOUT_RECOVERY_PATH,
  GIFT_CHECKOUT_SUCCESS_PATH,
  isCanonicalLegacyCancelReturn,
  OFFERS_GIFT_RETURN_PATH,
  offersGiftReturnPath,
  parseAuthReturnPath,
  parsePublicCourseReturnPath,
  parseSafeLoginReturnPath,
  parseShopperSignupReturnPath,
  resolveAuthReturnPath,
  safeLoginPath
} from "@/utils/authReturnPath";

const SESSION_ID = "cs_test_valid_session_123";
const ATTEMPT_ID = "123e4567-e89b-42d3-a456-426614174000";
const LIVE_SESSION_ID = "507f191e810c19729de86001";
const COURSE_ID = "6aa2f5c5d339157652995f10";
const SHARED_COURSE_PATH = `/courses?courseId=${COURSE_ID}`;
const STOREFRONT_COURSE_PATH = `/store/growpathai/courses/${COURSE_ID}`;
const PRODUCT_PATH = "/store/growpathai/products/6a90f76bf113936857750634";

describe("feedback login return", () => {
  it("allows only the exact feedback destination, not arbitrary redirects or signup carryover", () => {
    expect(parseSafeLoginReturnPath("/feedback")).toBe("/feedback");
    for (const value of [
      "/feedback?next=https://evil.example",
      "//feedback",
      "/feedback#submit",
      "/feedback/",
      ["/feedback"],
      "https://growpathai.com/feedback"
    ]) {
      expect(parseSafeLoginReturnPath(value)).toBe("");
    }
    expect(parseShopperSignupReturnPath("/feedback")).toBe("");
  });
});

describe("shopper signup return allowlist", () => {
  it.each([PRODUCT_PATH, SHARED_COURSE_PATH, STOREFRONT_COURSE_PATH])(
    "accepts only the exact canonical shopper destination %s",
    (path) => {
      expect(parseShopperSignupReturnPath(path)).toBe(path);
    }
  );

  it.each(
    [PRODUCT_PATH, SHARED_COURSE_PATH, STOREFRONT_COURSE_PATH].flatMap((path) =>
      [
        [path],
        [path, path],
        ` ${path}`,
        `${path} `,
        `${path}\n`,
        `${path}\r\n`,
        `${path}\t`,
        `${path}\u0000`,
        `${path}#lesson`,
        `https://evil.example${path}`,
        `/${path}`
      ].map((value) => ({ value }))
    )
  )("rejects raw, noncanonical shopper input $value", ({ value }) => {
    expect(parseShopperSignupReturnPath(value)).toBe("");
  });

  it.each(
    [
      undefined,
      null,
      0,
      {},
      new String(PRODUCT_PATH),
      [],
      "",
      "/products",
      "/courses",
      "/courses?courseId=course-title",
      `/courses?courseId=${COURSE_ID.toUpperCase()}`,
      `/courses?%63ourseId=${COURSE_ID}`,
      `/courses?courseId=%36${COURSE_ID.slice(1)}`,
      `${SHARED_COURSE_PATH}&courseId=${COURSE_ID}`,
      `${SHARED_COURSE_PATH}&extra=1`,
      `/courses?extra=1&courseId=${COURSE_ID}`,
      `${STOREFRONT_COURSE_PATH}?extra=1`,
      STOREFRONT_COURSE_PATH.replace("growpathai", "GrowPathAI"),
      STOREFRONT_COURSE_PATH.replace("growpathai", "%67rowpathai"),
      STOREFRONT_COURSE_PATH.replace(COURSE_ID, "course-title"),
      `${PRODUCT_PATH}?extra=1`,
      PRODUCT_PATH.replace("growpathai", ".."),
      PRODUCT_PATH.replace("growpathai", "-store"),
      PRODUCT_PATH.replace("growpathai", "a".repeat(101)),
      PRODUCT_PATH.replace("6a90f76bf113936857750634", "product-title"),
      "/claim-gift",
      "/claim-gift?token=secret",
      "/claim-complimentary-access",
      GIFT_CHECKOUT_RECOVERY_PATH,
      `${GIFT_CHECKOUT_SUCCESS_PATH}?session_id=${SESSION_ID}`,
      GIFT_CHECKOUT_CANCEL_PATH,
      OFFERS_GIFT_RETURN_PATH,
      offersGiftReturnPath(LIVE_SESSION_ID),
      "/home/personal/courses",
      "/home/commercial",
      "/home/facility",
      "/admin"
    ].map((value) => ({ value }))
  )("does not broaden signup to other login or private returns $value", ({ value }) => {
    expect(parseShopperSignupReturnPath(value)).toBe("");
  });
});

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
    [OFFERS_GIFT_RETURN_PATH, OFFERS_GIFT_RETURN_PATH],
    [offersGiftReturnPath(LIVE_SESSION_ID), offersGiftReturnPath(LIVE_SESSION_ID)]
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
    "/offers?gift=1&liveSessionId=bad",
    `/offers?liveSessionId=${LIVE_SESSION_ID}&gift=1`,
    `/offers?gift=1&liveSessionId=${LIVE_SESSION_ID}&extra=1`,
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
    expect(
      buildAuthReturnPath("/offers", {
        gift: "1",
        liveSessionId: LIVE_SESSION_ID
      })
    ).toBe(offersGiftReturnPath(LIVE_SESSION_ID));
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
    expect(safeLoginPath("", offersGiftReturnPath(LIVE_SESSION_ID))).toBe(
      `/login?next=%2Foffers%3Fgift%3D1%26liveSessionId%3D${LIVE_SESSION_ID}`
    );
  });

  it("allows canonical public product returns without opening arbitrary redirects", () => {
    const next = "/store/growpathai/products/6a90f76bf113936857750634";
    expect(parseSafeLoginReturnPath(next)).toBe(next);
    for (const unsafe of [
      `https://evil.example${next}`,
      `/${next}`,
      `${next}?next=https://evil.example`,
      `${next}#private`,
      `${next}/../admin`,
      next.replace("growpathai", "%2f%2fevil.example"),
      next.replace("growpathai", ".."),
      `${next}\n`,
      "/admin",
      "/home/commercial/products/new"
    ])
      expect(parseSafeLoginReturnPath(unsafe)).toBe("");
  });

  it.each([SHARED_COURSE_PATH, STOREFRONT_COURSE_PATH])(
    "accepts the exact public course continuation %s without changing gift contracts",
    (next) => {
      expect(parsePublicCourseReturnPath(next)).toBe(next);
      expect(parseSafeLoginReturnPath(next)).toBe(next);
      expect(safeLoginPath("", next)).toBe(`/login?next=${encodeURIComponent(next)}`);
      expect(parseAuthReturnPath(next)).toBe("");
    }
  );

  it("preserves the existing lowercase storefront slug bounds for course returns", () => {
    for (const slug of ["a", "saved-store-2", "a".repeat(100)]) {
      const next = `/store/${slug}/courses/${COURSE_ID}`;
      expect(parsePublicCourseReturnPath(next)).toBe(next);
    }
  });

  it.each([
    undefined,
    null,
    0,
    {},
    [SHARED_COURSE_PATH],
    [STOREFRONT_COURSE_PATH, STOREFRONT_COURSE_PATH],
    "/courses",
    "/courses?courseId=",
    `/courses?courseId=${COURSE_ID.toUpperCase()}`,
    `/courses?courseId=${COURSE_ID.slice(1)}`,
    `/courses?courseId=${COURSE_ID}0`,
    `/courses?courseId=${COURSE_ID}&courseId=${COURSE_ID}`,
    `${SHARED_COURSE_PATH}&extra=1`,
    `/courses?extra=1&courseId=${COURSE_ID}`,
    `/courses?courseId=${COURSE_ID}&`,
    `/courses?%63ourseId=${COURSE_ID}`,
    `/courses?courseId=%36${COURSE_ID.slice(1)}`,
    `/courses?courseId[]=${COURSE_ID}`,
    `/courses?courseid=${COURSE_ID}`,
    `/courses/${COURSE_ID}`,
    `${SHARED_COURSE_PATH}#lesson`,
    ` ${SHARED_COURSE_PATH}`,
    `${SHARED_COURSE_PATH}\n`,
    `${SHARED_COURSE_PATH}\r`,
    `https://evil.example${SHARED_COURSE_PATH}`,
    `/${STOREFRONT_COURSE_PATH}`,
    `${STOREFRONT_COURSE_PATH}?next=/admin`,
    `${STOREFRONT_COURSE_PATH}#lesson`,
    `${STOREFRONT_COURSE_PATH}/`,
    `${STOREFRONT_COURSE_PATH}/../admin`,
    `${STOREFRONT_COURSE_PATH}\n`,
    STOREFRONT_COURSE_PATH.replace("growpathai", "GrowPathAI"),
    STOREFRONT_COURSE_PATH.replace("growpathai", "%67rowpathai"),
    STOREFRONT_COURSE_PATH.replace("growpathai", ".."),
    STOREFRONT_COURSE_PATH.replace("growpathai", "-store"),
    STOREFRONT_COURSE_PATH.replace("growpathai", "a".repeat(101)),
    STOREFRONT_COURSE_PATH.replace(COURSE_ID, COURSE_ID.toUpperCase()),
    STOREFRONT_COURSE_PATH.replace(COURSE_ID, "course-title"),
    STOREFRONT_COURSE_PATH.replace("/store/", "/storefront/"),
    STOREFRONT_COURSE_PATH.replace("/courses/", "\\courses\\"),
    "/home/personal/courses",
    "/admin"
  ])("rejects noncanonical public course continuation %p", (next) => {
    expect(parsePublicCourseReturnPath(next)).toBeNull();
    expect(parseSafeLoginReturnPath(next)).toBe("");
    expect(safeLoginPath("", next)).toBe("/login");
  });
});
