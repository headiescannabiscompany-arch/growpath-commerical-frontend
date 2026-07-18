import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { getToken } from "../../src/auth/tokenStore";
import { apiRequest, setOnUnauthorized } from "../../src/api/apiRequest";

jest.mock("../../src/auth/tokenStore", () => ({
  getToken: jest.fn()
}));

const mockGetToken = jest.mocked(getToken);

describe("apiRequest authentication contract", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockGetToken.mockResolvedValue("stored-token");
  });

  afterEach(() => {
    setOnUnauthorized(null);
  });

  it("adds the persisted token to authenticated requests", async () => {
    global.fetch = jest.fn(async (_url: string, options: any) => ({
      ok: true,
      text: async () => JSON.stringify({ authorization: options.headers.Authorization })
    })) as any;

    await expect(apiRequest("/api/test")).resolves.toEqual({
      authorization: "Bearer stored-token"
    });
  });

  it("does not replace an explicitly supplied lowercase authorization header", async () => {
    global.fetch = jest.fn(async (_url: string, options: any) => ({
      ok: true,
      text: async () => JSON.stringify(options.headers)
    })) as any;

    await expect(
      apiRequest("/api/test", { headers: { authorization: "Custom token" } })
    ).resolves.toEqual({ authorization: "Custom token" });
  });

  it("preserves a feature 401 without invalidating the session", async () => {
    const onUnauthorized = jest.fn(async () => {});
    setOnUnauthorized(onUnauthorized);
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 401,
      headers: { get: () => "request-401" },
      text: async () =>
        JSON.stringify({ code: "TOKEN_EXPIRED", message: "Session expired." })
    })) as any;

    await expect(apiRequest("/api/test")).rejects.toMatchObject({
      code: "TOKEN_EXPIRED",
      message: "Session expired.",
      requestId: "request-401",
      status: 401
    });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it("invalidates the session when the canonical session check opts in", async () => {
    const onUnauthorized = jest.fn(async () => {});
    setOnUnauthorized(onUnauthorized);
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 401,
      headers: { get: () => "request-401" },
      text: async () =>
        JSON.stringify({ code: "TOKEN_EXPIRED", message: "Session expired." })
    })) as any;

    await expect(apiRequest("/api/me", { invalidateOn401: true })).rejects.toMatchObject({
      code: "TOKEN_EXPIRED",
      requestId: "request-401",
      status: 401
    });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it("preserves 403 permission messages without logging out", async () => {
    const onUnauthorized = jest.fn(async () => {});
    setOnUnauthorized(onUnauthorized);
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 403,
      headers: { get: () => "request-403" },
      text: async () =>
        JSON.stringify({
          error: {
            code: "FACILITY_ROLE_REQUIRED",
            message: "Manager access required."
          }
        })
    })) as any;

    await expect(apiRequest("/api/test")).rejects.toMatchObject({
      code: "FACILITY_ROLE_REQUIRED",
      message: "Manager access required.",
      requestId: "request-403",
      status: 403
    });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});
