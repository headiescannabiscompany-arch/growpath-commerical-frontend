import {
  browserComplimentaryClaimToken,
  clearComplimentaryClaimToken,
  COMPLIMENTARY_CLAIM_CONTINUATION_STORAGE_KEY,
  COMPLIMENTARY_CLAIM_TOKEN_STORAGE_KEY,
  hasPendingComplimentaryClaimContinuation,
  normalizeComplimentaryClaimToken,
  readComplimentaryClaimToken,
  scrubComplimentaryClaimTokenFromUrl,
  writeComplimentaryClaimToken
} from "@/utils/complimentaryClaimTokenStore";

const originalWindow = (globalThis as any).window;

describe("complimentary claim token storage", () => {
  beforeEach(async () => {
    (globalThis as any).window = undefined;
    await clearComplimentaryClaimToken();
  });

  afterAll(() => {
    (globalThis as any).window = originalWindow;
  });

  it("accepts one bounded opaque token and rejects ambiguous or URL-shaped values", () => {
    expect(normalizeComplimentaryClaimToken("  opaque.token_1-abc  ")).toBe(
      "opaque.token_1-abc"
    );
    expect(normalizeComplimentaryClaimToken(["one-token"])).toBe("one-token");
    expect(normalizeComplimentaryClaimToken(["one-token", "second-token"])).toBe("");
    expect(normalizeComplimentaryClaimToken("token with space")).toBe("");
    expect(normalizeComplimentaryClaimToken("token?redirect=evil")).toBe("");
    expect(normalizeComplimentaryClaimToken("https://evil.example/token")).toBe("");
    expect(normalizeComplimentaryClaimToken("x".repeat(513))).toBe("");
  });

  it("persists and clears the token without putting it into navigation state", async () => {
    await expect(writeComplimentaryClaimToken("stored-token")).resolves.toBe(true);
    await expect(readComplimentaryClaimToken()).resolves.toBe("stored-token");

    await clearComplimentaryClaimToken();

    await expect(readComplimentaryClaimToken()).resolves.toBe("");
  });

  it("reads a single fragment token and scrubs query and fragment secrets", async () => {
    const sessionValues = new Map<string, string>();
    const localValues = new Map<string, string>();
    const replaceState = jest.fn();
    (globalThis as any).window = {
      history: { replaceState, state: null },
      location: {
        hash: "#token=fragment-token",
        pathname: "/claim-complimentary-access",
        search: "?campaign=welcome&token=query-token"
      },
      sessionStorage: {
        getItem: (key: string) => sessionValues.get(key) ?? null,
        removeItem: (key: string) => sessionValues.delete(key),
        setItem: (key: string, value: string) => sessionValues.set(key, value)
      },
      localStorage: {
        getItem: (key: string) => localValues.get(key) ?? null,
        removeItem: (key: string) => localValues.delete(key),
        setItem: (key: string, value: string) => localValues.set(key, value)
      }
    };

    expect(browserComplimentaryClaimToken()).toBe("fragment-token");
    await writeComplimentaryClaimToken(browserComplimentaryClaimToken());
    scrubComplimentaryClaimTokenFromUrl();

    expect(replaceState).toHaveBeenCalledWith(
      null,
      "",
      "/claim-complimentary-access?campaign=welcome"
    );
    expect(JSON.stringify(replaceState.mock.calls)).not.toContain("fragment-token");
    expect(JSON.stringify(replaceState.mock.calls)).not.toContain("query-token");
    await expect(readComplimentaryClaimToken()).resolves.toBe("fragment-token");
  });

  it("resumes once across a new browser tab with separate session storage", async () => {
    const localValues = new Map<string, string>();
    const firstSession = new Map<string, string>();
    const secondSession = new Map<string, string>();
    const thirdSession = new Map<string, string>();
    const storage = (values: Map<string, string>) => ({
      getItem: (key: string) => values.get(key) ?? null,
      removeItem: (key: string) => values.delete(key),
      setItem: (key: string, value: string) => values.set(key, value)
    });
    const tab = (sessionValues: Map<string, string>) => ({
      location: { hash: "", pathname: "/claim-complimentary-access", search: "" },
      sessionStorage: storage(sessionValues),
      localStorage: storage(localValues)
    });

    (globalThis as any).window = tab(firstSession);
    await writeComplimentaryClaimToken("cross-tab-token");
    expect(firstSession.get(COMPLIMENTARY_CLAIM_TOKEN_STORAGE_KEY)).toBe(
      "cross-tab-token"
    );
    expect(hasPendingComplimentaryClaimContinuation()).toBe(true);

    (globalThis as any).window = tab(secondSession);
    await expect(readComplimentaryClaimToken()).resolves.toBe("cross-tab-token");
    expect(secondSession.get(COMPLIMENTARY_CLAIM_TOKEN_STORAGE_KEY)).toBe(
      "cross-tab-token"
    );
    expect(localValues.has(COMPLIMENTARY_CLAIM_CONTINUATION_STORAGE_KEY)).toBe(false);

    (globalThis as any).window = tab(thirdSession);
    await expect(readComplimentaryClaimToken()).resolves.toBe("");
  });

  it("expires an abandoned cross-tab continuation", () => {
    const localValues = new Map<string, string>([
      [
        COMPLIMENTARY_CLAIM_CONTINUATION_STORAGE_KEY,
        JSON.stringify({ version: 1, token: "expired-token", expiresAt: Date.now() - 1 })
      ]
    ]);
    (globalThis as any).window = {
      localStorage: {
        getItem: (key: string) => localValues.get(key) ?? null,
        removeItem: (key: string) => localValues.delete(key),
        setItem: (key: string, value: string) => localValues.set(key, value)
      }
    };

    expect(hasPendingComplimentaryClaimContinuation()).toBe(false);
    expect(localValues.has(COMPLIMENTARY_CLAIM_CONTINUATION_STORAGE_KEY)).toBe(false);
  });

  it("rejects duplicate fragment parameters", () => {
    (globalThis as any).window = {
      location: {
        hash: "#token=first&token=second",
        pathname: "/claim-complimentary-access",
        search: ""
      }
    };

    expect(browserComplimentaryClaimToken()).toBe("");
  });
});
