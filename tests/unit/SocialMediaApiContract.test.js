import apiClient from "@/api/apiClient.js";
import {
  EXTERNAL_POST_SCHEDULING_AVAILABLE,
  SOCIAL_ROUTES,
  connectSocialAccount,
  disconnectSocialAccount,
  getSocialAccounts,
  getSocialMetrics,
  schedulePost,
  syncSocialData
} from "@/api/socialMedia.js";

jest.mock("@/api/apiClient.js", () => ({
  get: jest.fn(),
  post: jest.fn()
}));

describe("external channel API contract", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    apiClient.get.mockResolvedValue({ data: [] });
    apiClient.post.mockResolvedValue({ data: {} });
  });

  it("uses the backend's mounted platform and metrics routes", async () => {
    await getSocialAccounts();
    await getSocialMetrics("YouTube");
    await syncSocialData("YouTube");
    await connectSocialAccount("YouTube", "token", "key");
    await disconnectSocialAccount("YouTube");

    expect(apiClient.get).toHaveBeenNthCalledWith(1, "/api/social/platforms");
    expect(apiClient.get).toHaveBeenNthCalledWith(2, "/api/social/metrics/YouTube");
    expect(apiClient.post).toHaveBeenNthCalledWith(
      1,
      "/api/social/platforms/YouTube/sync"
    );
    expect(apiClient.post).toHaveBeenNthCalledWith(
      2,
      "/api/social/platforms/YouTube/connect",
      { accessToken: "token", apiKey: "key" }
    );
    expect(apiClient.post).toHaveBeenNthCalledWith(
      3,
      "/api/social/platforms/YouTube/disconnect"
    );
    expect(SOCIAL_ROUTES.GET_ACCOUNTS).toBe("/api/social/platforms");
  });

  it("does not pretend provider scheduling exists", async () => {
    expect(EXTERNAL_POST_SCHEDULING_AVAILABLE).toBe(false);
    await expect(schedulePost(["youtube"], "Hello", undefined)).rejects.toThrow(
      "not configured"
    );
    expect(apiClient.post).not.toHaveBeenCalled();
  });
});
