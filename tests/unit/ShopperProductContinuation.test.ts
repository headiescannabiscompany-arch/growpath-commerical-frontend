import {
  consumeProductSignupContinuation,
  consumeShopperSignupContinuation,
  PRODUCT_SIGNUP_CONTINUATION_STORAGE_KEY as STORAGE_KEY,
  PRODUCT_SIGNUP_CONTINUATION_TTL_MS as TTL_MS,
  readProductSignupContinuation,
  readShopperSignupContinuation,
  rememberProductSignupContinuation,
  rememberShopperSignupContinuation,
  type ProductSignupContinuation,
  type ShopperSignupContinuation
} from "@/utils/shopperProductContinuation";

const originalWindow = (globalThis as any).window;
const NOW = 1800000000000;
const EMAIL = "shopper@example.com";
const PRODUCT = "/store/saved-store/products/6a90f76bf113936857750634";
const OTHER_PRODUCT = "/store/another-store/products/6aa5967eb77d250e5aecf795";
const SHARED_COURSE = "/courses?courseId=6aa2f5c5d339157652995f10";
const STOREFRONT_COURSE = "/store/saved-store/courses/6aa2f5c5d339157652995f10";
const COURSE_PATHS = [SHARED_COURSE, STOREFRONT_COURSE];
const CROSS_KIND_PATHS = COURSE_PATHS.flatMap((course) => [
  { previous: PRODUCT, next: course },
  { previous: course, next: PRODUCT }
]);
let localValues: Map<string, string>;
let randomSequence = 0;

function storage(values: Map<string, string>) {
  return {
    getItem: jest.fn((key: string) => values.get(key) ?? null),
    setItem: jest.fn((key: string, value: string) => values.set(key, value)),
    removeItem: jest.fn((key: string) => values.delete(key))
  };
}

function tab(values = localValues) {
  return {
    localStorage: storage(values),
    sessionStorage: storage(new Map()),
    crypto: {
      getRandomValues: jest.fn((values: Uint32Array) => {
        values.fill(++randomSequence);
        return values;
      })
    }
  };
}

function snapshot(): ProductSignupContinuation {
  const result = readProductSignupContinuation(EMAIL);
  expect(result).not.toBeNull();
  return result!;
}

function recordKey(record: ShopperSignupContinuation): string {
  return `${STORAGE_KEY}:${record.revision}`;
}

function shopperSnapshot(): ShopperSignupContinuation {
  const result = readShopperSignupContinuation(EMAIL);
  expect(result).not.toBeNull();
  return result!;
}

describe("product-only Free-signup continuation", () => {
  beforeEach(() => {
    localValues = new Map();
    randomSequence = 0;
    (globalThis as any).window = tab();
    jest.spyOn(Date, "now").mockReturnValue(NOW);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    (globalThis as any).window = originalWindow;
  });

  it("stores only a normalized email, canonical product, expiry and revision", () => {
    expect(rememberProductSignupContinuation(" Shopper@Example.COM ", PRODUCT)).toBe(
      true
    );
    const record = snapshot();
    expect(record).toEqual({
      version: 1,
      email: EMAIL,
      path: PRODUCT,
      expiresAt: NOW + TTL_MS,
      revision: expect.stringMatching(/^[a-f0-9]{32}$/)
    });
    expect([...localValues.keys()]).toEqual([recordKey(record), STORAGE_KEY]);
    expect(localValues.get(STORAGE_KEY)).toBe(record.revision);
    expect(JSON.parse(localValues.get(recordKey(record))!)).toEqual(record);
    expect(readProductSignupContinuation(" SHOPPER@example.com ")).toEqual(record);
    expect(readProductSignupContinuation(EMAIL)).toEqual(record);
    expect(window.sessionStorage.setItem).not.toHaveBeenCalled();
  });

  it("returns a detached snapshot and preserves other storage keys", () => {
    localValues.set("unrelated-existing-data", "keep");
    rememberProductSignupContinuation(EMAIL, PRODUCT);
    const first = snapshot();
    first.path = OTHER_PRODUCT;
    expect(snapshot().path).toBe(PRODUCT);
    expect(consumeProductSignupContinuation(first)).toBe(false);
    expect(localValues.get("unrelated-existing-data")).toBe("keep");
  });

  it.each([
    undefined,
    null,
    [],
    [PRODUCT],
    {},
    123,
    "",
    `https://evil.example${PRODUCT}`,
    `/${PRODUCT}`,
    `${PRODUCT}?next=/admin`,
    `${PRODUCT}#lesson`,
    `${PRODUCT}\n`,
    ` ${PRODUCT}`,
    `${PRODUCT}/`,
    PRODUCT.replace("saved-store", "Saved-Store"),
    PRODUCT.replace("saved-store", "%73aved-store"),
    PRODUCT.replace("6a90f76bf113936857750634", "product-title"),
    PRODUCT.replace("6a90f76bf113936857750634", "6A90F76BF113936857750634"),
    "/courses?courseId=6aa2f5c5d339157652995f10",
    "/store/saved-store/courses/6aa2f5c5d339157652995f10",
    "/claim-gift",
    "/claim-complimentary-access",
    "/account/gift-checkout/recover",
    "/offers?gift=1",
    "/home/commercial",
    "/home/facility"
  ])(
    "rejects invalid/non-product path %p without destroying the current record",
    (path) => {
      rememberProductSignupContinuation(EMAIL, PRODUCT);
      const existing = localValues.get(STORAGE_KEY);
      expect(rememberProductSignupContinuation(EMAIL, path)).toBe(false);
      expect(localValues.get(STORAGE_KEY)).toBe(existing);
      expect(window.localStorage.removeItem).not.toHaveBeenCalled();
    }
  );

  it.each([
    undefined,
    null,
    [EMAIL],
    {},
    123,
    "",
    "   ",
    "missing-at",
    "@example.com",
    "shopper@",
    "shopper@@example.com",
    "shop per@example.com",
    "shopper\u0000@example.com",
    `${"a".repeat(255)}@example.com`
  ])("rejects malformed email %p without changing storage", (email) => {
    rememberProductSignupContinuation(EMAIL, PRODUCT);
    const existing = localValues.get(STORAGE_KEY);
    expect(rememberProductSignupContinuation(email, PRODUCT)).toBe(false);
    expect(readProductSignupContinuation(email)).toBeNull();
    expect(localValues.get(STORAGE_KEY)).toBe(existing);
  });

  it("never clears a different account's continuation", () => {
    rememberProductSignupContinuation(EMAIL, PRODUCT);
    const existing = localValues.get(STORAGE_KEY);
    expect(readProductSignupContinuation("another@example.com")).toBeNull();
    expect(localValues.get(STORAGE_KEY)).toBe(existing);
    expect(window.localStorage.removeItem).not.toHaveBeenCalled();
  });

  it("allows one hour, rejects the exact expiry and does not consume expired data", () => {
    rememberProductSignupContinuation(EMAIL, PRODUCT);
    const record = snapshot();
    jest.spyOn(Date, "now").mockReturnValue(NOW + TTL_MS - 1);
    expect(readProductSignupContinuation(EMAIL)).toEqual(record);
    jest.spyOn(Date, "now").mockReturnValue(NOW + TTL_MS);
    expect(readProductSignupContinuation(EMAIL)).toBeNull();
    expect(consumeProductSignupContinuation(record)).toBe(false);
    expect(localValues.get(STORAGE_KEY)).toBe(record.revision);
    expect(localValues.get(recordKey(record))).toBe(JSON.stringify(record));
  });

  it.each([
    "not-json",
    "null",
    "[]",
    "123",
    "{}",
    JSON.stringify({ version: 1, token: "not-a-shopper-record" }),
    "x".repeat(1025)
  ])("ignores corrupt pointer %p without cleanup writes", (raw) => {
    localValues.set(STORAGE_KEY, raw);
    expect(readProductSignupContinuation(EMAIL)).toBeNull();
    expect(localValues.get(STORAGE_KEY)).toBe(raw);
    expect(window.localStorage.removeItem).not.toHaveBeenCalled();
  });

  it.each(["not-json", "null", "[]", "123", "{}", "x".repeat(1025)])(
    "ignores a corrupt pointed record %p without clearing the pointer",
    (raw) => {
      rememberProductSignupContinuation(EMAIL, PRODUCT);
      const record = snapshot();
      localValues.set(recordKey(record), raw);
      expect(readProductSignupContinuation(EMAIL)).toBeNull();
      expect(consumeProductSignupContinuation(record)).toBe(false);
      expect(localValues.get(STORAGE_KEY)).toBe(record.revision);
      expect(localValues.get(recordKey(record))).toBe(raw);
      expect(window.localStorage.removeItem).not.toHaveBeenCalled();
    }
  );

  it("does not follow a pointer to a record with a different valid revision", () => {
    rememberProductSignupContinuation(EMAIL, PRODUCT);
    const record = snapshot();
    localValues.set(
      recordKey(record),
      JSON.stringify({ ...record, revision: "f".repeat(32) })
    );
    expect(readProductSignupContinuation(EMAIL)).toBeNull();
    expect(consumeProductSignupContinuation(record)).toBe(false);
    expect(localValues.get(STORAGE_KEY)).toBe(record.revision);
  });

  it.each([
    { version: 2 },
    { email: "SHOPPER@example.com" },
    { email: [EMAIL] },
    { path: [PRODUCT] },
    { path: `${PRODUCT}?extra=1` },
    { expiresAt: String(NOW + TTL_MS) },
    { expiresAt: NOW },
    { expiresAt: NOW + TTL_MS + 1 },
    { expiresAt: NOW + 0.5 },
    { revision: "" },
    { revision: ["a".repeat(32)] },
    { revision: "A".repeat(32) },
    { token: "must-not-be-retained" }
  ])("rejects malformed or overlong-lived stored fields %p", (override) => {
    rememberProductSignupContinuation(EMAIL, PRODUCT);
    const record = snapshot();
    const raw = JSON.stringify({ ...record, ...override });
    localValues.set(recordKey(record), raw);
    expect(readProductSignupContinuation(EMAIL)).toBeNull();
    expect(localValues.get(recordKey(record))).toBe(raw);
    expect(localValues.get(STORAGE_KEY)).toBe(record.revision);
  });

  it("consumes an exact snapshot once, leaving the pointer and unrelated data", () => {
    localValues.set("unrelated-existing-data", "keep");
    rememberProductSignupContinuation(EMAIL, PRODUCT);
    const record = snapshot();
    expect(consumeProductSignupContinuation({ ...record })).toBe(true);
    expect(readProductSignupContinuation(EMAIL)).toBeNull();
    expect(consumeProductSignupContinuation(record)).toBe(false);
    expect(localValues.get("unrelated-existing-data")).toBe("keep");
    expect(localValues.get(STORAGE_KEY)).toBe(record.revision);
    expect(localValues.has(recordKey(record))).toBe(false);
    expect(window.localStorage.removeItem).toHaveBeenCalledTimes(1);
    expect(window.localStorage.removeItem).toHaveBeenCalledWith(recordKey(record));
  });

  it.each([
    { version: 2 },
    { email: "another@example.com" },
    { path: OTHER_PRODUCT },
    { expiresAt: NOW + TTL_MS - 1 },
    { revision: "f".repeat(32) }
  ])("requires every snapshot field to match before consumption: %p", (override) => {
    rememberProductSignupContinuation(EMAIL, PRODUCT);
    const existing = localValues.get(STORAGE_KEY);
    const changed = { ...snapshot(), ...override } as ProductSignupContinuation;
    expect(consumeProductSignupContinuation(changed)).toBe(false);
    expect(localValues.get(STORAGE_KEY)).toBe(existing);
  });

  it.each([null, undefined, [], {}, "not-a-snapshot"])(
    "fails safely for an invalid runtime snapshot %p",
    (value) => {
      rememberProductSignupContinuation(EMAIL, PRODUCT);
      const existing = localValues.get(STORAGE_KEY);
      expect(
        consumeProductSignupContinuation(value as unknown as ProductSignupContinuation)
      ).toBe(false);
      expect(localValues.get(STORAGE_KEY)).toBe(existing);
    }
  );

  it("does not consume a newer revision even when email, path and clock match", () => {
    rememberProductSignupContinuation(EMAIL, PRODUCT);
    const oldRecord = snapshot();
    rememberProductSignupContinuation(EMAIL, PRODUCT);
    const newRecord = snapshot();
    expect(newRecord.revision).not.toBe(oldRecord.revision);
    expect(newRecord.expiresAt).toBe(oldRecord.expiresAt);
    expect(consumeProductSignupContinuation(oldRecord)).toBe(false);
    expect(snapshot()).toEqual(newRecord);
    expect(consumeProductSignupContinuation(newRecord)).toBe(true);
  });

  it("rechecks the pointer if a replacement is remembered during record read", () => {
    rememberProductSignupContinuation(EMAIL, PRODUCT);
    const oldRecord = snapshot();
    let interleaved = false;
    (window.localStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      const raw = localValues.get(key) ?? null;
      if (key === recordKey(oldRecord) && !interleaved) {
        interleaved = true;
        expect(rememberProductSignupContinuation(EMAIL, OTHER_PRODUCT)).toBe(true);
      }
      return raw;
    });
    expect(consumeProductSignupContinuation(oldRecord)).toBe(false);
    expect(snapshot().path).toBe(OTHER_PRODUCT);
    expect(window.localStorage.removeItem).not.toHaveBeenCalledWith(STORAGE_KEY);
  });

  it("cannot erase a replacement remembered during the final removeItem call", () => {
    rememberProductSignupContinuation(EMAIL, PRODUCT);
    const oldRecord = snapshot();
    let interleaved = false;
    (window.localStorage.removeItem as jest.Mock).mockImplementation((key: string) => {
      if (key === recordKey(oldRecord) && !interleaved) {
        interleaved = true;
        expect(rememberProductSignupContinuation(EMAIL, OTHER_PRODUCT)).toBe(true);
      }
      localValues.delete(key);
    });

    expect(consumeProductSignupContinuation(oldRecord)).toBe(true);
    const replacement = snapshot();
    expect(replacement.path).toBe(OTHER_PRODUCT);
    expect(replacement.revision).not.toBe(oldRecord.revision);
    expect(localValues.get(STORAGE_KEY)).toBe(replacement.revision);
    expect(localValues.get(recordKey(replacement))).toBe(JSON.stringify(replacement));
    expect(window.localStorage.removeItem).not.toHaveBeenCalledWith(STORAGE_KEY);
    expect(window.localStorage.removeItem).not.toHaveBeenCalledWith(
      recordKey(replacement)
    );
  });

  it("bounds ordinary replacement storage to the pointer and latest record", () => {
    localValues.set("unrelated-existing-data", "keep");
    for (let index = 0; index < 12; index += 1) {
      expect(rememberProductSignupContinuation(EMAIL, PRODUCT)).toBe(true);
      const current = snapshot();
      expect([...localValues.keys()].sort()).toEqual(
        ["unrelated-existing-data", STORAGE_KEY, recordKey(current)].sort()
      );
    }
    expect(window.localStorage.removeItem).not.toHaveBeenCalledWith(STORAGE_KEY);
    expect(localValues.get("unrelated-existing-data")).toBe("keep");
  });

  it("rejects a random revision collision without overwriting the existing record", () => {
    rememberProductSignupContinuation(EMAIL, PRODUCT);
    const existing = new Map(localValues);
    (window.crypto.getRandomValues as jest.Mock).mockImplementation(
      (values: Uint32Array) => values.fill(1)
    );
    expect(rememberProductSignupContinuation(EMAIL, OTHER_PRODUCT)).toBe(false);
    expect(localValues).toEqual(existing);
  });

  it("cleans its unpublished record when the pointer write fails", () => {
    rememberProductSignupContinuation(EMAIL, PRODUCT);
    const existing = new Map(localValues);
    (window.localStorage.setItem as jest.Mock).mockImplementation(
      (key: string, value: string) => {
        if (key === STORAGE_KEY) throw new Error("pointer write denied");
        localValues.set(key, value);
      }
    );
    expect(rememberProductSignupContinuation(EMAIL, OTHER_PRODUCT)).toBe(false);
    expect(localValues).toEqual(existing);
    expect(snapshot().path).toBe(PRODUCT);
  });

  it("failed pointer publication cleans only its own record after a concurrent remember", () => {
    rememberProductSignupContinuation(EMAIL, PRODUCT);
    let interleaved = false;
    (window.localStorage.setItem as jest.Mock).mockImplementation(
      (key: string, value: string) => {
        if (key === STORAGE_KEY && !interleaved) {
          interleaved = true;
          expect(rememberProductSignupContinuation(EMAIL, OTHER_PRODUCT)).toBe(true);
          throw new Error("earlier pointer write failed");
        }
        localValues.set(key, value);
      }
    );
    expect(rememberProductSignupContinuation(EMAIL, PRODUCT)).toBe(false);
    const replacement = snapshot();
    expect(replacement.path).toBe(OTHER_PRODUCT);
    expect([...localValues.keys()].sort()).toEqual(
      [STORAGE_KEY, recordKey(replacement)].sort()
    );
    expect(window.localStorage.removeItem).not.toHaveBeenCalledWith(STORAGE_KEY);
  });

  it("keeps the new continuation usable if old-record cleanup is denied", () => {
    rememberProductSignupContinuation(EMAIL, PRODUCT);
    const oldRecord = snapshot();
    (window.localStorage.removeItem as jest.Mock).mockImplementation(() => {
      throw new Error("cleanup denied");
    });
    expect(rememberProductSignupContinuation(EMAIL, OTHER_PRODUCT)).toBe(true);
    const replacement = snapshot();
    expect(replacement.path).toBe(OTHER_PRODUCT);
    expect(localValues.has(recordKey(oldRecord))).toBe(true);
    expect(localValues.has(recordKey(replacement))).toBe(true);
  });

  it("reads across same-origin tabs without using tab session storage", () => {
    rememberProductSignupContinuation(EMAIL, PRODUCT);
    const firstRecord = snapshot();
    (globalThis as any).window = tab();
    expect(snapshot()).toEqual(firstRecord);
    expect(window.sessionStorage.getItem).not.toHaveBeenCalled();
    expect(window.sessionStorage.setItem).not.toHaveBeenCalled();
    expect(consumeProductSignupContinuation(firstRecord)).toBe(true);
    (globalThis as any).window = tab();
    expect(readProductSignupContinuation(EMAIL)).toBeNull();
  });

  it("does not cross browser/origin storage or fall back to native memory", () => {
    rememberProductSignupContinuation(EMAIL, PRODUCT);
    const record = snapshot();
    (globalThis as any).window = tab(new Map());
    expect(readProductSignupContinuation(EMAIL)).toBeNull();
    (globalThis as any).window = undefined;
    expect(rememberProductSignupContinuation(EMAIL, PRODUCT)).toBe(false);
    expect(readProductSignupContinuation(EMAIL)).toBeNull();
    expect(consumeProductSignupContinuation(record)).toBe(false);
    (globalThis as any).window = tab();
    expect(snapshot()).toEqual(record);
  });

  it("handles inaccessible localStorage without touching the existing record", () => {
    rememberProductSignupContinuation(EMAIL, PRODUCT);
    const record = snapshot();
    (globalThis as any).window = Object.defineProperty({}, "localStorage", {
      get() {
        throw new Error("storage denied");
      }
    });
    expect(rememberProductSignupContinuation(EMAIL, OTHER_PRODUCT)).toBe(false);
    expect(readProductSignupContinuation(EMAIL)).toBeNull();
    expect(consumeProductSignupContinuation(record)).toBe(false);
    expect(localValues.get(STORAGE_KEY)).toBe(record.revision);
    expect(localValues.get(recordKey(record))).toBe(JSON.stringify(record));
  });

  it.each(["getItem", "setItem", "removeItem"])(
    "fails safely when storage.%s throws",
    (method) => {
      rememberProductSignupContinuation(EMAIL, PRODUCT);
      const record = snapshot();
      const raw = localValues.get(STORAGE_KEY);
      (window.localStorage[method as keyof Storage] as jest.Mock).mockImplementation(
        () => {
          throw new Error("storage denied");
        }
      );
      if (method === "setItem") {
        expect(rememberProductSignupContinuation(EMAIL, OTHER_PRODUCT)).toBe(false);
      } else {
        if (method === "getItem") {
          expect(readProductSignupContinuation(EMAIL)).toBeNull();
        }
        expect(consumeProductSignupContinuation(record)).toBe(false);
      }
      expect(localValues.get(STORAGE_KEY)).toBe(raw);
    }
  );

  it("does not write when browser randomness is unavailable", () => {
    rememberProductSignupContinuation(EMAIL, PRODUCT);
    const raw = localValues.get(STORAGE_KEY);
    (globalThis as any).window.crypto = undefined;
    expect(rememberProductSignupContinuation(EMAIL, OTHER_PRODUCT)).toBe(false);
    expect(localValues.get(STORAGE_KEY)).toBe(raw);
  });
});

describe("product and course Free-signup continuation", () => {
  beforeEach(() => {
    localValues = new Map();
    randomSequence = 0;
    (globalThis as any).window = tab();
    jest.spyOn(Date, "now").mockReturnValue(NOW);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    (globalThis as any).window = originalWindow;
  });

  it("reads an existing five-field product record without migration or new storage", () => {
    const existing: ProductSignupContinuation = {
      version: 1,
      email: EMAIL,
      path: PRODUCT,
      expiresAt: NOW + TTL_MS,
      revision: "a".repeat(32)
    };
    localValues.set(STORAGE_KEY, existing.revision);
    localValues.set(recordKey(existing), JSON.stringify(existing));
    const before = new Map(localValues);
    expect(readShopperSignupContinuation(EMAIL)).toEqual(existing);
    expect(readProductSignupContinuation(EMAIL)).toEqual(existing);
    expect(localValues).toEqual(before);
    expect(window.localStorage.setItem).not.toHaveBeenCalled();
    expect(window.localStorage.removeItem).not.toHaveBeenCalled();
    expect(consumeShopperSignupContinuation(existing)).toBe(true);
    expect(readProductSignupContinuation(EMAIL)).toBeNull();
  });

  it("lets product and neutral APIs read and consume each other's product records", () => {
    expect(rememberProductSignupContinuation(EMAIL, PRODUCT)).toBe(true);
    const first = shopperSnapshot();
    expect(first).toEqual(snapshot());
    expect(consumeShopperSignupContinuation(first)).toBe(true);
    expect(rememberShopperSignupContinuation(EMAIL, OTHER_PRODUCT)).toBe(true);
    expect(snapshot()).toEqual(shopperSnapshot());
    expect(consumeProductSignupContinuation(shopperSnapshot())).toBe(true);
  });

  it.each(COURSE_PATHS)("stores the exact five-field course record for %s", (path) => {
    expect(rememberShopperSignupContinuation(" Shopper@Example.COM ", path)).toBe(true);
    const record = shopperSnapshot();
    expect(record).toEqual({
      version: 1,
      email: EMAIL,
      path,
      expiresAt: NOW + TTL_MS,
      revision: expect.stringMatching(/^[a-f0-9]{32}$/)
    });
    expect([...localValues.keys()]).toEqual([recordKey(record), STORAGE_KEY]);
    expect(localValues.get(STORAGE_KEY)).toBe(record.revision);
    expect(JSON.parse(localValues.get(recordKey(record))!)).toEqual(record);
    expect(readShopperSignupContinuation(" SHOPPER@example.com ")).toEqual(record);
    record.path = PRODUCT;
    expect(shopperSnapshot().path).toBe(path);
    expect(consumeShopperSignupContinuation(record)).toBe(false);
    expect(window.sessionStorage.setItem).not.toHaveBeenCalled();
  });

  it.each(COURSE_PATHS)(
    "keeps product wrappers from writing or consuming a course record: %s",
    (path) => {
      rememberShopperSignupContinuation(EMAIL, path);
      const record = shopperSnapshot();
      const before = new Map(localValues);
      jest.clearAllMocks();
      expect(rememberProductSignupContinuation(EMAIL, path)).toBe(false);
      expect(readProductSignupContinuation(EMAIL)).toBeNull();
      expect(consumeProductSignupContinuation(record)).toBe(false);
      expect(localValues).toEqual(before);
      expect(window.localStorage.setItem).not.toHaveBeenCalled();
      expect(window.localStorage.removeItem).not.toHaveBeenCalled();
      expect(readShopperSignupContinuation(EMAIL)).toEqual(record);
    }
  );

  it.each(COURSE_PATHS)(
    "keeps course inputs to product wrappers from altering a product record: %s",
    (path) => {
      rememberProductSignupContinuation(EMAIL, PRODUCT);
      const record = snapshot();
      const before = new Map(localValues);
      jest.clearAllMocks();
      expect(rememberProductSignupContinuation(EMAIL, path)).toBe(false);
      expect(consumeProductSignupContinuation({ ...record, path })).toBe(false);
      expect(localValues).toEqual(before);
      expect(window.localStorage.setItem).not.toHaveBeenCalled();
      expect(window.localStorage.removeItem).not.toHaveBeenCalled();
      expect(snapshot()).toEqual(record);
    }
  );

  it.each(COURSE_PATHS)("rejects the exact course expiry without cleanup: %s", (path) => {
    rememberShopperSignupContinuation(EMAIL, path);
    const record = shopperSnapshot();
    const before = new Map(localValues);
    jest.spyOn(Date, "now").mockReturnValue(NOW + TTL_MS - 1);
    expect(readShopperSignupContinuation(EMAIL)).toEqual(record);
    jest.spyOn(Date, "now").mockReturnValue(NOW + TTL_MS);
    expect(readShopperSignupContinuation(EMAIL)).toBeNull();
    expect(consumeShopperSignupContinuation(record)).toBe(false);
    expect(localValues).toEqual(before);
    expect(window.localStorage.removeItem).not.toHaveBeenCalled();
  });

  it.each(COURSE_PATHS)("requires the matching course signup email: %s", (path) => {
    rememberShopperSignupContinuation(EMAIL, path);
    const record = shopperSnapshot();
    const before = new Map(localValues);
    jest.clearAllMocks();
    for (const email of ["another@example.com", [EMAIL], null, "bad-email"]) {
      expect(readShopperSignupContinuation(email)).toBeNull();
    }
    expect(rememberShopperSignupContinuation([EMAIL], path)).toBe(false);
    expect(
      consumeShopperSignupContinuation({ ...record, email: "another@example.com" })
    ).toBe(false);
    expect(localValues).toEqual(before);
    expect(window.localStorage.setItem).not.toHaveBeenCalled();
    expect(window.localStorage.removeItem).not.toHaveBeenCalled();
  });

  it.each(COURSE_PATHS)("consumes a course once across same-origin tabs: %s", (path) => {
    rememberShopperSignupContinuation(EMAIL, path);
    const record = shopperSnapshot();
    (globalThis as any).window = tab();
    expect(shopperSnapshot()).toEqual(record);
    expect(consumeShopperSignupContinuation(record)).toBe(true);
    expect(consumeShopperSignupContinuation(record)).toBe(false);
    expect(localValues.get(STORAGE_KEY)).toBe(record.revision);
    expect(localValues.has(recordKey(record))).toBe(false);
    expect(window.sessionStorage.getItem).not.toHaveBeenCalled();
    expect(window.sessionStorage.setItem).not.toHaveBeenCalled();
    (globalThis as any).window = tab();
    expect(readShopperSignupContinuation(EMAIL)).toBeNull();
  });

  it.each(COURSE_PATHS)(
    "does not cross origins or fall back to native memory: %s",
    (path) => {
      rememberShopperSignupContinuation(EMAIL, path);
      const record = shopperSnapshot();
      const before = new Map(localValues);
      (globalThis as any).window = tab(new Map());
      expect(readShopperSignupContinuation(EMAIL)).toBeNull();
      expect(consumeShopperSignupContinuation(record)).toBe(false);
      (globalThis as any).window = undefined;
      expect(rememberShopperSignupContinuation(EMAIL, path)).toBe(false);
      expect(readShopperSignupContinuation(EMAIL)).toBeNull();
      expect(consumeShopperSignupContinuation(record)).toBe(false);
      expect(localValues).toEqual(before);
      (globalThis as any).window = tab();
      expect(shopperSnapshot()).toEqual(record);
    }
  );

  it.each(CROSS_KIND_PATHS)(
    "replaces $previous with $next at the same clock without consuming the new revision",
    ({ previous, next }) => {
      rememberShopperSignupContinuation(EMAIL, previous);
      const oldRecord = shopperSnapshot();
      expect(rememberShopperSignupContinuation(EMAIL, next)).toBe(true);
      const replacement = shopperSnapshot();
      expect(replacement.path).toBe(next);
      expect(replacement.expiresAt).toBe(oldRecord.expiresAt);
      expect(replacement.revision).not.toBe(oldRecord.revision);
      expect(consumeShopperSignupContinuation(oldRecord)).toBe(false);
      expect(shopperSnapshot()).toEqual(replacement);
      expect([...localValues.keys()].sort()).toEqual(
        [STORAGE_KEY, recordKey(replacement)].sort()
      );
      expect(window.localStorage.removeItem).not.toHaveBeenCalledWith(STORAGE_KEY);
    }
  );

  it.each(CROSS_KIND_PATHS)(
    "does not adopt $next if it replaces $previous during a snapshot read",
    ({ previous, next }) => {
      rememberShopperSignupContinuation(EMAIL, previous);
      const oldRecord = shopperSnapshot();
      let interleaved = false;
      (window.localStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        const raw = localValues.get(key) ?? null;
        if (key === recordKey(oldRecord) && !interleaved) {
          interleaved = true;
          expect(rememberShopperSignupContinuation(EMAIL, next)).toBe(true);
        }
        return raw;
      });
      expect(readShopperSignupContinuation(EMAIL)).toBeNull();
      expect(shopperSnapshot().path).toBe(next);
    }
  );

  it.each(CROSS_KIND_PATHS)(
    "does not consume $next if it replaces $previous during record validation",
    ({ previous, next }) => {
      rememberShopperSignupContinuation(EMAIL, previous);
      const oldRecord = shopperSnapshot();
      let interleaved = false;
      (window.localStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        const raw = localValues.get(key) ?? null;
        if (key === recordKey(oldRecord) && !interleaved) {
          interleaved = true;
          expect(rememberShopperSignupContinuation(EMAIL, next)).toBe(true);
        }
        return raw;
      });
      expect(consumeShopperSignupContinuation(oldRecord)).toBe(false);
      expect(shopperSnapshot().path).toBe(next);
      expect(window.localStorage.removeItem).not.toHaveBeenCalledWith(STORAGE_KEY);
    }
  );

  it.each(CROSS_KIND_PATHS)(
    "cannot erase $next remembered during the final removal of $previous",
    ({ previous, next }) => {
      rememberShopperSignupContinuation(EMAIL, previous);
      const oldRecord = shopperSnapshot();
      let interleaved = false;
      (window.localStorage.removeItem as jest.Mock).mockImplementation((key: string) => {
        if (key === recordKey(oldRecord) && !interleaved) {
          interleaved = true;
          expect(rememberShopperSignupContinuation(EMAIL, next)).toBe(true);
        }
        localValues.delete(key);
      });
      expect(consumeShopperSignupContinuation(oldRecord)).toBe(true);
      const replacement = shopperSnapshot();
      expect(replacement.path).toBe(next);
      expect(localValues.get(STORAGE_KEY)).toBe(replacement.revision);
      expect(localValues.get(recordKey(replacement))).toBe(JSON.stringify(replacement));
      expect(window.localStorage.removeItem).not.toHaveBeenCalledWith(STORAGE_KEY);
      expect(window.localStorage.removeItem).not.toHaveBeenCalledWith(
        recordKey(replacement)
      );
    }
  );

  it.each(CROSS_KIND_PATHS)(
    "failed publication of $previous cannot clear a concurrently remembered $next",
    ({ previous, next }) => {
      rememberShopperSignupContinuation(EMAIL, previous);
      let interleaved = false;
      (window.localStorage.setItem as jest.Mock).mockImplementation(
        (key: string, value: string) => {
          if (key === STORAGE_KEY && !interleaved) {
            interleaved = true;
            expect(rememberShopperSignupContinuation(EMAIL, next)).toBe(true);
            throw new Error("earlier pointer write failed");
          }
          localValues.set(key, value);
        }
      );
      expect(rememberShopperSignupContinuation(EMAIL, previous)).toBe(false);
      const replacement = shopperSnapshot();
      expect(replacement.path).toBe(next);
      expect([...localValues.keys()].sort()).toEqual(
        [STORAGE_KEY, recordKey(replacement)].sort()
      );
      expect(window.localStorage.removeItem).not.toHaveBeenCalledWith(STORAGE_KEY);
    }
  );

  it.each(COURSE_PATHS)(
    "rejects random collisions without altering a course: %s",
    (path) => {
      rememberShopperSignupContinuation(EMAIL, path);
      const before = new Map(localValues);
      (window.crypto.getRandomValues as jest.Mock).mockImplementation(
        (values: Uint32Array) => values.fill(1)
      );
      expect(rememberShopperSignupContinuation(EMAIL, PRODUCT)).toBe(false);
      expect(localValues).toEqual(before);
    }
  );

  it.each(
    COURSE_PATHS.flatMap((path) =>
      ["getItem", "setItem", "removeItem"].map((method) => ({ path, method }))
    )
  )("fails safely for course $path when storage.$method throws", ({ path, method }) => {
    rememberShopperSignupContinuation(EMAIL, path);
    const record = shopperSnapshot();
    const before = new Map(localValues);
    (window.localStorage[method as keyof Storage] as jest.Mock).mockImplementation(() => {
      throw new Error("storage denied");
    });
    if (method === "setItem") {
      expect(rememberShopperSignupContinuation(EMAIL, PRODUCT)).toBe(false);
    } else {
      if (method === "getItem") expect(readShopperSignupContinuation(EMAIL)).toBeNull();
      expect(consumeShopperSignupContinuation(record)).toBe(false);
    }
    expect(localValues).toEqual(before);
  });

  it.each(COURSE_PATHS)(
    "preserves a course when storage or randomness is inaccessible: %s",
    (path) => {
      rememberShopperSignupContinuation(EMAIL, path);
      const record = shopperSnapshot();
      const before = new Map(localValues);
      (globalThis as any).window.crypto = undefined;
      expect(rememberShopperSignupContinuation(EMAIL, PRODUCT)).toBe(false);
      expect(localValues).toEqual(before);
      (globalThis as any).window = Object.defineProperty({}, "localStorage", {
        get() {
          throw new Error("storage denied");
        }
      });
      expect(rememberShopperSignupContinuation(EMAIL, PRODUCT)).toBe(false);
      expect(readShopperSignupContinuation(EMAIL)).toBeNull();
      expect(consumeShopperSignupContinuation(record)).toBe(false);
      expect(localValues).toEqual(before);
    }
  );

  it.each(
    [
      [SHARED_COURSE],
      [STOREFRONT_COURSE, STOREFRONT_COURSE],
      `${SHARED_COURSE}&extra=1`,
      `${STOREFRONT_COURSE}\n`,
      `${PRODUCT}\n`,
      " /courses?courseId=6aa2f5c5d339157652995f10",
      "/claim-gift",
      "/claim-complimentary-access",
      "/offers?gift=1",
      "/account/gift-checkout/recover",
      "/home/facility"
    ].map((path) => ({ path }))
  )(
    "rejects noncanonical stored/input shopper paths without mutation: $path",
    ({ path }) => {
      rememberShopperSignupContinuation(EMAIL, STOREFRONT_COURSE);
      const record = shopperSnapshot();
      const before = new Map(localValues);
      jest.clearAllMocks();
      expect(rememberShopperSignupContinuation(EMAIL, path)).toBe(false);
      expect(localValues).toEqual(before);
      const malformed = { ...record, path } as ShopperSignupContinuation;
      localValues.set(recordKey(record), JSON.stringify(malformed));
      expect(readShopperSignupContinuation(EMAIL)).toBeNull();
      expect(consumeShopperSignupContinuation(malformed)).toBe(false);
      expect(localValues.get(recordKey(record))).toBe(JSON.stringify(malformed));
      expect(localValues.get(STORAGE_KEY)).toBe(record.revision);
      expect(window.localStorage.setItem).not.toHaveBeenCalled();
      expect(window.localStorage.removeItem).not.toHaveBeenCalled();
    }
  );
});
