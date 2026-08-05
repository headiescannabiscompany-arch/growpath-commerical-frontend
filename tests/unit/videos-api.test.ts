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

  it("preserves uploaded video objects after ambiguous metadata failures", () => {
    const { isTerminalVideoMetadataError } = require("@/api/videos");

    expect(
      isTerminalVideoMetadataError(
        Object.assign(new Error("Unable to reach server"), {
          code: "NETWORK_ERROR",
          status: 0
        })
      )
    ).toBe(false);
    expect(isTerminalVideoMetadataError({ code: "TIMEOUT", status: 0 })).toBe(false);
    expect(isTerminalVideoMetadataError({ code: "SERVER_ERROR", status: 503 })).toBe(
      false
    );
    expect(isTerminalVideoMetadataError({ code: "VALIDATION", status: 422 })).toBe(true);
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
    await deleteVideo("video-1", "facility", "facility-1");

    expect(mockApiRequest).toHaveBeenNthCalledWith(1, "/api/videos", {
      method: "POST",
      body: { title: "Video", mediaSource: source }
    });
    expect(mockApiRequest).toHaveBeenNthCalledWith(2, "/api/videos/video-1", {
      method: "PATCH",
      body: { status: "published" }
    });
    expect(mockApiRequest).toHaveBeenNthCalledWith(3, "/api/videos/video-1", {
      method: "DELETE",
      params: { workspaceType: "facility", workspaceId: "facility-1" }
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
        progress,
        { clientUploadKey: "video-upload-1" }
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
        clientUploadKey: "video-upload-1",
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
        body: {
          workspaceType: "personal",
          clientUploadKey: "video-upload-1",
          parts: []
        }
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
          { workspaceType: "commercial" },
          () => undefined,
          { clientUploadKey: "video-upload-large" }
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
    expect(completion?.[1]?.body.clientUploadKey).toBe("video-upload-large");
  });

  it("retries an interrupted LTE video part with a fresh signed URL", async () => {
    const Platform = require("react-native").Platform;
    const originalPlatform = Platform.OS;
    Object.defineProperty(Platform, "OS", { configurable: true, value: "web" });
    const partSizeBytes = 10 * 1024 * 1024;
    const bytes = partSizeBytes * 2;
    const file = {
      size: bytes,
      slice: jest.fn((start: number, end: number) => ({ size: end - start }))
    };
    let partOneUrls = 0;
    let partOneUploads = 0;
    mockApiRequest.mockImplementation(async (path: string, options: any) => {
      if (path === "/api/videos/uploads/initiate") {
        return {
          assetId: "asset-lte",
          upload: { strategy: "multipart", totalParts: 2, partSizeBytes }
        };
      }
      if (path.endsWith("/part-url")) {
        const partNumber = Number(options.body.partNumber);
        if (partNumber === 1) partOneUrls += 1;
        return {
          url: `https://r2.example/part-${partNumber}-attempt-${
            partNumber === 1 ? partOneUrls : 1
          }`
        };
      }
      if (path.endsWith("/complete")) {
        return {
          assetId: "asset-lte",
          url: "/api/videos/uploads/asset-lte/object",
          bytes,
          mimeType: "video/mp4"
        };
      }
      throw new Error(`Unexpected API path ${path}`);
    });
    mockUploadBinary.mockImplementation(async (options) => {
      if (String(options.url).includes("part-1")) {
        partOneUploads += 1;
        if (partOneUploads === 1) {
          const error: any = new Error("LTE connection reset");
          error.code = "MEDIA_UPLOAD_NETWORK_ERROR";
          throw error;
        }
      }
      options.onProgress(1);
      const partNumber = String(options.url).includes("part-1") ? 1 : 2;
      return { status: 200, etag: `"${partNumber}"` };
    });
    const { uploadVideoFile } = require("@/api/videos");
    try {
      await expect(
        uploadVideoFile(
          {
            uri: "blob:lte-video",
            fileName: "plant-walk.mp4",
            fileSize: bytes,
            mimeType: "video/mp4",
            file
          },
          { workspaceType: "personal" },
          () => undefined,
          { clientUploadKey: "video-upload-lte" }
        )
      ).resolves.toMatchObject({ assetId: "asset-lte", bytes });
    } finally {
      Object.defineProperty(Platform, "OS", {
        configurable: true,
        value: originalPlatform
      });
    }

    expect(partOneUploads).toBe(2);
    expect(partOneUrls).toBe(2);
    const completion = mockApiRequest.mock.calls.find(([path]) =>
      String(path).endsWith("/complete")
    );
    expect(completion?.[1]?.body.parts).toEqual([
      { partNumber: 1, etag: '"1"' },
      { partNumber: 2, etag: '"2"' }
    ]);
  });

  it("uploads a native one-part multipart video from its whole file URI", async () => {
    const Platform = require("react-native").Platform;
    const originalPlatform = Platform.OS;
    Object.defineProperty(Platform, "OS", { configurable: true, value: "ios" });
    mockApiRequest.mockImplementation(async (path: string, options: any) => {
      if (path === "/api/videos/uploads/initiate") {
        return {
          assetId: "asset-native-one-part",
          url: "/api/videos/uploads/asset-native-one-part/object",
          upload: { strategy: "multipart", totalParts: 1, partSizeBytes: 2048 }
        };
      }
      if (path.endsWith("/part-url")) {
        return { url: "https://r2.example/native-part-1" };
      }
      if (path.endsWith("/complete")) {
        return {
          assetId: "asset-native-one-part",
          url: "/api/videos/uploads/asset-native-one-part/object",
          bytes: 2048,
          mimeType: "video/quicktime"
        };
      }
      throw new Error(`Unexpected API path ${path}`);
    });
    mockUploadBinary.mockImplementation(async (options) => {
      options.onProgress(1);
      return { status: 200, etag: '"native-video-part-1"' };
    });
    const { uploadVideoFile } = require("@/api/videos");
    try {
      await expect(
        uploadVideoFile(
          {
            uri: "file:///DCIM/plant-walk.mov",
            fileName: "plant-walk.mov",
            fileSize: 2048,
            mimeType: "video/quicktime"
          },
          { workspaceType: "facility", workspaceId: "facility-1" },
          () => undefined,
          { clientUploadKey: "native-video-key" }
        )
      ).resolves.toEqual({
        assetId: "asset-native-one-part",
        url: "/api/videos/uploads/asset-native-one-part/object",
        bytes: 2048,
        mimeType: "video/quicktime"
      });
    } finally {
      Object.defineProperty(Platform, "OS", {
        configurable: true,
        value: originalPlatform
      });
    }

    expect(mockApiRequest).toHaveBeenNthCalledWith(1, "/api/videos/uploads/initiate", {
      method: "POST",
      signal: undefined,
      body: {
        fileName: "plant-walk.mov",
        mimeType: "video/quicktime",
        bytes: 2048,
        supportsMultipart: false,
        clientUploadKey: "native-video-key",
        workspaceType: "facility",
        workspaceId: "facility-1"
      }
    });
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      2,
      "/api/videos/uploads/asset-native-one-part/part-url",
      {
        method: "POST",
        signal: undefined,
        body: {
          workspaceType: "facility",
          workspaceId: "facility-1",
          clientUploadKey: "native-video-key",
          partNumber: 1
        }
      }
    );
    expect(mockUploadBinary).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://r2.example/native-part-1",
        uri: "file:///DCIM/plant-walk.mov",
        body: undefined,
        mimeType: "video/quicktime"
      })
    );
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      3,
      "/api/videos/uploads/asset-native-one-part/complete",
      {
        method: "POST",
        signal: undefined,
        body: {
          workspaceType: "facility",
          workspaceId: "facility-1",
          clientUploadKey: "native-video-key",
          parts: [{ partNumber: 1, etag: '"native-video-part-1"' }]
        }
      }
    );
  });

  it("reuses an active video reservation without uploading or completing again", async () => {
    mockApiRequest.mockResolvedValueOnce({
      assetId: "asset-active",
      uploadStatus: "active",
      url: "/api/videos/uploads/asset-active/object",
      bytes: 2048,
      mimeType: "video/quicktime",
      upload: null
    });
    const { uploadVideoFile } = require("@/api/videos");
    const progress = jest.fn();

    await expect(
      uploadVideoFile(
        {
          uri: "file:///plant-walk.mov",
          fileName: "plant-walk.mov",
          fileSize: 2048,
          mimeType: "video/quicktime"
        },
        { workspaceType: "facility", workspaceId: "facility-1" },
        progress,
        { clientUploadKey: "stable-video-key" }
      )
    ).resolves.toEqual({
      assetId: "asset-active",
      url: "/api/videos/uploads/asset-active/object",
      bytes: 2048,
      mimeType: "video/quicktime"
    });
    expect(mockUploadBinary).not.toHaveBeenCalled();
    expect(mockApiRequest).toHaveBeenCalledTimes(1);
    expect(progress).toHaveBeenCalledWith(1);
  });

  it("keeps an ambiguous failed reservation for same-key retry", async () => {
    mockApiRequest.mockResolvedValueOnce({
      assetId: "asset-ambiguous",
      uploadStatus: "pending",
      upload: { strategy: "single", url: "https://r2.example/upload" }
    });
    mockUploadBinary.mockRejectedValueOnce(
      Object.assign(new Error("Unable to reach server"), { code: "NETWORK_ERROR" })
    );
    const { uploadVideoFile } = require("@/api/videos");

    await expect(
      uploadVideoFile(
        {
          uri: "file:///plant-walk.mov",
          fileSize: 2048,
          mimeType: "video/quicktime"
        },
        { workspaceType: "personal" },
        () => undefined,
        { clientUploadKey: "stable-retry-key" }
      )
    ).rejects.toMatchObject({ code: "NETWORK_ERROR" });

    expect(mockApiRequest).toHaveBeenCalledTimes(1);
    expect(mockApiRequest).not.toHaveBeenCalledWith(
      "/api/videos/uploads/asset-ambiguous",
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("bounds explicit video reservation cleanup and includes the stable key", async () => {
    mockApiRequest.mockResolvedValueOnce({ deleted: true });
    const { abortVideoUpload } = require("@/api/videos");

    await abortVideoUpload(
      "asset-cleanup",
      { workspaceType: "commercial", workspaceId: "brand-1" },
      { clientUploadKey: "stable-cleanup-key", timeoutMs: 3000 }
    );

    expect(mockApiRequest).toHaveBeenCalledWith("/api/videos/uploads/asset-cleanup", {
      method: "DELETE",
      signal: undefined,
      timeoutMs: 3000,
      body: {
        workspaceType: "commercial",
        workspaceId: "brand-1",
        clientUploadKey: "stable-cleanup-key"
      }
    });
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
