/** @jest-environment jsdom */
import { API_URL } from "@/api/apiRequest";
import {
  PERSONAL_GROW_PDF_MAX_BYTES,
  PERSONAL_GROW_PDF_TIMEOUT_MS,
  personalGrowPdfErrorMessage,
  personalGrowPdfTimeZone,
  readPersonalGrowPdfBlob,
  requestPersonalGrowTimelinePdf
} from "@/api/personalGrowPdf";

const mockGetToken = jest.fn();
jest.mock("@/auth/tokenStore", () => ({ getToken: () => mockGetToken() }));

const pdf = (
  content = "%PDF-1.7\nlocal synthetic bytes\n%%EOF\n",
  type = "application/pdf"
) => new Blob([content], { type });
const options = () => ({ timeZone: "America/New_York", isCurrentScope: () => true });
const response = (blob: Blob, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: () => blob.type },
  blob: async () => blob
});

describe("Personal grow PDF authenticated bytes", () => {
  beforeEach(() => {
    mockGetToken.mockResolvedValue("synthetic-session");
    global.fetch = jest.fn().mockResolvedValue(response(pdf()));
  });

  it("uses the existing authenticated endpoint with a canonical zone and private request policy", async () => {
    const controller = new AbortController();
    const file = await requestPersonalGrowTimelinePdf("grow-1", {
      ...options(),
      timeZone: "US/Eastern",
      signal: controller.signal
    });
    expect(file.type).toBe("application/pdf");
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe(
      `${API_URL}/api/personal/grows/grow-1/timeline/pdf?timeZone=America%2FNew_York`
    );
    expect(init).toMatchObject({
      method: "GET",
      headers: { Authorization: "Bearer synthetic-session" },
      cache: "no-store",
      redirect: "error"
    });
    expect(url).not.toContain("synthetic-session");
  });

  it.each(["", "../grow", "grow?secret=1", "grow/name", "grow\\name", " grow"])(
    "rejects an invalid grow %j before dispatch",
    async (id) => {
      await expect(requestPersonalGrowTimelinePdf(id, options())).rejects.toMatchObject({
        code: "PDF_INPUT_INVALID"
      });
      expect(global.fetch).not.toHaveBeenCalled();
    }
  );

  it.each(["", "+05:00", "-0430", "UTC?token=x", "America/New_York\n", "Invalid/Zone"])(
    "rejects invalid or offset-only time zone %j before dispatch",
    async (timeZone) => {
      await expect(
        requestPersonalGrowTimelinePdf("grow-1", { ...options(), timeZone })
      ).rejects.toMatchObject({ code: "PDF_INPUT_INVALID" });
      expect(global.fetch).not.toHaveBeenCalled();
    }
  );

  it("accepts UTC and IANA Etc zones", () => {
    expect(personalGrowPdfTimeZone("UTC")).toBe("UTC");
    expect(personalGrowPdfTimeZone("Etc/GMT+5")).toBe("Etc/GMT+5");
  });

  it.each(["text/html", "application/json", "application/octet-stream", ""])(
    "rejects successful non-PDF MIME %j",
    async (type) => {
      (global.fetch as jest.Mock).mockResolvedValue(
        response(pdf("%PDF-1.7\n%%EOF", type))
      );
      await expect(
        requestPersonalGrowTimelinePdf("grow-1", options())
      ).rejects.toMatchObject({ code: "PDF_RESPONSE_INVALID" });
    }
  );

  it.each([
    "",
    "not a PDF",
    "%PDF-1.7\ntruncated",
    "%PDF-1.7\n%%EOF\nappended private error"
  ])("rejects empty, corrupt, truncated or appended-error bytes", async (content) => {
    (global.fetch as jest.Mock).mockResolvedValue(response(pdf(content)));
    await expect(
      requestPersonalGrowTimelinePdf("grow-1", options())
    ).rejects.toMatchObject({ code: "PDF_RESPONSE_INVALID" });
  });

  it("rejects oversized bytes before reading them", async () => {
    const file = pdf();
    Object.defineProperty(file, "size", { value: PERSONAL_GROW_PDF_MAX_BYTES + 1 });
    const read = jest.spyOn(FileReader.prototype, "readAsText");
    (global.fetch as jest.Mock).mockResolvedValue(response(file));
    await expect(
      requestPersonalGrowTimelinePdf("grow-1", options())
    ).rejects.toMatchObject({ code: "PDF_LIMIT_EXCEEDED" });
    expect(read).not.toHaveBeenCalled();
  });

  it.each([
    [403, "PDF_UPGRADE_REQUIRED"],
    [403, "PDF_ACCOUNT_UNAVAILABLE"],
    [404, "PDF_GROW_NOT_FOUND"],
    [400, "PDF_INPUT_INVALID"],
    [422, "PDF_PHOTO_UNAVAILABLE"],
    [422, "PDF_TEXT_UNSUPPORTED"],
    [413, "PDF_LIMIT_EXCEEDED"],
    [409, "PDF_SOURCE_CHANGED"],
    [429, "PDF_BUSY"],
    [503, "PDF_TIMEOUT"],
    [503, "PDF_ABORTED"],
    [503, "PDF_GENERATION_FAILED"]
  ])("maps safe JSON Blob errors (%s %s) without server text", async (status, code) => {
    (global.fetch as jest.Mock).mockResolvedValue(
      response(
        new Blob(
          [
            JSON.stringify({
              error: { code, message: "private-source-path?secret=unsafe" }
            })
          ],
          { type: "application/json" }
        ),
        status as number
      )
    );
    const error = await requestPersonalGrowTimelinePdf("grow-1", options()).catch(
      (value) => value
    );
    expect(error.code).toBe(code);
    expect(personalGrowPdfErrorMessage(error)).not.toContain("private-source");
    expect(error.message).toBe(personalGrowPdfErrorMessage({ code }));
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it.each([
    new Blob(["invalid secret JSON"], { type: "application/json" }),
    new Blob([JSON.stringify({ code: "NEW_UNTRUSTED_CODE", message: "secret" })], {
      type: "application/json"
    }),
    new Blob(["secret"], { type: "text/html" }),
    new Blob(["x".repeat(32 * 1024 + 1)], { type: "application/json" })
  ])(
    "never exposes malformed, unknown, non-JSON or oversized error data",
    async (body) => {
      (global.fetch as jest.Mock).mockResolvedValue(response(body, 503));
      await expect(
        requestPersonalGrowTimelinePdf("grow-1", options())
      ).rejects.toMatchObject({ code: "PDF_GENERATION_FAILED" });
      expect(personalGrowPdfErrorMessage(new Error("secret"))).not.toContain("secret");
      expect(global.fetch).toHaveBeenCalledTimes(1);
    }
  );

  it("maps auth 401 safely and never saves an error body", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      response(new Blob(["unauthorized"]), 401)
    );
    await expect(
      requestPersonalGrowTimelinePdf("grow-1", options())
    ).rejects.toMatchObject({ code: "PDF_SIGN_IN_REQUIRED" });
  });

  it("blocks pre-aborted and stale scopes before dispatch", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      requestPersonalGrowTimelinePdf("grow-1", {
        ...options(),
        signal: controller.signal
      })
    ).rejects.toMatchObject({ code: "PDF_ABORTED" });
    await expect(
      requestPersonalGrowTimelinePdf("grow-1", {
        ...options(),
        isCurrentScope: () => false
      })
    ).rejects.toMatchObject({ code: "PDF_SOURCE_CHANGED" });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("rejects a late success after the selected scope changes", async () => {
    let current = true;
    (global.fetch as jest.Mock).mockImplementation(async () => {
      current = false;
      return response(pdf());
    });
    await expect(
      requestPersonalGrowTimelinePdf("grow-1", {
        ...options(),
        isCurrentScope: () => current
      })
    ).rejects.toMatchObject({ code: "PDF_SOURCE_CHANGED" });
  });

  it.each(["abort", "timeout"])(
    "bounds a stalled body using transport %s without retry",
    async (kind) => {
      jest.useFakeTimers();
      try {
        const controller = new AbortController();
        (global.fetch as jest.Mock).mockImplementation(async (_url, init) => ({
          ok: true,
          blob: () =>
            new Promise((_resolve, reject) => {
              init.signal.addEventListener("abort", () =>
                reject(Object.assign(new Error("private"), { name: "AbortError" }))
              );
            })
        }));
        const operation = requestPersonalGrowTimelinePdf("grow-1", {
          ...options(),
          signal: controller.signal
        });
        const assertion = expect(operation).rejects.toMatchObject({
          code: kind === "abort" ? "PDF_ABORTED" : "PDF_TIMEOUT"
        });
        await Promise.resolve();
        await Promise.resolve();
        if (kind === "abort") controller.abort();
        else jest.advanceTimersByTime(PERSONAL_GROW_PDF_TIMEOUT_MS);
        await assertion;
        expect(global.fetch).toHaveBeenCalledTimes(1);
      } finally {
        jest.useRealTimers();
      }
    }
  );

  it.each(["abort", "timeout"])(
    "cancels a stuck FileReader and removes listeners on %s",
    async (kind) => {
      jest.useFakeTimers();
      const OriginalReader = global.FileReader;
      const abort = jest.fn();
      const controller = new AbortController();
      const remove = jest.spyOn(controller.signal, "removeEventListener");
      try {
        global.FileReader = class {
          readAsText() {}
          abort = abort;
        } as unknown as typeof FileReader;
        const operation = readPersonalGrowPdfBlob(pdf(), "text", {
          ...options(),
          signal: controller.signal
        });
        const assertion = expect(operation).rejects.toMatchObject({
          code: kind === "abort" ? "PDF_ABORTED" : "PDF_TIMEOUT"
        });
        if (kind === "abort") controller.abort();
        else jest.advanceTimersByTime(10_000);
        await assertion;
        expect(abort).toHaveBeenCalledTimes(1);
        expect(remove).toHaveBeenCalledWith("abort", expect.any(Function));
        expect(jest.getTimerCount()).toBe(0);
      } finally {
        global.FileReader = OriginalReader;
        jest.useRealTimers();
      }
    }
  );
});
