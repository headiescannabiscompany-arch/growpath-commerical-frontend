const mockApiRequest = jest.fn();
const mockUploadBinaryToSignedUrl = jest.fn();
const mockPrepareEvidenceImageForUpload = jest.fn();
const mockPrepareNativeEvidenceImageForUpload = jest.fn();
const mockDiscardPreparedNativeEvidenceImage = jest.fn();
const mockUriToBlob = jest.fn();

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args),
  uploadBinaryToSignedUrl: (...args: any[]) => mockUploadBinaryToSignedUrl(...args)
}));

jest.mock("@/api/uriToBlob", () => ({
  uriToBlob: (...args: any[]) => mockUriToBlob(...args)
}));

jest.mock("@/utils/evidenceImageUpload", () => ({
  prepareEvidenceImageForUpload: (...args: any[]) =>
    mockPrepareEvidenceImageForUpload(...args),
  prepareNativeEvidenceImageForUpload: (...args: any[]) =>
    mockPrepareNativeEvidenceImageForUpload(...args),
  discardPreparedNativeEvidenceImage: (...args: any[]) =>
    mockDiscardPreparedNativeEvidenceImage(...args)
}));

describe("uploads API", () => {
  const platform = require("react-native").Platform;
  const originalPlatformOs = platform.OS;

  beforeEach(() => {
    jest.resetAllMocks();
    Object.defineProperty(platform, "OS", {
      configurable: true,
      value: originalPlatformOs
    });
    mockApiRequest.mockResolvedValue({ url: "/uploads/lesson.pdf" });
  });

  afterAll(() => {
    Object.defineProperty(platform, "OS", {
      configurable: true,
      value: originalPlatformOs
    });
  });

  it("uploads course media to the course media endpoint", async () => {
    const { uploadCourseMedia } = require("@/api/uploads");

    const result = await uploadCourseMedia(
      {
        uri: "file:///tmp/lesson.pdf",
        name: "lesson.pdf",
        mimeType: "application/pdf"
      },
      {
        purpose: "video",
        workspaceType: "facility",
        workspaceId: "facility-1"
      }
    );

    expect(mockApiRequest).toHaveBeenCalledWith("/api/uploads/course-media", {
      method: "POST",
      body: expect.any(FormData)
    });
    const formData = mockApiRequest.mock.calls[0][1].body;
    const parts = formData?._parts || Array.from(formData?.entries?.() || []);
    expect(parts).toEqual(
      expect.arrayContaining([
        ["purpose", "video"],
        ["workspaceType", "facility"],
        ["workspaceId", "facility-1"]
      ])
    );
    expect(result).toEqual({ url: "/uploads/lesson.pdf" });
  });

  it("uploads an SOP document to the selected Facility endpoint", async () => {
    mockApiRequest.mockResolvedValue({
      success: true,
      asset: {
        assetId: "asset-1",
        url: "/uploads/room-opening.pdf",
        filename: "room-opening.pdf",
        mimeType: "application/pdf",
        bytes: 1024
      }
    });
    const { uploadSopDocument } = require("@/api/uploads");

    const result = await uploadSopDocument("facility-1", {
      uri: "file:///tmp/room-opening.pdf",
      name: "room-opening.pdf",
      mimeType: "application/pdf"
    });

    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/facilities/facility-1/sop-documents",
      {
        method: "POST",
        body: expect.any(FormData)
      }
    );
    expect(result).toEqual(
      expect.objectContaining({
        assetId: "asset-1",
        filename: "room-opening.pdf"
      })
    );
  });

  it("uploads a prepared evidence photo through protected storage", async () => {
    Object.defineProperty(platform, "OS", {
      configurable: true,
      value: "web"
    });
    const originalBlob = new Blob(["original photo"], { type: "image/heic" });
    const preparedBlob = new Blob(["prepared jpeg"], { type: "image/jpeg" });
    const signal = new AbortController().signal;
    mockUriToBlob.mockResolvedValue(originalBlob);
    mockPrepareEvidenceImageForUpload.mockResolvedValue({
      blob: preparedBlob,
      fileName: "roadside-plant.jpg",
      mimeType: "image/jpeg",
      originalBytes: 7 * 1024 * 1024,
      uploadBytes: 4 * 1024 * 1024,
      optimized: true
    });
    mockApiRequest
      .mockResolvedValueOnce({
        assetId: "asset-photo-1",
        uploadStatus: "pending",
        upload: {
          strategy: "multipart",
          partSizeBytes: 4 * 1024 * 1024,
          totalParts: 1,
          parts: [
            {
              partNumber: 1,
              url: "https://r2.example/evidence-photo",
              expiresInSeconds: 900
            }
          ]
        }
      })
      .mockResolvedValueOnce({
        assetId: "asset-photo-1",
        uploadStatus: "active",
        url: "/api/evidence-assets/uploads/asset-photo-1/object",
        bytes: 4 * 1024 * 1024,
        mimeType: "image/jpeg"
      });
    mockUploadBinaryToSignedUrl.mockResolvedValue({
      status: 200,
      etag: '"photo-part-1"'
    });
    const { uploadEvidenceMedia } = require("@/api/uploads");
    const progress = jest.fn();

    const result = await uploadEvidenceMedia({
      uri: "blob:roadside-plant",
      name: "roadside-plant.heic",
      mimeType: "image/heic",
      signal,
      clientUploadKey: "plant-id-photo-local-1",
      workspaceType: "facility",
      workspaceId: "facility-1",
      facilityId: "facility-1",
      onProgress: progress
    });

    expect(mockUriToBlob).toHaveBeenCalledWith("blob:roadside-plant", {
      signal,
      timeoutMs: 30000
    });
    expect(mockPrepareEvidenceImageForUpload).toHaveBeenCalledWith(
      originalBlob,
      "roadside-plant.heic",
      { signal }
    );
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      1,
      "/api/evidence-assets/uploads/initiate",
      {
        method: "POST",
        signal,
        timeoutMs: 45000,
        body: {
          clientUploadKey: "plant-id-photo-local-1",
          workspaceType: "facility",
          workspaceId: "facility-1",
          facilityId: "facility-1",
          fileName: "roadside-plant.jpg",
          mimeType: "image/jpeg",
          bytes: 4 * 1024 * 1024
        }
      }
    );
    expect(mockUploadBinaryToSignedUrl).toHaveBeenCalledWith({
      url: "https://r2.example/evidence-photo",
      uri: undefined,
      body: preparedBlob,
      mimeType: "image/jpeg",
      signal,
      onProgress: progress
    });
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      2,
      "/api/evidence-assets/uploads/asset-photo-1/complete",
      {
        method: "POST",
        signal,
        timeoutMs: 45000,
        body: {
          clientUploadKey: "plant-id-photo-local-1",
          workspaceType: "facility",
          workspaceId: "facility-1",
          facilityId: "facility-1",
          parts: [{ partNumber: 1, etag: '"photo-part-1"' }]
        }
      }
    );
    expect(result).toEqual({
      assetId: "asset-photo-1",
      uploadStatus: "active",
      url: "/api/evidence-assets/uploads/asset-photo-1/object",
      mimeType: "image/jpeg",
      fileName: "roadside-plant.jpg",
      bytes: 4 * 1024 * 1024,
      originalBytes: 7 * 1024 * 1024,
      optimized: true
    });
  });

  it("reuses an already active protected evidence photo without uploading again", async () => {
    Object.defineProperty(platform, "OS", {
      configurable: true,
      value: "web"
    });
    const photoBlob = new Blob(["prepared photo"], { type: "image/jpeg" });
    const signal = new AbortController().signal;
    mockPrepareEvidenceImageForUpload.mockResolvedValue({
      blob: photoBlob,
      fileName: "existing-photo.jpg",
      mimeType: "image/jpeg",
      originalBytes: photoBlob.size,
      uploadBytes: photoBlob.size,
      optimized: false
    });
    mockApiRequest.mockResolvedValue({
      assetId: "asset-existing",
      uploadStatus: "active",
      url: "/api/evidence-assets/uploads/asset-existing/object",
      bytes: photoBlob.size,
      mimeType: "image/jpeg"
    });
    const { uploadEvidenceMedia } = require("@/api/uploads");

    await expect(
      uploadEvidenceMedia({
        uri: "blob:existing-photo",
        file: photoBlob,
        name: "existing-photo.jpg",
        mimeType: "image/jpeg",
        signal,
        clientUploadKey: "plant-id-photo-local-existing",
        workspaceType: "commercial",
        workspaceId: "commercial-1"
      })
    ).resolves.toMatchObject({
      assetId: "asset-existing",
      uploadStatus: "active",
      url: "/api/evidence-assets/uploads/asset-existing/object"
    });

    expect(mockApiRequest).toHaveBeenCalledTimes(1);
    expect(mockApiRequest).toHaveBeenCalledWith("/api/evidence-assets/uploads/initiate", {
      method: "POST",
      signal,
      timeoutMs: 45000,
      body: {
        clientUploadKey: "plant-id-photo-local-existing",
        workspaceType: "commercial",
        workspaceId: "commercial-1",
        facilityId: undefined,
        fileName: "existing-photo.jpg",
        mimeType: "image/jpeg",
        bytes: photoBlob.size
      }
    });
    expect(mockUploadBinaryToSignedUrl).not.toHaveBeenCalled();
  });

  it("finishes an older single-strategy photo reservation without inventing an ETag", async () => {
    Object.defineProperty(platform, "OS", {
      configurable: true,
      value: "web"
    });
    const photoBlob = new Blob(["prepared photo"], { type: "image/jpeg" });
    mockPrepareEvidenceImageForUpload.mockResolvedValue({
      blob: photoBlob,
      fileName: "legacy-photo.jpg",
      mimeType: "image/jpeg",
      originalBytes: photoBlob.size,
      uploadBytes: photoBlob.size,
      optimized: false
    });
    mockApiRequest
      .mockResolvedValueOnce({
        assetId: "asset-legacy-single",
        uploadStatus: "pending",
        upload: { strategy: "single", url: "https://r2.example/legacy-photo" }
      })
      .mockResolvedValueOnce({
        assetId: "asset-legacy-single",
        uploadStatus: "active",
        url: "/api/evidence-assets/uploads/asset-legacy-single/object",
        bytes: photoBlob.size,
        mimeType: "image/jpeg"
      });
    mockUploadBinaryToSignedUrl.mockResolvedValue({ status: 200, etag: "" });
    const { uploadEvidenceMedia } = require("@/api/uploads");

    await uploadEvidenceMedia({
      uri: "blob:legacy-photo",
      file: photoBlob,
      name: "legacy-photo.jpg",
      mimeType: "image/jpeg",
      clientUploadKey: "legacy-photo-key",
      workspaceType: "personal"
    });

    expect(mockApiRequest).toHaveBeenNthCalledWith(
      2,
      "/api/evidence-assets/uploads/asset-legacy-single/complete",
      expect.objectContaining({
        body: expect.objectContaining({
          clientUploadKey: "legacy-photo-key",
          workspaceType: "personal",
          parts: []
        })
      })
    );
  });

  it("uploads the prepared native JPEG URI and removes only its cache copy", async () => {
    Object.defineProperty(platform, "OS", {
      configurable: true,
      value: "ios"
    });
    const signal = new AbortController().signal;
    mockPrepareNativeEvidenceImageForUpload.mockResolvedValue({
      uri: "file:///cache/native-field-photo.jpg",
      fileName: "native-field-photo.jpg",
      mimeType: "image/jpeg",
      originalBytes: 8 * 1024 * 1024,
      uploadBytes: 4 * 1024 * 1024,
      optimized: true
    });
    mockApiRequest
      .mockResolvedValueOnce({
        assetId: "asset-native-photo",
        uploadStatus: "pending",
        upload: {
          strategy: "multipart",
          partSizeBytes: 4 * 1024 * 1024,
          totalParts: 1,
          parts: [
            {
              partNumber: 1,
              url: "https://r2.example/native-photo",
              expiresInSeconds: 900
            }
          ]
        }
      })
      .mockResolvedValueOnce({
        assetId: "asset-native-photo",
        uploadStatus: "active",
        url: "/api/evidence-assets/uploads/asset-native-photo/object",
        bytes: 4 * 1024 * 1024,
        mimeType: "image/jpeg"
      });
    mockUploadBinaryToSignedUrl.mockResolvedValue({
      status: 200,
      etag: '"native-photo-part-1"'
    });
    const { uploadEvidenceMedia } = require("@/api/uploads");

    await uploadEvidenceMedia({
      uri: "file:///DCIM/native-field-photo.HEIC",
      name: "native-field-photo.HEIC",
      mimeType: "image/heic",
      fileSizeBytes: 8 * 1024 * 1024,
      width: 6000,
      height: 4000,
      signal,
      clientUploadKey: "native-photo-key",
      workspaceType: "personal"
    });

    expect(mockPrepareNativeEvidenceImageForUpload).toHaveBeenCalledWith(
      {
        uri: "file:///DCIM/native-field-photo.HEIC",
        fileName: "native-field-photo.HEIC",
        mimeType: "image/heic",
        fileSizeBytes: 8 * 1024 * 1024,
        width: 6000,
        height: 4000
      },
      { signal }
    );
    expect(mockUploadBinaryToSignedUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        uri: "file:///cache/native-field-photo.jpg",
        mimeType: "image/jpeg",
        body: undefined,
        signal
      })
    );
    expect(mockDiscardPreparedNativeEvidenceImage).toHaveBeenCalledWith(
      "file:///cache/native-field-photo.jpg"
    );
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      2,
      "/api/evidence-assets/uploads/asset-native-photo/complete",
      {
        method: "POST",
        signal,
        timeoutMs: 45000,
        body: {
          clientUploadKey: "native-photo-key",
          workspaceType: "personal",
          workspaceId: undefined,
          facilityId: undefined,
          parts: [{ partNumber: 1, etag: '"native-photo-part-1"' }]
        }
      }
    );
  });

  it("does not complete a multipart photo when storage omits its ETag", async () => {
    Object.defineProperty(platform, "OS", {
      configurable: true,
      value: "web"
    });
    const photoBlob = new Blob(["prepared photo"], { type: "image/jpeg" });
    mockPrepareEvidenceImageForUpload.mockResolvedValue({
      blob: photoBlob,
      fileName: "plant.jpg",
      mimeType: "image/jpeg",
      originalBytes: photoBlob.size,
      uploadBytes: photoBlob.size,
      optimized: false
    });
    mockApiRequest.mockResolvedValueOnce({
      assetId: "asset-missing-etag",
      uploadStatus: "pending",
      upload: {
        strategy: "multipart",
        partSizeBytes: photoBlob.size,
        totalParts: 1,
        parts: [{ partNumber: 1, url: "https://r2.example/missing-etag" }]
      }
    });
    mockUploadBinaryToSignedUrl.mockResolvedValue({ status: 200, etag: "" });
    const { uploadEvidenceMedia } = require("@/api/uploads");

    await expect(
      uploadEvidenceMedia({
        uri: "blob:plant",
        file: photoBlob,
        name: "plant.jpg",
        mimeType: "image/jpeg",
        clientUploadKey: "photo-missing-etag",
        workspaceType: "personal"
      })
    ).rejects.toThrow(
      "Protected storage did not confirm the photo upload. Check R2 CORS ETag exposure."
    );
    expect(mockApiRequest).toHaveBeenCalledTimes(1);
  });

  it("requires a stable client upload key before creating protected photo storage", async () => {
    Object.defineProperty(platform, "OS", {
      configurable: true,
      value: "web"
    });
    const photoBlob = new Blob(["photo"], { type: "image/jpeg" });
    mockPrepareEvidenceImageForUpload.mockResolvedValue({
      blob: photoBlob,
      fileName: "plant.jpg",
      mimeType: "image/jpeg",
      originalBytes: photoBlob.size,
      uploadBytes: photoBlob.size,
      optimized: false
    });
    const { uploadEvidenceMedia } = require("@/api/uploads");

    await expect(
      uploadEvidenceMedia({
        uri: "blob:plant",
        file: photoBlob,
        name: "plant.jpg",
        mimeType: "image/jpeg"
      })
    ).rejects.toThrow("A stable evidence upload key is required.");
    expect(mockApiRequest).not.toHaveBeenCalled();
    expect(mockUploadBinaryToSignedUrl).not.toHaveBeenCalled();
  });

  it("deletes an incomplete protected evidence photo in its workspace", async () => {
    mockApiRequest.mockResolvedValue({ deleted: true });
    const { abortEvidenceUpload } = require("@/api/uploads");

    await expect(
      abortEvidenceUpload("asset/photo 1", {
        workspaceType: "facility",
        workspaceId: "facility-1",
        facilityId: "facility-1"
      })
    ).resolves.toEqual({ deleted: true });
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/evidence-assets/uploads/asset%2Fphoto%201/object",
      {
        method: "DELETE",
        timeoutMs: 45000,
        params: {
          workspaceType: "facility",
          workspaceId: "facility-1",
          facilityId: "facility-1"
        }
      }
    );
  });

  it("does not call the protected delete endpoint without an asset id", async () => {
    const { abortEvidenceUpload } = require("@/api/uploads");

    await expect(abortEvidenceUpload(null)).resolves.toBeNull();
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("rejects videos so they cannot bypass the protected video workflow", async () => {
    Object.defineProperty(platform, "OS", {
      configurable: true,
      value: "web"
    });
    const signal = new AbortController().signal;
    const { uploadEvidenceMedia } = require("@/api/uploads");

    await expect(
      uploadEvidenceMedia({
        uri: "blob:plant-walk",
        name: "plant-walk.mp4",
        mimeType: "video/mp4",
        signal
      })
    ).rejects.toThrow(
      "Evidence videos must use GrowPath's protected video upload workflow."
    );

    expect(mockUriToBlob).not.toHaveBeenCalled();
    expect(mockPrepareEvidenceImageForUpload).not.toHaveBeenCalled();
    expect(mockApiRequest).not.toHaveBeenCalled();
  });
});

describe("uriToBlob terminal file reads", () => {
  const originalXmlHttpRequest = global.XMLHttpRequest;
  let xhr: {
    open: jest.Mock;
    send: jest.Mock;
    abort: jest.Mock;
    responseType: XMLHttpRequestResponseType;
    timeout: number;
    status: number;
    response: Blob | null;
    onload: null | (() => void);
    onerror: null | (() => void);
    onabort: null | (() => void);
    ontimeout: null | (() => void);
  };

  beforeEach(() => {
    xhr = {
      open: jest.fn(),
      send: jest.fn(),
      abort: jest.fn(() => xhr.onabort?.()),
      responseType: "",
      timeout: 0,
      status: 0,
      response: null,
      onload: null,
      onerror: null,
      onabort: null,
      ontimeout: null
    };
    Object.defineProperty(global, "XMLHttpRequest", {
      configurable: true,
      writable: true,
      value: jest.fn(() => xhr)
    });
  });

  afterAll(() => {
    Object.defineProperty(global, "XMLHttpRequest", {
      configurable: true,
      writable: true,
      value: originalXmlHttpRequest
    });
  });

  it("terminates a stalled local file read with a timeout error", async () => {
    const { uriToBlob } = jest.requireActual("@/api/uriToBlob");

    const read = uriToBlob("blob:slow-photo", { timeoutMs: 30000 });
    const rejection = expect(read).rejects.toMatchObject({
      code: "TIMEOUT",
      message: "Reading the selected file timed out."
    });

    expect(xhr.timeout).toBe(30000);
    xhr.ontimeout?.();
    await rejection;
  });

  it("cancels an in-progress local file read with the caller signal", async () => {
    const { uriToBlob } = jest.requireActual("@/api/uriToBlob");
    const controller = new AbortController();

    const read = uriToBlob("blob:canceled-photo", {
      signal: controller.signal,
      timeoutMs: 30000
    });
    const rejection = expect(read).rejects.toMatchObject({
      code: "ABORTED",
      message: "The file read was canceled."
    });

    controller.abort();
    expect(xhr.abort).toHaveBeenCalledTimes(1);
    await rejection;
  });
});
