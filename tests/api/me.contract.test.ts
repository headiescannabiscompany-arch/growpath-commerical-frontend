import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { apiRequest } from "../../src/api/apiRequest";
import { getToken } from "../../src/auth/tokenStore";
import { apiMe } from "../../src/api/me";

jest.mock("../../src/api/apiRequest", () => ({
  apiRequest: jest.fn()
}));

jest.mock("../../src/auth/tokenStore", () => ({
  getToken: jest.fn()
}));

const mockApiRequest = jest.mocked(apiRequest);
const mockGetToken = jest.mocked(getToken);

describe("apiMe contract normalization", () => {
  let tokenSeq = 0;

  beforeEach(() => {
    jest.resetAllMocks();
    tokenSeq += 1;
    mockGetToken.mockResolvedValue(`token-${tokenSeq}`);
  });

  it("accepts canonical direct shape { user, ctx }", async () => {
    mockApiRequest.mockResolvedValue({
      user: { id: "u1", email: "u1@example.com", emailVerified: true },
      ctx: { mode: "personal", capabilities: {}, limits: {} }
    });

    const me = await apiMe();

    expect(me.user.id).toBe("u1");
    expect(me.user.emailVerified).toBe(true);
    expect(me.ctx.mode).toBe("personal");
    expect(mockApiRequest).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        cache: "no-store",
        invalidateOn401: true
      })
    );
    expect(mockApiRequest.mock.calls[0]?.[1]).not.toHaveProperty("headers");
  });

  it("accepts enveloped shape { success, data: { user, ctx } }", async () => {
    mockApiRequest.mockResolvedValue({
      success: true,
      data: {
        user: { id: "u2", email: "u2@example.com" },
        ctx: { mode: "facility", capabilities: {}, limits: {}, facilityId: "f1" }
      }
    });

    const me = await apiMe();

    expect(me.user.id).toBe("u2");
    expect(me.ctx.mode).toBe("facility");
    expect(me.ctx.facilityId).toBe("f1");
  });

  it("bypasses the short session cache when a canonical refresh is forced", async () => {
    mockApiRequest
      .mockResolvedValueOnce({
        user: { id: "u-cache", email: "cache@example.com" },
        ctx: { mode: "personal", capabilities: {}, limits: {} }
      })
      .mockResolvedValueOnce({
        user: { id: "u-cache", email: "cache@example.com" },
        ctx: {
          mode: "personal",
          capabilities: {},
          limits: {},
          facilityId: "facility-new",
          facilityRole: "STAFF"
        }
      });

    await apiMe();
    const refreshed = await apiMe({ force: true });

    expect(mockApiRequest).toHaveBeenCalledTimes(2);
    expect(refreshed.ctx.facilityId).toBe("facility-new");
  });

  it("does not let an older in-flight session response overwrite a forced refresh", async () => {
    let resolveStale: ((value: any) => void) | undefined;
    mockApiRequest
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveStale = resolve;
          })
      )
      .mockResolvedValueOnce({
        user: { id: "u-race", email: "race@example.com" },
        ctx: {
          mode: "personal",
          capabilities: {},
          limits: {},
          facilityId: "facility-current",
          facilityRole: "STAFF"
        }
      });

    const staleRequest = apiMe();
    await Promise.resolve();
    const refreshed = await apiMe({ force: true });
    resolveStale?.({
      user: { id: "u-race", email: "race@example.com" },
      ctx: { mode: "personal", capabilities: {}, limits: {} }
    });
    await staleRequest;
    const cached = await apiMe();

    expect(refreshed.ctx.facilityId).toBe("facility-current");
    expect(cached.ctx.facilityId).toBe("facility-current");
    expect(mockApiRequest).toHaveBeenCalledTimes(2);
  });

  it("throws on invalid shape", async () => {
    mockApiRequest.mockResolvedValue({ success: true, data: {} });

    await expect(apiMe()).rejects.toThrow("INVALID_ME_RESPONSE_SHAPE");
  });

  it("rejects the obsolete { user, session, entitlements } shape", async () => {
    mockApiRequest.mockResolvedValue({
      user: { id: "u3", email: "u3@example.com" },
      session: { mode: "commercial", plan: "commercial" },
      entitlements: { capabilities: {}, limits: {} }
    });

    await expect(apiMe()).rejects.toThrow("INVALID_ME_RESPONSE_SHAPE");
  });
});
