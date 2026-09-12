import { apiRequest } from "@/api/apiRequest";
import { marketplaceDownloadUrl } from "@/api/marketplaceBuyer";
import {
  downloadAndSaveMarketplaceContent,
  saveMarketplaceBlob
} from "@/utils/marketplaceDownload";
import { Platform } from "react-native";

const mockGetToken = jest.fn();
const mockOpen = jest.fn();
const mockNativeWrite = jest.fn();
const mockNativeDelete = jest.fn();
const mockNativeShare = jest.fn();
jest.mock("expo-file-system/legacy", () => ({
  cacheDirectory: "file:///private-cache/",
  EncodingType: { Base64: "base64" },
  writeAsStringAsync: (...args: unknown[]) => mockNativeWrite(...args),
  deleteAsync: (...args: unknown[]) => mockNativeDelete(...args)
}));
jest.mock("expo-sharing", () => ({
  isAvailableAsync: async () => true,
  shareAsync: (...args: unknown[]) => mockNativeShare(...args)
}));
jest.mock("@/auth/tokenStore", () => ({
  getToken: (...args: unknown[]) => mockGetToken(...args)
}));
jest.mock("@/utils/openAuthorizedExternalUrl", () => ({
  openAuthorizedExternalUrl: (...args: unknown[]) => mockOpen(...args)
}));

const assetId = "507f191e810c19729de86001";
const receipt = {
  downloadPath: "/api/marketplace/offer-1/file",
  expectedAssetId: assetId,
  deliveryType: "protected_asset",
  mimeType: "application/pdf",
  filename: "../../Guide.pdf"
};
const json = (value: unknown) => ({
  ok: true,
  headers: { get: () => "application/json" },
  text: async () => JSON.stringify(value)
});
const file = () => new Blob(["%PDF-1.4\nSafe fixture"], { type: "application/pdf" });

describe("protected Marketplace delivery", () => {
  let save: jest.Mock;
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetToken.mockResolvedValue("test-only-buyer");
    save = jest.fn().mockResolvedValue(undefined);
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(json(receipt))
      .mockResolvedValueOnce({ ok: true, blob: async () => file() });
  });

  it("authorizes receipt and bytes separately, binds the current asset, and saves only bytes", async () => {
    mockGetToken
      .mockResolvedValueOnce("test-only-receipt")
      .mockResolvedValueOnce("test-only-current");
    await downloadAndSaveMarketplaceContent("offer-1", { saveBlob: save });
    const calls = jest.mocked(global.fetch).mock.calls;
    expect(String(calls[0][0])).toMatch(/\/api\/marketplace\/offer-1\/download$/);
    expect(calls[0][1]?.headers).toMatchObject({
      Authorization: "Bearer test-only-receipt"
    });
    expect(String(calls[1][0])).toMatch(
      new RegExp(`/api/marketplace/offer-1/file\\?assetId=${assetId}$`)
    );
    expect(calls[1][1]).toMatchObject({
      method: "GET",
      redirect: "error",
      cache: "no-store",
      headers: { Authorization: "Bearer test-only-current" }
    });
    expect(String(calls[1][0])).not.toContain("test-only");
    expect(save).toHaveBeenCalledWith(expect.any(Blob), "Guide.pdf", undefined);
    expect(mockOpen).not.toHaveBeenCalled();
  });

  it.each([
    { downloadPath: "https://example.test/file" },
    { downloadPath: "/api/marketplace/another/file" },
    { downloadPath: "/api/marketplace/offer-1/file?token=bad" },
    { expectedAssetId: "" },
    { mimeType: "text/html" }
  ])(
    "rejects invalid protected receipts without fetching a source",
    async (overrides) => {
      global.fetch = jest
        .fn()
        .mockResolvedValue(
          json({ ...receipt, ...overrides, downloadUrl: "https://example.test/bypass" })
        );
      await expect(
        downloadAndSaveMarketplaceContent("offer-1", { saveBlob: save })
      ).rejects.toThrow(/invalid protected download/);
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(save).not.toHaveBeenCalled();
      expect(mockOpen).not.toHaveBeenCalled();
    }
  );

  it.each([401, 403, 409])("never saves an HTTP %s error response", async (status) => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(json(receipt))
      .mockResolvedValueOnce({
        ok: false,
        status,
        headers: { get: () => "application/json" },
        blob: async () => new Blob(["denied"], { type: "application/json" })
      });
    await expect(
      downloadAndSaveMarketplaceContent("offer-1", { saveBlob: save })
    ).rejects.toBeTruthy();
    expect(save).not.toHaveBeenCalled();
  });

  it.each(["text/html", "application/json", "image/png"])(
    "does not save a successful but wrong %s body",
    async (type) => {
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce(json(receipt))
        .mockResolvedValueOnce({
          ok: true,
          blob: async () => new Blob(["wrong"], { type })
        });
      await expect(
        downloadAndSaveMarketplaceContent("offer-1", { saveBlob: save })
      ).rejects.toThrow(/could not be verified/);
      expect(save).not.toHaveBeenCalled();
    }
  );

  it("does not save a late completed body after account/unmount cancellation", async () => {
    const controller = new AbortController();
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(json(receipt))
      .mockResolvedValueOnce({
        ok: true,
        blob: async () => {
          controller.abort();
          return file();
        }
      });
    await expect(
      downloadAndSaveMarketplaceContent("offer-1", {
        saveBlob: save,
        signal: controller.signal
      })
    ).rejects.toThrow();
    expect(save).not.toHaveBeenCalled();
  });

  it("never falls back to a public URL for paid or protected delivery", async () => {
    expect(
      marketplaceDownloadUrl({ ...receipt, downloadUrl: "https://example.test/source" })
    ).toBe("");
    global.fetch = jest
      .fn()
      .mockResolvedValue(json({ downloadUrl: "https://example.test/source" }));
    await expect(
      downloadAndSaveMarketplaceContent("offer-1", { saveBlob: save })
    ).rejects.toThrow(/Protected delivery is unavailable/);
    expect(mockOpen).not.toHaveBeenCalled();
    await downloadAndSaveMarketplaceContent("offer-1", { allowLegacyExternal: true });
    expect(mockOpen).toHaveBeenCalledWith("https://example.test/source");
  });

  it("keeps normal API redirect behavior unchanged unless explicitly opted in", async () => {
    global.fetch = jest.fn().mockResolvedValue(json({ ok: true }));
    await apiRequest("/api/test");
    expect(jest.mocked(global.fetch).mock.calls[0][1]?.redirect).toBeUndefined();
  });

  it("normalizes a free legacy relative file to the API origin", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(json({ downloadUrl: "/uploads/free.txt" }));
    await downloadAndSaveMarketplaceContent("offer-1", { allowLegacyExternal: true });
    expect(mockOpen).toHaveBeenCalledWith("http://127.0.0.1:1/uploads/free.txt");
  });

  it("rejects a non-Blob successful body", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(json(receipt))
      .mockResolvedValueOnce({
        ok: true,
        blob: async () => ({ size: 1, type: "application/pdf" })
      });
    await expect(
      downloadAndSaveMarketplaceContent("offer-1", { saveBlob: save })
    ).rejects.toThrow(/could not be verified/);
    expect(save).not.toHaveBeenCalled();
  });

  it.each([false, true])(
    "uses a native local cache file only and cleans up after share (failed=%s)",
    async (failed) => {
      const originalOS = Platform.OS;
      const Reader = global.FileReader;
      try {
        Object.defineProperty(Platform, "OS", { configurable: true, value: "ios" });
        global.FileReader = class {
          result = "data:application/pdf;base64,JVBERi0=";
          onload: (() => void) | null = null;
          readAsDataURL() {
            this.onload?.();
          }
        } as unknown as typeof FileReader;
        mockNativeWrite.mockResolvedValue(undefined);
        mockNativeDelete.mockResolvedValue(undefined);
        if (failed) mockNativeShare.mockRejectedValueOnce(new Error("Sharing failed"));
        else mockNativeShare.mockResolvedValueOnce(undefined);
        const operation = saveMarketplaceBlob(file(), "Guide.pdf");
        if (failed) await expect(operation).rejects.toThrow("Sharing failed");
        else await operation;
        const uri = mockNativeWrite.mock.calls[0][0];
        expect(uri).toMatch(/^file:\/\/\/private-cache\/marketplace-.*-Guide\.pdf$/);
        expect(mockNativeWrite).toHaveBeenCalledWith(uri, "JVBERi0=", {
          encoding: "base64"
        });
        expect(mockNativeShare).toHaveBeenCalledWith(uri, {
          mimeType: "application/pdf",
          dialogTitle: "Guide.pdf"
        });
        expect(mockNativeDelete).toHaveBeenCalledWith(uri, { idempotent: true });
      } finally {
        Object.defineProperty(Platform, "OS", { configurable: true, value: originalOS });
        global.FileReader = Reader;
      }
    }
  );

  it("revokes the local object URL after browser save and never navigates to the server", async () => {
    jest.useFakeTimers();
    const originalOS = Platform.OS;
    const originalDocument = global.document;
    const create = URL.createObjectURL;
    const revoke = URL.revokeObjectURL;
    const anchor = { href: "", download: "", click: jest.fn(), remove: jest.fn() };
    try {
      Object.defineProperty(Platform, "OS", { configurable: true, value: "web" });
      global.document = {
        createElement: jest.fn(() => anchor),
        body: { appendChild: jest.fn() }
      } as unknown as Document;
      URL.createObjectURL = jest.fn(() => "blob:local-bytes");
      URL.revokeObjectURL = jest.fn();
      await saveMarketplaceBlob(file(), "Guide.pdf");
      expect(anchor.href).toBe("blob:local-bytes");
      expect(anchor.click).toHaveBeenCalledTimes(1);
      expect(anchor.remove).toHaveBeenCalledTimes(1);
      jest.runAllTimers();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:local-bytes");
    } finally {
      Object.defineProperty(Platform, "OS", { configurable: true, value: originalOS });
      global.document = originalDocument;
      URL.createObjectURL = create;
      URL.revokeObjectURL = revoke;
      jest.useRealTimers();
    }
  });
});
