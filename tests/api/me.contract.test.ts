import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { apiMe } from "../../src/api/me";

const mockApiRequest = jest.fn();
const mockGetToken = jest.fn();

jest.mock("../../src/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

jest.mock("../../src/auth/tokenStore", () => ({
  getToken: (...args: any[]) => mockGetToken(...args)
}));

describe("apiMe contract normalization", () => {
  let tokenSeq = 0;

  beforeEach(() => {
    jest.resetAllMocks();
    tokenSeq += 1;
    mockGetToken.mockResolvedValue(`token-${tokenSeq}`);
  });

  it("accepts canonical direct shape { user, ctx }", async () => {
    mockApiRequest.mockResolvedValue({
      user: { id: "u1", email: "u1@example.com" },
      ctx: { mode: "personal", capabilities: {}, limits: {} }
    });

    const me = await apiMe();

    expect(me.user.id).toBe("u1");
    expect(me.ctx.mode).toBe("personal");
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

  it("throws on invalid shape", async () => {
    mockApiRequest.mockResolvedValue({ success: true, data: {} });

    await expect(apiMe()).rejects.toThrow("INVALID_ME_RESPONSE_SHAPE");
  });
});
