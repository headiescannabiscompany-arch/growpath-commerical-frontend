import {
  readAccountShopperContinuation,
  consumeAccountShopperContinuation,
  parseAccountShopperContinuation
} from "@/api/shopperContinuation";
const mockRequest = jest.fn();
const mockGetToken = jest.fn();
jest.mock("@/api/apiRequest", () => ({
  ...jest.requireActual("@/api/apiRequest"),
  apiRequest: (...args: any[]) => mockRequest(...args)
}));
jest.mock("@/auth/tokenStore", () => ({
  getToken: (...args: any[]) => mockGetToken(...args)
}));
function record(overrides = {}) {
  return {
    path: "/store/qa-store/products/6aa5967eb77d250e5aecf795",
    revision: "a".repeat(32),
    expiresAt: new Date(Date.now() + 60000).toISOString(),
    plan: "free" as const,
    mode: "personal" as const,
    ...overrides
  };
}
beforeEach(() => {
  jest.clearAllMocks();
  mockGetToken.mockResolvedValue("session-a");
});
it.each([
  {},
  { plan: "pro", mode: "personal" },
  { plan: "commercial", mode: "commercial" },
  { plan: "facility", mode: "facility" },
  { path: "/courses?courseId=6aa2f5c5d339157652995f10" },
  { path: "/store/qa-store/courses/6aa2f5c5d339157652995f10" }
])("accepts only a current canonical account navigation record %p", (overrides) => {
  const value = record(overrides);
  expect(parseAccountShopperContinuation(value)).toEqual(value);
});
it.each([
  { path: "https://elsewhere.test" },
  { path: "/claim-gift" },
  { path: "/home/facility" },
  { path: "/courses?courseId=6aa2f5c5d339157652995f10&buy=true" },
  { path: ["/courses"] },
  { revision: "A".repeat(32) },
  { revision: "a".repeat(32) + "\n" },
  { revision: "abc" },
  { plan: "admin" },
  { plan: "pro", mode: "facility" },
  { expiresAt: "not-a-date" },
  { expiresAt: "2000-01-01T00:00:00.000Z" },
  { expiresAt: "2999-01-01T00:00:00.000Z" },
  { extra: "private-field" }
])("rejects invalid server records %p", (overrides) =>
  expect(parseAccountShopperContinuation(record(overrides))).toBeNull()
);
it("binds a no-store read to the current exact token without retry or auth side effects", async () => {
  const value = record();
  mockRequest.mockResolvedValue({ continuation: value });
  await expect(readAccountShopperContinuation("session-a")).resolves.toEqual(value);
  expect(mockRequest).toHaveBeenCalledWith(
    "/api/auth/shopper-continuation",
    expect.objectContaining({
      method: "GET",
      headers: { Authorization: "Bearer session-a" },
      cache: "no-store",
      retries: 0,
      invalidateOn401: false,
      silent: true
    })
  );
});
it("sends only the captured revision on consume and verifies exact returned fields", async () => {
  const value = record();
  mockRequest.mockResolvedValue({ continuation: value });
  await expect(consumeAccountShopperContinuation(value, "session-a")).resolves.toEqual(
    value
  );
  expect(mockRequest).toHaveBeenCalledWith(
    "/api/auth/shopper-continuation/consume",
    expect.objectContaining({
      method: "POST",
      body: { revision: value.revision },
      retries: 0
    })
  );
  mockRequest.mockResolvedValue({
    continuation: record({ path: "/courses?courseId=6aa2f5c5d339157652995f10" })
  });
  await expect(consumeAccountShopperContinuation(value, "session-a")).resolves.toBeNull();
});
it("does not request under a replaced session", async () => {
  mockGetToken.mockResolvedValue("session-b");
  await expect(readAccountShopperContinuation("session-a")).rejects.toThrow(
    "ACCOUNT_SESSION_CHANGED"
  );
  expect(mockRequest).not.toHaveBeenCalled();
});
it("discards a result after the stored session changes", async () => {
  mockGetToken.mockResolvedValueOnce("session-a").mockResolvedValueOnce("session-b");
  mockRequest.mockResolvedValue({ continuation: record() });
  await expect(readAccountShopperContinuation("session-a")).rejects.toThrow(
    "ACCOUNT_SESSION_CHANGED"
  );
});
it("does not consume an expired snapshot", async () => {
  await expect(
    consumeAccountShopperContinuation(
      record({ expiresAt: "2000-01-01T00:00:00Z" }),
      "session-a"
    )
  ).resolves.toBeNull();
  expect(mockRequest).not.toHaveBeenCalled();
});
