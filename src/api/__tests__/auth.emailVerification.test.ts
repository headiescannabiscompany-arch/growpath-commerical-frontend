import { apiRequest } from "../apiRequest";
import {
  confirmEmailVerification,
  forgotPassword,
  requestEmailVerification,
  resetPassword
} from "../auth";

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

  it("requests password reset instructions through the auth endpoint", async () => {
    mockApiRequest.mockResolvedValueOnce({
      ok: true,
      message: "If an account exists, password reset instructions will be sent.",
      emailSent: true
    });

    await expect(forgotPassword("grower@example.com")).resolves.toEqual({
      ok: true,
      message: "If an account exists, password reset instructions will be sent.",
      emailSent: true
    });

    expect(mockApiRequest).toHaveBeenCalledWith("/api/auth/forgot-password", {
      method: "POST",
      auth: false,
      body: expect.objectContaining({ email: "grower@example.com" })
    });
  });

  it("resets a password through the auth endpoint", async () => {
    mockApiRequest.mockResolvedValueOnce({ ok: true });

    await expect(resetPassword("reset-token", "new-password")).resolves.toEqual({
      ok: true
    });

    expect(mockApiRequest).toHaveBeenCalledWith("/api/auth/reset-password", {
      method: "POST",
      auth: false,
      body: { token: "reset-token", password: "new-password" }
    });
  });
});
