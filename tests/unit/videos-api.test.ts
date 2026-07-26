const mockApiRequest = jest.fn();

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

describe("shared video API", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
  });

  it("searches accessible videos through Discover", async () => {
    mockApiRequest.mockResolvedValue({
      videos: [{ id: "video-1", title: "Tomato pruning" }]
    });
    const { searchVideos } = require("@/api/videos");

    await expect(
      searchVideos({ q: "tomato", sort: "popular", limit: 12, followingOnly: true })
    ).resolves.toEqual([{ id: "video-1", title: "Tomato pruning" }]);
    expect(mockApiRequest).toHaveBeenCalledWith("/api/videos/discover", {
      params: { q: "tomato", sort: "popular", limit: 12, followingOnly: true },
      invalidateOn401: false
    });
  });

  it("loads the selected workspace library and quota", async () => {
    mockApiRequest.mockResolvedValue({
      videos: [{ id: "video-1" }],
      quota: { usedBytes: 10, limitBytes: 100 },
      permissions: { canUpload: true, canPublish: true, canManage: true }
    });
    const { listVideoLibrary } = require("@/api/videos");

    await expect(listVideoLibrary("facility", "facility-1")).resolves.toMatchObject({
      videos: [{ id: "video-1" }],
      quota: { usedBytes: 10, limitBytes: 100 }
    });
    expect(mockApiRequest).toHaveBeenCalledWith("/api/videos", {
      params: { workspaceType: "facility", workspaceId: "facility-1" }
    });
  });

  it("creates, updates, and removes reusable video records", async () => {
    const source = {
      sourceType: "growpath_upload",
      canonicalUrl: "/uploads/video.mp4"
    };
    mockApiRequest
      .mockResolvedValueOnce({ video: { id: "video-1" } })
      .mockResolvedValueOnce({ video: { id: "video-1", status: "published" } })
      .mockResolvedValueOnce({ deleted: true });
    const { createVideo, deleteVideo, updateVideo } = require("@/api/videos");

    await createVideo({ title: "Video", mediaSource: source });
    await updateVideo("video-1", { status: "published" });
    await deleteVideo("video-1");

    expect(mockApiRequest).toHaveBeenNthCalledWith(1, "/api/videos", {
      method: "POST",
      body: { title: "Video", mediaSource: source }
    });
    expect(mockApiRequest).toHaveBeenNthCalledWith(2, "/api/videos/video-1", {
      method: "PATCH",
      body: { status: "published" }
    });
    expect(mockApiRequest).toHaveBeenNthCalledWith(3, "/api/videos/video-1", {
      method: "DELETE"
    });
  });
});
