import {
  buildClaimReturnPath,
  claimLoginPath,
  giftClaimTokenFromFragment,
  normalizeGiftClaimToken,
  parseClaimReturnPath,
  scrubGiftClaimTokenFromBrowserUrl
} from "@/utils/claimReturnPath";

describe("claim return paths", () => {
  it("canonicalizes valid current and legacy claim paths without exposing the token", () => {
    expect(buildClaimReturnPath(" gift.token_123 ")).toBe("/claim-gift");
    expect(parseClaimReturnPath("/claim-gift")).toBe("/claim-gift");
    expect(parseClaimReturnPath("/claim-gift?token=gift.token_123")).toBe("/claim-gift");
  });

  it("rejects alternate routes, extra parameters, fragments, and unsafe token text", () => {
    expect(parseClaimReturnPath("https://evil.example/claim-gift?token=abc")).toBe("");
    expect(parseClaimReturnPath("/claim-gift?token=abc&next=/admin")).toBe("");
    expect(parseClaimReturnPath("/claim-gift?token=abc#fragment")).toBe("");
    expect(normalizeGiftClaimToken("abc def")).toBe("");
  });

  it("extracts a strict fragment token", () => {
    expect(giftClaimTokenFromFragment("#token=gift.token_123")).toBe("gift.token_123");
    expect(giftClaimTokenFromFragment("#?token=gift-token-2")).toBe("gift-token-2");
    expect(giftClaimTokenFromFragment("#token=abc&next=/admin")).toBe("");
  });

  it("only forwards a tokenless validated claim path to login", () => {
    const loginPath = claimLoginPath(
      " Friend@Example.com ",
      "/claim-gift?token=secret-token"
    );
    expect(loginPath).toBe("/login?email=friend%40example.com&next=%2Fclaim-gift");
    expect(loginPath).not.toContain("secret-token");
    expect(claimLoginPath("", "/admin")).toBe("/login");
  });

  it("scrubs query and fragment tokens from the visible browser URL", () => {
    const originalWindow = (globalThis as any).window;
    const replaceState = jest.fn();
    (globalThis as any).window = {
      history: { replaceState, state: { navigation: true } },
      location: {
        hash: "#token=fragment-secret",
        pathname: "/claim-gift",
        search: "?token=query-secret&source=email"
      }
    };

    try {
      scrubGiftClaimTokenFromBrowserUrl();
      expect(replaceState).toHaveBeenCalledWith(
        { navigation: true },
        "",
        "/claim-gift?source=email"
      );
      expect(replaceState.mock.calls[0][2]).not.toContain("secret");
    } finally {
      (globalThis as any).window = originalWindow;
    }
  });
});
