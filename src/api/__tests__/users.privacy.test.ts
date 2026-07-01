import { apiRequest } from "../apiRequest";
import routes from "../routes";
import { deleteAccount, exportPrivacyData } from "../users";

jest.mock("../apiRequest", () => ({
  apiRequest: jest.fn()
}));

const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

describe("user privacy API wrappers", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
  });

  it("exports account data through the account release endpoint", async () => {
    mockApiRequest.mockResolvedValueOnce({
      exportedAt: "2026-07-01T00:00:00.000Z",
      user: { email: "grower@example.com" }
    });

    await expect(exportPrivacyData()).resolves.toEqual({
      exportedAt: "2026-07-01T00:00:00.000Z",
      user: { email: "grower@example.com" }
    });

    expect(routes.PRIVACY.EXPORT).toBe("/api/account/export");
    expect(mockApiRequest).toHaveBeenCalledWith("/api/account/export", {
      method: "GET"
    });
  });

  it("deletes an account through the account release endpoint with a reason", async () => {
    mockApiRequest.mockResolvedValueOnce({
      ok: true,
      deleted: true
    });

    await expect(deleteAccount("profile_delete_confirmation")).resolves.toEqual({
      ok: true,
      deleted: true
    });

    expect(routes.PRIVACY.DELETE_ACCOUNT).toBe("/api/account/delete");
    expect(mockApiRequest).toHaveBeenCalledWith("/api/account/delete", {
      method: "DELETE",
      body: { reason: "profile_delete_confirmation" }
    });
  });
});
