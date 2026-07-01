import { apiRequest } from "../apiRequest";
import { confirmEmailVerification, requestEmailVerification } from "../auth";

jest.mock("../apiRequest", () => ({
  apiRequest: jest.fn()
}));

const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

describe("email verification API wrappers", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
  });

  it("requests a verification email through the auth endpoint", async () => {
    mockApiRequest.mockResolvedValueOnce({
      ok: true,
      emailSent: true
    });

    await expect(requestEmailVerification("Grower@Example.com")).resolves.toEqual({
      ok: true,
      emailSent: true
    });

    expect(mockApiRequest).toHaveBeenCalledWith("/api/auth/verify-email/request", {
      method: "POST",
      auth: false,
      body: { email: "Grower@Example.com" }
    });
  });

  it("confirms a verification token through the auth endpoint", async () => {
    mockApiRequest.mockResolvedValueOnce({
      ok: true,
      user: {
        id: "user123",
        email: "grower@example.com",
        displayName: "Grower",
        role: "user",
        plan: "free",
        subscriptionStatus: "free",
        emailVerified: true
      }
    });

    await expect(confirmEmailVerification("token-123")).resolves.toEqual({
      ok: true,
      user: expect.objectContaining({
        email: "grower@example.com",
        emailVerified: true
      })
    });

    expect(mockApiRequest).toHaveBeenCalledWith("/api/auth/verify-email/confirm", {
      method: "POST",
      auth: false,
      body: { token: "token-123" }
    });
  });
});
