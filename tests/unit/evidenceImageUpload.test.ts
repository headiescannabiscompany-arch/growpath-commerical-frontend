/** @jest-environment jsdom */

import {
  EVIDENCE_IMAGE_MAX_DIMENSION,
  EVIDENCE_IMAGE_UPLOAD_TARGET_BYTES,
  prepareEvidenceImageForUpload,
  prepareNativeEvidenceImageForUpload
} from "@/utils/evidenceImageUpload";

const mockNativeManipulate = jest.fn();
const mockNativeGetInfo = jest.fn();
const mockNativeDelete = jest.fn();

jest.mock("expo-image-manipulator", () => ({
  ImageManipulator: {
    manipulate: (...args: any[]) => mockNativeManipulate(...args)
  },
  SaveFormat: { JPEG: "jpeg", PNG: "png", WEBP: "webp" }
}));

jest.mock("expo-file-system/legacy", () => ({
  getInfoAsync: (...args: any[]) => mockNativeGetInfo(...args),
  deleteAsync: (...args: any[]) => mockNativeDelete(...args)
}));

function installImageCanvasFixture({
  preparedBlob,
  width = 1200,
  height = 900,
  stallCanvas = false
}: {
  preparedBlob: Blob;
  width?: number;
  height?: number;
  stallCanvas?: boolean;
}) {
  const originalImage = globalThis.Image;
  const originalCreateObjectUrl = URL.createObjectURL;
  const originalRevokeObjectUrl = URL.revokeObjectURL;
  const context = {
    clearRect: jest.fn(),
    drawImage: jest.fn()
  };
  const canvas = {
    width: 0,
    height: 0,
    getContext: jest.fn(() => context),
    toBlob: jest.fn((callback: BlobCallback) => {
      if (!stallCanvas) callback(preparedBlob);
    })
  };

  class ReadyImage {
    decoding = "";
    naturalWidth = width;
    naturalHeight = height;
    width = width;
    height = height;
    onload: null | (() => void) = null;
    onerror: null | (() => void) = null;

    set src(_value: string) {
      this.onload?.();
    }
  }

  Object.defineProperty(globalThis, "Image", {
    configurable: true,
    value: ReadyImage
  });
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: jest.fn(() => "blob:selected-photo")
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: jest.fn()
  });
  const createElement = jest
    .spyOn(document, "createElement")
    .mockReturnValue(canvas as unknown as HTMLCanvasElement);

  return {
    canvas,
    context,
    restore() {
      createElement.mockRestore();
      Object.defineProperty(globalThis, "Image", {
        configurable: true,
        value: originalImage
      });
      Object.defineProperty(URL, "createObjectURL", {
        configurable: true,
        value: originalCreateObjectUrl
      });
      Object.defineProperty(URL, "revokeObjectURL", {
        configurable: true,
        value: originalRevokeObjectUrl
      });
    }
  };
}

describe("prepareEvidenceImageForUpload", () => {
  it("keeps an image that is already within the upload target unchanged", async () => {
    const blob = new Blob(["small image"], { type: "image/png" });

    await expect(prepareEvidenceImageForUpload(blob, "leaf.png")).resolves.toEqual({
      blob,
      fileName: "leaf.png",
      mimeType: "image/png",
      originalBytes: blob.size,
      uploadBytes: blob.size,
      optimized: false
    });
  });

  it.each([
    {
      label: "small HEIC photo",
      blobType: "image/heic",
      fileName: "field-flower.HEIC"
    },
    {
      label: "small HEIF photo",
      blobType: "image/heif",
      fileName: "field-flower.HEIF"
    },
    {
      label: "small untyped photo",
      blobType: "",
      fileName: "field-flower"
    }
  ])("normalizes a $label to an actual JPEG", async ({ blobType, fileName }) => {
    const originalBlob = new Blob(["small phone photo"], { type: blobType });
    const preparedBlob = new Blob(["normalized jpeg"], { type: "image/jpeg" });
    const fixture = installImageCanvasFixture({ preparedBlob });

    try {
      const result = await prepareEvidenceImageForUpload(originalBlob, fileName);

      expect(fixture.canvas.toBlob).toHaveBeenCalledWith(
        expect.any(Function),
        "image/jpeg",
        0.9
      );
      expect(result).toEqual({
        blob: preparedBlob,
        fileName: "field-flower.jpg",
        mimeType: "image/jpeg",
        originalBytes: originalBlob.size,
        uploadBytes: preparedBlob.size,
        optimized: true
      });
      expect(result.blob.type).toBe("image/jpeg");
    } finally {
      fixture.restore();
    }
  });

  it("resizes and converts an oversized mobile photo to an uploadable JPEG", async () => {
    const originalBlob = new Blob(
      [new Uint8Array(EVIDENCE_IMAGE_UPLOAD_TARGET_BYTES + 1)],
      { type: "image/heic" }
    );
    const preparedBlob = new Blob(
      [new Uint8Array(EVIDENCE_IMAGE_UPLOAD_TARGET_BYTES - 1024)],
      { type: "image/jpeg" }
    );
    const context = {
      clearRect: jest.fn(),
      drawImage: jest.fn()
    };
    const canvas = {
      width: 0,
      height: 0,
      getContext: jest.fn(() => context),
      toBlob: jest.fn((callback: BlobCallback) => callback(preparedBlob))
    };
    const originalImage = globalThis.Image;
    const originalCreateObjectUrl = URL.createObjectURL;
    const originalRevokeObjectUrl = URL.revokeObjectURL;

    class ReadyImage {
      decoding = "";
      naturalWidth = 6000;
      naturalHeight = 4000;
      width = 6000;
      height = 4000;
      onload: null | (() => void) = null;
      onerror: null | (() => void) = null;

      set src(_value: string) {
        this.onload?.();
      }
    }

    Object.defineProperty(globalThis, "Image", {
      configurable: true,
      value: ReadyImage
    });
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: jest.fn(() => "blob:oversized-photo")
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: jest.fn()
    });
    const createElement = jest
      .spyOn(document, "createElement")
      .mockReturnValue(canvas as unknown as HTMLCanvasElement);

    try {
      const result = await prepareEvidenceImageForUpload(
        originalBlob,
        "field-photo.HEIC"
      );

      expect(createElement).toHaveBeenCalledWith("canvas");
      expect(canvas.width).toBe(EVIDENCE_IMAGE_MAX_DIMENSION);
      expect(canvas.height).toBe(2731);
      expect(context.drawImage).toHaveBeenCalledWith(
        expect.any(ReadyImage),
        0,
        0,
        EVIDENCE_IMAGE_MAX_DIMENSION,
        2731
      );
      expect(canvas.toBlob).toHaveBeenCalledWith(expect.any(Function), "image/jpeg", 0.9);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:oversized-photo");
      expect(result).toEqual({
        blob: preparedBlob,
        fileName: "field-photo.jpg",
        mimeType: "image/jpeg",
        originalBytes: originalBlob.size,
        uploadBytes: preparedBlob.size,
        optimized: true
      });
    } finally {
      createElement.mockRestore();
      Object.defineProperty(globalThis, "Image", {
        configurable: true,
        value: originalImage
      });
      Object.defineProperty(URL, "createObjectURL", {
        configurable: true,
        value: originalCreateObjectUrl
      });
      Object.defineProperty(URL, "revokeObjectURL", {
        configurable: true,
        value: originalRevokeObjectUrl
      });
    }
  });

  it("rejects with ABORTED when canvas encoding stalls and the caller cancels", async () => {
    const originalBlob = new Blob(["small HEIC"], { type: "image/heic" });
    const fixture = installImageCanvasFixture({
      preparedBlob: new Blob(["unused"], { type: "image/jpeg" }),
      stallCanvas: true
    });
    const controller = new AbortController();

    try {
      const preparation = prepareEvidenceImageForUpload(originalBlob, "stalled.HEIC", {
        signal: controller.signal
      });
      for (
        let turn = 0;
        turn < 5 && fixture.canvas.toBlob.mock.calls.length === 0;
        turn += 1
      ) {
        await Promise.resolve();
      }
      expect(fixture.canvas.toBlob).toHaveBeenCalledTimes(1);
      controller.abort();

      await expect(preparation).rejects.toMatchObject({
        code: "ABORTED",
        message: "Photo preparation was canceled."
      });
    } finally {
      fixture.restore();
    }
  });

  it("never returns a prepared web photo above the 4.5 MiB safety target", async () => {
    const originalBlob = new Blob(
      [new Uint8Array(EVIDENCE_IMAGE_UPLOAD_TARGET_BYTES + 1024)],
      { type: "image/jpeg" }
    );
    const stillTooLarge = new Blob(
      [new Uint8Array(EVIDENCE_IMAGE_UPLOAD_TARGET_BYTES + 1)],
      { type: "image/jpeg" }
    );
    const fixture = installImageCanvasFixture({ preparedBlob: stillTooLarge });

    try {
      await expect(
        prepareEvidenceImageForUpload(originalBlob, "oversized.jpg")
      ).rejects.toMatchObject({
        code: "IMAGE_PREPARATION_FAILED"
      });
      expect(fixture.canvas.toBlob).toHaveBeenCalledTimes(16);
    } finally {
      fixture.restore();
    }
  });
});

describe("prepareNativeEvidenceImageForUpload", () => {
  beforeEach(() => {
    mockNativeManipulate.mockReset();
    mockNativeGetInfo.mockReset();
    mockNativeDelete.mockReset();
  });

  it("keeps an uploadable native JPEG unchanged", async () => {
    await expect(
      prepareNativeEvidenceImageForUpload({
        uri: "file:///leaf.jpg",
        fileName: "leaf.jpg",
        mimeType: "image/jpeg",
        fileSizeBytes: 1024,
        width: 1200,
        height: 900
      })
    ).resolves.toEqual({
      uri: "file:///leaf.jpg",
      fileName: "leaf.jpg",
      mimeType: "image/jpeg",
      originalBytes: 1024,
      uploadBytes: 1024,
      optimized: false
    });
    expect(mockNativeManipulate).not.toHaveBeenCalled();
  });

  it("converts and shrinks a large native HEIC without upscaling", async () => {
    const resize = jest.fn();
    const saveAsync = jest.fn().mockResolvedValue({
      uri: "file:///cache/field-photo.jpg",
      width: 4096,
      height: 2731
    });
    const renderAsync = jest.fn().mockResolvedValue({
      width: 4096,
      height: 2731,
      saveAsync
    });
    mockNativeManipulate.mockReturnValue({ resize, renderAsync });
    mockNativeGetInfo.mockResolvedValue({
      exists: true,
      size: EVIDENCE_IMAGE_UPLOAD_TARGET_BYTES - 1024
    });

    const result = await prepareNativeEvidenceImageForUpload({
      uri: "file:///DCIM/field-photo.HEIC",
      fileName: "field-photo.HEIC",
      mimeType: "image/heic",
      fileSizeBytes: 8 * 1024 * 1024,
      width: 6000,
      height: 4000
    });

    expect(mockNativeManipulate).toHaveBeenCalledWith("file:///DCIM/field-photo.HEIC");
    expect(resize).toHaveBeenCalledWith({ width: 4096, height: 2731 });
    expect(saveAsync).toHaveBeenCalledWith({ compress: 0.9, format: "jpeg" });
    expect(result).toEqual({
      uri: "file:///cache/field-photo.jpg",
      fileName: "field-photo.jpg",
      mimeType: "image/jpeg",
      originalBytes: 8 * 1024 * 1024,
      uploadBytes: EVIDENCE_IMAGE_UPLOAD_TARGET_BYTES - 1024,
      optimized: true
    });
    expect(result.uploadBytes).toBeLessThanOrEqual(EVIDENCE_IMAGE_UPLOAD_TARGET_BYTES);
  });

  it("normalizes a small native HEIC at its original dimensions", async () => {
    const resize = jest.fn();
    const saveAsync = jest.fn().mockResolvedValue({
      uri: "file:///cache/small-field-photo.jpg",
      width: 1000,
      height: 750
    });
    mockNativeManipulate.mockReturnValue({
      resize,
      renderAsync: jest.fn().mockResolvedValue({
        width: 1000,
        height: 750,
        saveAsync
      })
    });
    mockNativeGetInfo.mockResolvedValue({ exists: true, size: 900 * 1024 });

    await expect(
      prepareNativeEvidenceImageForUpload({
        uri: "file:///DCIM/small.HEIC",
        fileName: "small.HEIC",
        mimeType: "image/heic",
        fileSizeBytes: 1024 * 1024,
        width: 1000,
        height: 750
      })
    ).resolves.toMatchObject({
      uri: "file:///cache/small-field-photo.jpg",
      fileName: "small.jpg",
      mimeType: "image/jpeg",
      optimized: true
    });
    expect(resize).not.toHaveBeenCalled();
  });
});
