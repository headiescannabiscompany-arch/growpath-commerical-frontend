/** @jest-environment jsdom */
import { Platform } from "react-native";
import {
  downloadPersonalGrowTimelinePdf,
  saveTimelinePdfBlob
} from "@/utils/personalGrowPdfDownload";
import { requestPersonalGrowTimelinePdf } from "@/api/personalGrowPdf";

jest.mock("@/api/personalGrowPdf", () => ({
  ...jest.requireActual("@/api/personalGrowPdf"),
  requestPersonalGrowTimelinePdf: jest.fn()
}));
const mockNativeWrite = jest.fn();
const mockNativeDelete = jest.fn();
const mockNativeShare = jest.fn();
const mockNativeAvailable = jest.fn();
jest.mock("expo-file-system/legacy", () => ({
  cacheDirectory: "file:///private-cache/",
  EncodingType: { Base64: "base64" },
  writeAsStringAsync: (...args: unknown[]) => mockNativeWrite(...args),
  deleteAsync: (...args: unknown[]) => mockNativeDelete(...args)
}));
jest.mock("expo-sharing", () => ({
  isAvailableAsync: (...args: unknown[]) => mockNativeAvailable(...args),
  shareAsync: (...args: unknown[]) => mockNativeShare(...args)
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (value: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
const pdf = () =>
  new Blob(["%PDF-1.7\nsynthetic bytes\n%%EOF\n"], { type: "application/pdf" });
const scope = () => ({ isCurrentScope: () => true });
const waitFor = async (predicate: () => boolean) => {
  for (let i = 0; i < 30 && !predicate(); i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  expect(predicate()).toBe(true);
};

describe("Personal grow PDF device handoff", () => {
  const originalOS = Platform.OS;
  const create = URL.createObjectURL;
  const revoke = URL.revokeObjectURL;
  let anchor: HTMLAnchorElement;
  let click: jest.SpyInstance;

  beforeEach(() => {
    Object.defineProperty(Platform, "OS", { configurable: true, value: "web" });
    anchor = document.createElement("a");
    jest.spyOn(document, "createElement").mockReturnValue(anchor);
    click = jest.spyOn(anchor, "click").mockImplementation(() => {});
    URL.createObjectURL = jest.fn(() => "blob:private-local-bytes");
    URL.revokeObjectURL = jest.fn();
    mockNativeAvailable.mockResolvedValue(true);
    mockNativeWrite.mockResolvedValue(undefined);
    mockNativeDelete.mockResolvedValue(undefined);
    mockNativeShare.mockResolvedValue(undefined);
    (requestPersonalGrowTimelinePdf as jest.Mock).mockResolvedValue(pdf());
  });

  afterEach(() => {
    Object.defineProperty(Platform, "OS", { configurable: true, value: originalOS });
    URL.createObjectURL = create;
    URL.revokeObjectURL = revoke;
    jest.useRealTimers();
  });

  it("downloads only verified local bytes with a fixed private-safe filename and explicit disposal", async () => {
    const controller = new AbortController();
    const removeListener = jest.spyOn(controller.signal, "removeEventListener");
    const result = await downloadPersonalGrowTimelinePdf("grow-private-id", {
      timeZone: "UTC",
      signal: controller.signal,
      ...scope()
    });
    expect(requestPersonalGrowTimelinePdf).toHaveBeenCalledWith(
      "grow-private-id",
      expect.objectContaining({ timeZone: "UTC", signal: controller.signal })
    );
    expect(result).toMatchObject({
      filename: "growpath-timeline.pdf",
      method: "web-download"
    });
    expect(anchor.href).toBe("blob:private-local-bytes");
    expect(anchor.download).toBe("growpath-timeline.pdf");
    expect(click).toHaveBeenCalledTimes(1);
    expect(document.body.contains(anchor)).toBe(false);
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    result.dispose();
    result.dispose();
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:private-local-bytes");
    expect(removeListener).toHaveBeenCalledWith("abort", result.dispose);
    expect(mockNativeShare).not.toHaveBeenCalled();
  });

  it("abort/unmount revokes the browser URL after dispatch without pretending to recall the file", async () => {
    const controller = new AbortController();
    const result = await saveTimelinePdfBlob(pdf(), {
      ...scope(),
      signal: controller.signal
    });
    controller.abort();
    result.dispose();
    expect(click).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
  });

  it("bounded fallback disposes a browser URL if the caller forgets", async () => {
    // Real FileReader finishes before enabling fake timers for the dispatch phase.
    click.mockImplementation(() => jest.useFakeTimers());
    const result = await saveTimelinePdfBlob(pdf(), scope());
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    jest.advanceTimersByTime(60_000);
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
    result.dispose();
    expect(jest.getTimerCount()).toBe(0);
  });

  it.each(["stale", "abort", "throw"])(
    "cleans a created URL and anchor when %s occurs before dispatch",
    async (kind) => {
      const controller = new AbortController();
      let current = true;
      const append = document.body.appendChild.bind(document.body);
      jest.spyOn(document.body, "appendChild").mockImplementation((element) => {
        append(element);
        if (kind === "abort") controller.abort();
        if (kind === "stale") current = false;
        if (kind === "throw") throw new Error("private source path");
        return element;
      });
      await expect(
        saveTimelinePdfBlob(pdf(), {
          signal: controller.signal,
          isCurrentScope: () => current
        })
      ).rejects.toBeTruthy();
      expect(click).not.toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
      expect(document.body.contains(anchor)).toBe(false);
    }
  );

  it("cleans URLs if anchor creation fails", async () => {
    jest.spyOn(document, "createElement").mockImplementation(() => {
      throw new Error("private");
    });
    await expect(saveTimelinePdfBlob(pdf(), scope())).rejects.toMatchObject({
      code: "PDF_DELIVERY_FAILED"
    });
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
  });

  it("does not allocate or dispatch for invalid bytes or a pre-stale scope", async () => {
    await expect(
      saveTimelinePdfBlob(new Blob(["not PDF"], { type: "application/pdf" }), scope())
    ).rejects.toMatchObject({ code: "PDF_RESPONSE_INVALID" });
    await expect(
      saveTimelinePdfBlob(pdf(), { isCurrentScope: () => false })
    ).rejects.toMatchObject({ code: "PDF_SOURCE_CHANGED" });
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(mockNativeWrite).not.toHaveBeenCalled();
  });

  it("ignores bytes from a late API response after the selected scope changes", async () => {
    const request = deferred<Blob>();
    (requestPersonalGrowTimelinePdf as jest.Mock).mockReturnValue(request.promise);
    let current = true;
    const operation = downloadPersonalGrowTimelinePdf("grow", {
      timeZone: "UTC",
      isCurrentScope: () => current
    });
    const assertion = expect(operation).rejects.toMatchObject({
      code: "PDF_SOURCE_CHANGED"
    });
    current = false;
    request.resolve(pdf());
    await assertion;
    expect(click).not.toHaveBeenCalled();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it.each([false, true])(
    "native file sharing cleans its private cache on failure=%s",
    async (failure) => {
      Object.defineProperty(Platform, "OS", { configurable: true, value: "ios" });
      if (failure) mockNativeShare.mockRejectedValue(new Error("private-file-path"));
      const operation = saveTimelinePdfBlob(pdf(), scope());
      if (failure)
        await expect(operation).rejects.toMatchObject({ code: "PDF_DELIVERY_FAILED" });
      else {
        const result = await operation;
        expect(result).toMatchObject({
          filename: "growpath-timeline.pdf",
          method: "native-share-file"
        });
        result.dispose();
      }
      const [uri, base64, settings] = mockNativeWrite.mock.calls[0];
      expect(uri).toMatch(
        /^file:\/\/\/private-cache\/growpath-pdf-[\w.-]+-growpath-timeline\.pdf$/
      );
      expect(atob(base64)).toBe("%PDF-1.7\nsynthetic bytes\n%%EOF\n");
      expect(settings).toEqual({ encoding: "base64" });
      expect(mockNativeShare).toHaveBeenCalledWith(uri, {
        mimeType: "application/pdf",
        dialogTitle: "growpath-timeline.pdf"
      });
      expect(mockNativeDelete).toHaveBeenCalledWith(uri, { idempotent: true });
      expect(URL.createObjectURL).not.toHaveBeenCalled();
    }
  );

  it("native unavailable sharing never writes a file", async () => {
    Object.defineProperty(Platform, "OS", { configurable: true, value: "android" });
    mockNativeAvailable.mockResolvedValue(false);
    await expect(saveTimelinePdfBlob(pdf(), scope())).rejects.toMatchObject({
      code: "PDF_DELIVERY_UNAVAILABLE"
    });
    expect(mockNativeWrite).not.toHaveBeenCalled();
    expect(mockNativeShare).not.toHaveBeenCalled();
  });

  it.each(["stale", "abort"])(
    "native %s during write prevents share and cleans the cache",
    async (kind) => {
      Object.defineProperty(Platform, "OS", { configurable: true, value: "ios" });
      const controller = new AbortController();
      let current = true;
      mockNativeWrite.mockImplementation(async () => {
        if (kind === "abort") controller.abort();
        else current = false;
      });
      await expect(
        saveTimelinePdfBlob(pdf(), {
          signal: controller.signal,
          isCurrentScope: () => current
        })
      ).rejects.toMatchObject({
        code: kind === "abort" ? "PDF_ABORTED" : "PDF_SOURCE_CHANGED"
      });
      expect(mockNativeShare).not.toHaveBeenCalled();
      expect(mockNativeDelete).toHaveBeenCalled();
    }
  );

  it("native abort during a pending write cleans now and again after the late write completes", async () => {
    Object.defineProperty(Platform, "OS", { configurable: true, value: "ios" });
    const controller = new AbortController();
    const write = deferred<void>();
    mockNativeWrite.mockReturnValue(write.promise);
    const operation = saveTimelinePdfBlob(pdf(), {
      ...scope(),
      signal: controller.signal
    });
    const assertion = expect(operation).rejects.toMatchObject({ code: "PDF_ABORTED" });
    await waitFor(() => mockNativeWrite.mock.calls.length === 1);
    controller.abort();
    await assertion;
    expect(mockNativeDelete).toHaveBeenCalledTimes(1);
    write.resolve(undefined);
    await waitFor(() => mockNativeDelete.mock.calls.length === 2);
    expect(mockNativeShare).not.toHaveBeenCalled();
  });

  it("native cache cleanup failure is explicit instead of claiming complete delivery", async () => {
    Object.defineProperty(Platform, "OS", { configurable: true, value: "ios" });
    mockNativeDelete.mockRejectedValue(new Error("private-cache-path"));
    await expect(saveTimelinePdfBlob(pdf(), scope())).rejects.toMatchObject({
      code: "PDF_CLEANUP_FAILED"
    });
  });

  it("native write deadline cleans a partial file and a later completed write", async () => {
    Object.defineProperty(Platform, "OS", { configurable: true, value: "ios" });
    const write = deferred<void>();
    mockNativeWrite.mockImplementation(() => {
      jest.useFakeTimers();
      return write.promise;
    });
    const operation = saveTimelinePdfBlob(pdf(), scope());
    const assertion = expect(operation).rejects.toMatchObject({ code: "PDF_TIMEOUT" });
    // Use a real event-loop turn for FileReader before the write installs fake timers.
    const realSetTimeout = setTimeout;
    for (let index = 0; index < 30 && mockNativeWrite.mock.calls.length === 0; index++) {
      await new Promise((resolve) => realSetTimeout(resolve, 0));
    }
    expect(mockNativeWrite).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(10_000);
    await assertion;
    expect(mockNativeDelete).toHaveBeenCalledTimes(1);
    write.resolve(undefined);
    await Promise.resolve();
    await Promise.resolve();
    expect(mockNativeDelete).toHaveBeenCalledTimes(2);
    expect(mockNativeShare).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  it("native write failure removes any partial file without revealing its path", async () => {
    Object.defineProperty(Platform, "OS", { configurable: true, value: "ios" });
    mockNativeWrite.mockRejectedValue(new Error("private-cache-path"));
    await expect(saveTimelinePdfBlob(pdf(), scope())).rejects.toMatchObject({
      code: "PDF_DELIVERY_FAILED"
    });
    expect(mockNativeDelete).toHaveBeenCalled();
    expect(mockNativeShare).not.toHaveBeenCalled();
  });

  it("native base64-read failure creates no cached file or share", async () => {
    Object.defineProperty(Platform, "OS", { configurable: true, value: "ios" });
    jest.spyOn(FileReader.prototype, "readAsDataURL").mockImplementation(() => {
      throw new Error("private-reader-detail");
    });
    await expect(saveTimelinePdfBlob(pdf(), scope())).rejects.toBeTruthy();
    expect(mockNativeWrite).not.toHaveBeenCalled();
    expect(mockNativeShare).not.toHaveBeenCalled();
  });

  it("keeps a pending native share locked through abort and remount until the system sheet settles", async () => {
    Object.defineProperty(Platform, "OS", { configurable: true, value: "ios" });
    const controller = new AbortController();
    const share = deferred<void>();
    mockNativeShare.mockReturnValueOnce(share.promise);
    let settled = false;
    const operation = saveTimelinePdfBlob(pdf(), {
      ...scope(),
      signal: controller.signal
    });
    const assertion = expect(
      operation.finally(() => {
        settled = true;
      })
    ).rejects.toMatchObject({ code: "PDF_ABORTED" });
    await waitFor(() => mockNativeShare.mock.calls.length === 1);
    expect(mockNativeDelete).not.toHaveBeenCalled();
    controller.abort();
    await waitFor(() => mockNativeDelete.mock.calls.length > 0);
    expect(settled).toBe(false);
    // A new caller has no old controller or component state, but still cannot
    // open another PDF sheet while the first native handoff remains pending.
    await expect(saveTimelinePdfBlob(pdf(), scope())).rejects.toMatchObject({
      code: "PDF_BUSY"
    });
    expect(mockNativeShare).toHaveBeenCalledTimes(1);
    share.resolve(undefined);
    await assertion;
    expect(settled).toBe(true);
    expect(mockNativeDelete.mock.calls.length).toBeGreaterThan(1);
    await expect(saveTimelinePdfBlob(pdf(), scope())).resolves.toMatchObject({
      method: "native-share-file"
    });
    expect(mockNativeShare).toHaveBeenCalledTimes(2);
  });
});
