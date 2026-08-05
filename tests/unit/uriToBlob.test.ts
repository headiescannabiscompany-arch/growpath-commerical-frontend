/** @jest-environment jsdom */

import { uriToBlob } from "@/api/uriToBlob";

class ControlledXMLHttpRequest {
  static latest: ControlledXMLHttpRequest | undefined;

  response: Blob | null = null;
  responseType: XMLHttpRequestResponseType = "";
  status = 0;
  timeout = 0;
  onabort: XMLHttpRequest["onabort"] = null;
  onerror: XMLHttpRequest["onerror"] = null;
  onload: XMLHttpRequest["onload"] = null;
  ontimeout: XMLHttpRequest["ontimeout"] = null;
  open = jest.fn();
  send = jest.fn();
  abort = jest.fn(() => {
    this.onabort?.call(this as unknown as XMLHttpRequest, new ProgressEvent("abort"));
  });

  constructor() {
    ControlledXMLHttpRequest.latest = this;
  }
}

describe("uriToBlob", () => {
  const originalXMLHttpRequest = globalThis.XMLHttpRequest;

  beforeEach(() => {
    ControlledXMLHttpRequest.latest = undefined;
    Object.defineProperty(globalThis, "XMLHttpRequest", {
      configurable: true,
      value: ControlledXMLHttpRequest
    });
  });

  afterAll(() => {
    Object.defineProperty(globalThis, "XMLHttpRequest", {
      configurable: true,
      value: originalXMLHttpRequest
    });
  });

  it("terminates a stalled browser file read with TIMEOUT", async () => {
    const read = uriToBlob("blob:stalled-photo", { timeoutMs: 30_000 });
    const request = ControlledXMLHttpRequest.latest;

    expect(request?.open).toHaveBeenCalledWith("GET", "blob:stalled-photo", true);
    expect(request?.responseType).toBe("blob");
    expect(request?.timeout).toBe(30_000);
    expect(request?.send).toHaveBeenCalledWith(null);

    const rejection = expect(read).rejects.toMatchObject({
      code: "TIMEOUT",
      message: "Reading the selected file timed out."
    });
    request?.ontimeout?.call(
      request as unknown as XMLHttpRequest,
      new ProgressEvent("timeout")
    );
    await rejection;
  });

  it("aborts the active XHR when its caller cancels", async () => {
    const controller = new AbortController();
    const read = uriToBlob("blob:cancel-photo", {
      signal: controller.signal,
      timeoutMs: 30_000
    });
    const request = ControlledXMLHttpRequest.latest;
    const rejection = expect(read).rejects.toMatchObject({
      code: "ABORTED",
      message: "The file read was canceled."
    });

    controller.abort();

    expect(request?.abort).toHaveBeenCalledTimes(1);
    await rejection;
  });

  it("does not start an XHR for an already-canceled read", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      uriToBlob("blob:already-canceled", { signal: controller.signal })
    ).rejects.toMatchObject({
      code: "ABORTED",
      message: "The file read was canceled."
    });
    expect(ControlledXMLHttpRequest.latest).toBeUndefined();
  });
});
