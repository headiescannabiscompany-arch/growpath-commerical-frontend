const mockApiRequest = jest.fn();
const mockUploadBinary = jest.fn();

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args),
  uploadBinaryToSignedUrl: (...args: any[]) => mockUploadBinary(...args)
}));

describe("shared video API", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
    mockUploadBinary.mockReset();
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

  it("uploads and verifies a protected single-file video", async () => {
    mockApiRequest
      .mockResolvedValueOnce({
        assetId: "asset-1",
        url: "/api/videos/uploads/asset-1/object",
        upload: { strategy: "single", url: "https://r2.example/upload" }
      })
      .mockResolvedValueOnce({
        assetId: "asset-1",
        url: "/api/videos/uploads/asset-1/object",
        bytes: 1024,
        mimeType: "video/mp4"
      });
    mockUploadBinary.mockImplementation(async (options) => {
      options.onProgress(1);
      return { status: 200, etag: '"single"' };
    });
    const { uploadVideoFile } = require("@/api/videos");
    const progress = jest.fn();

    await expect(
      uploadVideoFile(
        {
          uri: "file:///training.mp4",
          fileName: "training.mp4",
          fileSize: 1024,
          mimeType: "video/mp4"
        },
        { workspaceType: "personal" },
        progress
      )
    ).resolves.toEqual({
      assetId: "asset-1",
      url: "/api/videos/uploads/asset-1/object",
      bytes: 1024,
      mimeType: "video/mp4"
    });
    expect(mockApiRequest).toHaveBeenNthCalledWith(1, "/api/videos/uploads/initiate", {
      method: "POST",
      body: {
        fileName: "training.mp4",
        mimeType: "video/mp4",
        bytes: 1024,
        supportsMultipart: false,
        workspaceType: "personal"
      }
    });
    expect(mockUploadBinary).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://r2.example/upload",
        uri: "file:///training.mp4",
        mimeType: "video/mp4"
      })
    );
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      2,
      "/api/videos/uploads/asset-1/complete",
      {
        method: "POST",
        body: { workspaceType: "personal", parts: [] }
      }
    );
    expect(progress).toHaveBeenLastCalledWith(1);
  });

  it("uploads large web videos in confirmed multipart chunks", async () => {
    const Platform = require("react-native").Platform;
    const originalPlatform = Platform.OS;
    Object.defineProperty(Platform, "OS", { configurable: true, value: "web" });
    const bytes = 120 * 1024 * 1024;
    const partSizeBytes = 40 * 1024 * 1024;
    const file = {
      size: bytes,
      slice: jest.fn((start: number, end: number) => ({
        size: end - start
      }))
    };
    mockApiRequest.mockImplementation(async (path: string, options: any) => {
      if (path === "/api/videos/uploads/initiate") {
        return {
          assetId: "asset-large",
          url: "/api/videos/uploads/asset-large/object",
          upload: { strategy: "multipart", totalParts: 3, partSizeBytes }
        };
      }
      if (path.endsWith("/part-url")) {
        return { url: `https://r2.example/part-${options.body.partNumber}` };
      }
      if (path.endsWith("/complete")) {
        return {
          assetId: "asset-large",
          url: "/api/videos/uploads/asset-large/object",
          bytes,
          mimeType: "video/mp4"
        };
      }
      throw new Error(`Unexpected API path ${path}`);
    });
    mockUploadBinary.mockImplementation(async (options) => {
      options.onProgress(1);
      return {
        status: 200,
        etag: `"${String(options.url).split("-").pop()}"`
      };
    });
    const { uploadVideoFile } = require("@/api/videos");
    try {
      await expect(
        uploadVideoFile(
          {
            uri: "blob:large-video",
            fileName: "large-video.mp4",
            fileSize: bytes,
            mimeType: "video/mp4",
            file
          },
          { workspaceType: "commercial" }
        )
      ).resolves.toMatchObject({
        assetId: "asset-large",
        bytes,
        mimeType: "video/mp4"
      });
    } finally {
      Object.defineProperty(Platform, "OS", {
        configurable: true,
        value: originalPlatform
      });
    }

    expect(file.slice).toHaveBeenCalledTimes(3);
    expect(mockUploadBinary).toHaveBeenCalledTimes(3);
    const completion = mockApiRequest.mock.calls.find(([path]) =>
      String(path).endsWith("/complete")
    );
    expect(completion?.[1]?.body.parts).toEqual([
      { partNumber: 1, etag: '"1"' },
      { partNumber: 2, etag: '"2"' },
      { partNumber: 3, etag: '"3"' }
    ]);
  });

  it("gets a short-lived protected playback URL", async () => {
    mockApiRequest.mockResolvedValue({
      playbackUrl: "https://r2.example/play",
      expiresInSeconds: 3600
    });
    const { getVideoPlayback } = require("@/api/videos");

    await expect(getVideoPlayback("video-1", "facility", "facility-1")).resolves.toEqual({
      playbackUrl: "https://r2.example/play",
      expiresInSeconds: 3600
    });
    expect(mockApiRequest).toHaveBeenCalledWith("/api/videos/video-1/playback", {
      params: { workspaceType: "facility", workspaceId: "facility-1" },
      invalidateOn401: false
    });
  });
});
