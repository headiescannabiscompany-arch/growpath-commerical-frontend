import { Blob as NodeBlob, Buffer } from "node:buffer";
import { Platform, Share } from "react-native";
import { API_URL, apiRequest } from "@/api/apiRequest";
import { prepareEvidenceImageForUpload } from "@/utils/evidenceImageUpload";
import {
  exportVisualTimeline,
  timelineSummaryForExport
} from "../../src/utils/exportVisualTimeline";

jest.mock("@/api/apiRequest", () => ({
  API_URL: "https://api.example.test",
  apiRequest: jest.fn()
}));
jest.mock("@/api/uploads", () => ({ uploadImage: jest.fn() }));
jest.mock("@/utils/evidenceImageUpload", () => ({
  prepareEvidenceImageForUpload: jest.fn()
}));

describe("timelineSummaryForExport", () => {
  it("keeps ordinary viewer-friendly notes unchanged", () => {
    expect(
      timelineSummaryForExport("Lower leaves improved after the irrigation check.")
    ).toBe("Lower leaves improved after the irrigation check.");
  });

  it("replaces a retained machine payload with a private-record handoff", () => {
    const result = timelineSummaryForExport(
      'Tool: harvest_readiness\n\n{"readinessStatus":"review","evidenceFingerprint":"private-digest"}'
    );

    expect(result).toBe(
      "Tool: harvest_readiness. Detailed evidence remains in the private GrowPath record."
    );
    expect(result).not.toContain("evidenceFingerprint");
    expect(result).not.toContain("private-digest");
  });

  it("bounds oversized prose without pretending the private detail was deleted", () => {
    const result = timelineSummaryForExport("a".repeat(900));

    expect(result.length).toBeLessThan(780);
    expect(result).toContain("Full details remain in the private GrowPath record.");
  });

  it.each([
    "/uploads/1788267244896-853797222.jpg",
    `${API_URL}/api/evidence-assets/uploads/private-photo.jpg?token=private-token`
  ])("replaces a path-only photo summary without printing its source: %s", (path) => {
    expect(timelineSummaryForExport(path)).toBe("Photo saved with this timeline entry.");
  });

  it("preserves ordinary prose that mentions a path rather than being a path-only summary", () => {
    const prose = "The saved photo /uploads/photo.jpg documents the leaf change.";
    expect(timelineSummaryForExport(prose)).toBe(prose);
    const startsWithPath = "/uploads/photo.jpg shows the leaf change.";
    expect(timelineSummaryForExport(startsWithPath)).toBe(startsWithPath);
  });
});

describe("viewer-friendly timeline file export", () => {
  const originalOS = Platform.OS;
  const originalDocument = global.document;
  const originalWindow = global.window;
  const originalBlob = global.Blob;
  const originalReader = global.FileReader;
  const originalFetch = global.fetch;
  const originalCreateUrl = URL.createObjectURL;
  const originalRevokeUrl = URL.revokeObjectURL;
  const photoPath = "/uploads/1788267244896-853797222.jpg";
  const photoUrl = `${API_URL}${photoPath}`;
  const preparedDataUrl = "data:image/jpeg;base64,/9j/2Q==";
  let anchor: {
    href: string;
    download: string;
    click: jest.Mock;
    remove: jest.Mock;
  };
  let appendChild: jest.Mock;
  let readDataUrl: jest.Mock;

  function photoBlob(type = "image/jpeg", bytes = [0xff, 0xd8, 0xff, 0xd9]) {
    return new Blob([new Uint8Array(bytes)], { type });
  }

  function event(photos: string[] = [photoPath], summary = photoPath) {
    return {
      timestamp: "2026-09-01T12:54:05.000Z",
      title: "Aphids found during morning inspection",
      summary,
      photos,
      id: "GrowLog:private-log-id",
      growId: "private-grow-id",
      payload: { evidenceFingerprint: "private-fingerprint" }
    };
  }

  async function downloadedHtml() {
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    const blob = jest.mocked(URL.createObjectURL).mock.calls[0][0] as Blob;
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toMatch(/^text\/html/);
    return blob.text();
  }

  function expectNoDownload() {
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(anchor.click).not.toHaveBeenCalled();
    expect(appendChild).not.toHaveBeenCalled();
  }

  beforeEach(() => {
    jest.useFakeTimers();
    Object.defineProperty(Platform, "OS", { configurable: true, value: "web" });
    global.Blob = NodeBlob as unknown as typeof Blob;
    anchor = { href: "", download: "", click: jest.fn(), remove: jest.fn() };
    appendChild = jest.fn();
    global.document = {
      createElement: jest.fn(() => anchor),
      body: { appendChild }
    } as unknown as Document;
    global.window = {
      location: { origin: "https://growpathai.com" }
    } as unknown as Window & typeof globalThis;
    URL.createObjectURL = jest.fn(() => "blob:local-timeline-download");
    URL.revokeObjectURL = jest.fn();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      blob: async () => photoBlob()
    });
    jest.mocked(apiRequest).mockResolvedValue(photoBlob());
    jest.mocked(prepareEvidenceImageForUpload).mockImplementation(async (blob) => ({
      blob: photoBlob(),
      fileName: "timeline-photo.jpg",
      mimeType: "image/jpeg",
      originalBytes: blob.size,
      uploadBytes: 4,
      optimized: true
    }));
    readDataUrl = jest.fn(
      async (blob: Blob) =>
        `data:${blob.type};base64,${Buffer.from(await blob.arrayBuffer()).toString("base64")}`
    );
    global.FileReader = class {
      result: string | null = null;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      onloadend: (() => void) | null = null;
      onabort: (() => void) | null = null;
      readAsDataURL(blob: Blob) {
        void readDataUrl(blob).then(
          (value: string) => {
            this.result = value;
            this.onload?.();
            this.onloadend?.();
          },
          () => {
            this.onerror?.();
            this.onloadend?.();
          }
        );
      }
      abort() {
        this.onabort?.();
        this.onloadend?.();
      }
    } as unknown as typeof FileReader;
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    Object.defineProperty(Platform, "OS", { configurable: true, value: originalOS });
    global.document = originalDocument;
    global.window = originalWindow;
    global.Blob = originalBlob;
    global.FileReader = originalReader;
    global.fetch = originalFetch;
    URL.createObjectURL = originalCreateUrl;
    URL.revokeObjectURL = originalRevokeUrl;
  });

  it("downloads a real HTML Blob with one prepared read per canonical photo and no private source data", async () => {
    const title = "GrowPathAI Tomato Live Demo — Visual Grow Timeline";
    await expect(
      exportVisualTimeline(title, [
        event(),
        event([photoUrl], "The tomato remains vigorous.")
      ])
    ).resolves.toBe("web-download");

    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(apiRequest).toHaveBeenCalledWith(
      photoUrl,
      expect.objectContaining({
        auth: true,
        responseType: "blob",
        redirect: "error",
        cache: "no-store",
        signal: expect.any(AbortSignal),
        timeoutMs: 20000
      })
    );
    expect(global.fetch).not.toHaveBeenCalled();
    expect(prepareEvidenceImageForUpload).toHaveBeenCalledTimes(1);
    expect(prepareEvidenceImageForUpload).toHaveBeenCalledWith(
      expect.any(Blob),
      expect.any(String),
      expect.objectContaining({
        forceStripMetadata: true,
        signal: expect.any(AbortSignal)
      })
    );
    const html = await downloadedHtml();
    expect(html).toContain(`<h1>${title}</h1>`);
    expect(html).toContain("The tomato remains vigorous.");
    expect(html).toContain("Photo saved with this timeline entry.");
    expect(html.match(/<img /g)).toHaveLength(2);
    expect(html.match(/src="data:image\/jpeg;base64,/g)).toHaveLength(2);
    expect(html).toContain(preparedDataUrl);
    for (const forbidden of [
      photoPath,
      API_URL,
      "private-log-id",
      "private-grow-id",
      "private-fingerprint",
      "evidenceFingerprint"
    ]) {
      expect(html).not.toContain(forbidden);
    }
    expect(anchor.download).toBe("growpathai-tomato-live-demo-visual-grow-timeline.html");
    expect(anchor.href).toBe("blob:local-timeline-download");
    expect(appendChild).toHaveBeenCalledWith(anchor);
    expect(anchor.click).toHaveBeenCalledTimes(1);
    expect(appendChild.mock.invocationCallOrder[0]).toBeLessThan(
      anchor.click.mock.invocationCallOrder[0]
    );
    expect(anchor.remove).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    jest.runOnlyPendingTimers();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:local-timeline-download");
  });

  it("escapes titles and prose and keeps saved machine details out of the downloaded file", async () => {
    await exportVisualTimeline('Tomato <script>alert("x")</script> & story', [
      {
        ...event([], "Leaves <strong>improved</strong> & stayed green."),
        title: 'Leaf "check" <img>'
      },
      event([], 'Tool: harvest_readiness\n\n{"evidenceFingerprint":"private-digest"}')
    ]);
    const html = await downloadedHtml();
    expect(html).toContain(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; story"
    );
    expect(html).toContain("Leaf &quot;check&quot; &lt;img&gt;");
    expect(html).toContain(
      "Leaves &lt;strong&gt;improved&lt;/strong&gt; &amp; stayed green."
    );
    expect(html).toContain("Detailed evidence remains in the private GrowPath record.");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("private-digest");
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it.each([
    "/uploads/photo-id?token=secret",
    "/api/videos/uploads/photo-id?token=secret"
  ])(
    "omits extensionless signed media summaries and queries from the file: %s",
    async (path) => {
      const url = `${API_URL}${path}`;
      expect(timelineSummaryForExport(path)).toBe(
        "Photo saved with this timeline entry."
      );
      expect(timelineSummaryForExport(url)).toBe("Photo saved with this timeline entry.");
      await exportVisualTimeline("Saved photo story", [
        event([url], path),
        event([url], url)
      ]);
      const html = await downloadedHtml();
      expect(html.match(/Photo saved with this timeline entry\./g)).toHaveLength(2);
      expect(html.match(/src="data:image\/jpeg;base64,/g)).toHaveLength(2);
      for (const forbidden of [url, path, "photo-id", "token=", "secret"]) {
        expect(html).not.toContain(forbidden);
      }
      expect(apiRequest).toHaveBeenCalledTimes(1);
      expect(apiRequest).toHaveBeenCalledWith(url, expect.any(Object));
    }
  );

  it.each([
    "https://images.example.net/photo.jpg?signature=private-query",
    "data:image/jpeg;base64,/9j/2Q==",
    "blob:https://growpathai.com/saved-photo"
  ])("reads %s without account credentials or a referrer", async (url) => {
    await exportVisualTimeline("Photo story", [event([url], "Saved image.")]);
    expect(apiRequest).not.toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledWith(
      url,
      expect.objectContaining({
        credentials: "omit",
        referrerPolicy: "no-referrer",
        redirect: "error",
        signal: expect.any(AbortSignal),
        cache: "no-store"
      })
    );
    const options = jest.mocked(global.fetch).mock.calls[0][1];
    expect(options?.headers).toBeUndefined();
    const html = await downloadedHtml();
    if (!url.startsWith("data:")) expect(html).not.toContain(url);
    expect(html).not.toContain("private-query");
    expect(html).toContain(preparedDataUrl);
  });

  it.each([
    "http://images.example.net/photo.jpg",
    "https://user:password@images.example.net/photo.jpg",
    `${API_URL}/api/admin/private-data`,
    "blob:https://other.example.net/private-photo",
    "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4="
  ])(
    "rejects an unsafe or unsupported image source without downloading: %s",
    async (url) => {
      await expect(exportVisualTimeline("Photo story", [event([url])])).rejects.toThrow();
      expect(apiRequest).not.toHaveBeenCalled();
      expect(global.fetch).not.toHaveBeenCalled();
      expectNoDownload();
    }
  );

  it.each(["empty", "wrong MIME", "oversized", "non-Blob"])(
    "does not prepare or download a successful but %s photo response",
    async (kind) => {
      let blob: unknown = photoBlob();
      if (kind === "empty") blob = photoBlob("image/jpeg", []);
      if (kind === "wrong MIME") blob = photoBlob("text/html");
      if (kind === "non-Blob") blob = { size: 4, type: "image/jpeg" };
      if (kind === "oversized") {
        Object.defineProperty(blob, "size", { value: 20 * 1024 * 1024 + 1 });
      }
      jest.mocked(apiRequest).mockResolvedValue(blob);
      await expect(exportVisualTimeline("Photo story", [event()])).rejects.toThrow();
      expect(prepareEvidenceImageForUpload).not.toHaveBeenCalled();
      expectNoDownload();
    }
  );

  it("does not download after a protected photo read fails", async () => {
    jest.mocked(apiRequest).mockRejectedValue(new Error("Photo access denied"));
    await expect(exportVisualTimeline("Photo story", [event()])).rejects.toThrow();
    expectNoDownload();
  });

  it("does not download a failed external response or fall back to its address", async () => {
    jest.mocked(global.fetch).mockResolvedValue({ ok: false, status: 403 } as Response);
    await expect(
      exportVisualTimeline("Photo story", [
        event(["https://images.example.net/photo.jpg"])
      ])
    ).rejects.toThrow();
    expectNoDownload();
    expect(prepareEvidenceImageForUpload).not.toHaveBeenCalled();
  });

  it("saves nothing when metadata removal fails", async () => {
    jest
      .mocked(prepareEvidenceImageForUpload)
      .mockRejectedValueOnce(new Error("Cannot decode this image"));
    await expect(exportVisualTimeline("Photo story", [event()])).rejects.toThrow();
    expectNoDownload();
  });

  it("saves nothing when preparation returns bytes that are not a JPEG", async () => {
    jest.mocked(prepareEvidenceImageForUpload).mockResolvedValue({
      blob: photoBlob("image/png"),
      fileName: "timeline-photo.png",
      mimeType: "image/png",
      originalBytes: 4,
      uploadBytes: 4,
      optimized: false
    });
    await expect(exportVisualTimeline("Photo story", [event()])).rejects.toThrow();
    expectNoDownload();
  });

  it("saves nothing when prepared image encoding fails", async () => {
    readDataUrl.mockRejectedValue(new Error("Cannot read prepared image"));
    await expect(exportVisualTimeline("Photo story", [event()])).rejects.toThrow();
    expectNoDownload();
  });

  it("rejects malformed encoded data instead of embedding unverified output", async () => {
    readDataUrl.mockResolvedValue('data:image/jpeg;base64,broken" onerror="alert(1)');
    await expect(exportVisualTimeline("Photo story", [event()])).rejects.toThrow();
    expectNoDownload();
  });

  it("bounds total embedded output including repeated rendered photo references", async () => {
    readDataUrl.mockResolvedValue(`data:image/jpeg;base64,${"A".repeat(1024 * 1024)}`);
    await expect(
      exportVisualTimeline(
        "Oversized story",
        Array.from({ length: 65 }, () => event())
      )
    ).rejects.toThrow(/file-size limit/i);
    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(prepareEvidenceImageForUpload).toHaveBeenCalledTimes(1);
    expectNoDownload();
  });

  it("aborts an anonymous photo request at the 20-second boundary without downloading", async () => {
    jest.mocked(global.fetch).mockImplementation(
      async (_url, options) =>
        new Promise((_resolve, reject) => {
          options?.signal?.addEventListener("abort", () => reject(new Error("Aborted")));
        })
    );
    const operation = exportVisualTimeline("Photo story", [
      event(["https://images.example.net/photo.jpg"])
    ]);
    const rejected = expect(operation).rejects.toThrow();
    const signal = jest.mocked(global.fetch).mock.calls[0][1]?.signal;
    jest.advanceTimersByTime(19999);
    expect(signal?.aborted).toBe(false);
    jest.advanceTimersByTime(1);
    await rejected;
    expect(signal?.aborted).toBe(true);
    expectNoDownload();
  });

  it("preserves native readable text sharing without photo requests or a browser download", async () => {
    Object.defineProperty(Platform, "OS", { configurable: true, value: "ios" });
    const share = jest
      .spyOn(Share, "share")
      .mockResolvedValue({ action: Share.sharedAction });
    await expect(
      exportVisualTimeline("Native timeline", [
        event([photoPath], "Tomato remains vigorous.")
      ])
    ).resolves.toBe("native-share");
    expect(share).toHaveBeenCalledWith({
      title: "Native timeline",
      message: expect.stringContaining("Tomato remains vigorous.")
    });
    expect(apiRequest).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
    expectNoDownload();
  });
});
