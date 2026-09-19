import { completeAgeAssurance } from "@/api/auth";
import { ApiError, apiRequest } from "@/api/apiRequest";
import { getToken } from "@/auth/tokenStore";

jest.mock("@/api/apiRequest", () => ({
  ...jest.requireActual("@/api/apiRequest"),
  apiRequest: jest.fn()
}));
jest.mock("@/auth/tokenStore", () => ({ getToken: jest.fn() }));

describe("Age completion request", () => {
  beforeEach(() => jest.clearAllMocks());

  it("pins the reviewed account token and sends only date and explicit confirmation", async () => {
    (getToken as jest.Mock).mockResolvedValue("reviewed-session");
    (apiRequest as jest.Mock).mockResolvedValue({ ok: true });
    await completeAgeAssurance(
      { dateOfBirth: "1990-02-14", confirmed: true },
      "reviewed-session"
    );
    expect(apiRequest).toHaveBeenCalledWith("/api/me/age-assurance", {
      method: "POST",
      headers: { Authorization: "Bearer reviewed-session" },
      body: { dateOfBirth: "1990-02-14", confirmed: true },
      retries: 0
    });
  });

  it("sends no DOB when the active account has changed", async () => {
    (getToken as jest.Mock).mockResolvedValue("other-session");
    await expect(
      completeAgeAssurance(
        { dateOfBirth: "1990-02-14", confirmed: true },
        "reviewed-session"
      )
    ).rejects.toMatchObject({ code: "ACCOUNT_SESSION_CHANGED" });
    expect(apiRequest).not.toHaveBeenCalled();
    expect(ApiError).toBeDefined();
  });
});
