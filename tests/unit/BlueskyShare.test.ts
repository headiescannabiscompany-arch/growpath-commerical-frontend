import { buildPublicShareTargets, publicShareMessage } from "@/utils/publicLinks";

jest.mock("react-native", () => ({
  Platform: { OS: "web" },
  Share: { share: jest.fn() }
}));

describe("Bluesky bounded share repair", () => {
  const preview =
    "https://api.growpathai.com/api/videos/64b7f0a1c2d3e4f567890123/share?v=abc123";
  const stablePreview = `${preview}&preview=bluesky`;
  const path = "/videos/64b7f0a1c2d3e4f567890123";
  const oldApi = process.env.EXPO_PUBLIC_API_URL;
  beforeEach(() => {
    process.env.EXPO_PUBLIC_API_URL = "https://api.growpathai.com/api";
  });
  afterAll(() => {
    if (oldApi === undefined) delete process.env.EXPO_PUBLIC_API_URL;
    else process.env.EXPO_PUBLIC_API_URL = oldApi;
  });

  function share(
    title: string,
    details: Parameters<typeof buildPublicShareTargets>[2] = {}
  ) {
    const targets = buildPublicShareTargets(title, path, {
      socialPreviewUrl: preview,
      ...details
    });
    const target = targets.find((item) => item.key === "bluesky");
    return {
      targets,
      text: target ? new URL(target.href).searchParams.get("text")! : null
    };
  }
  function fits(text: string) {
    const Seg = (Intl as any).Segmenter;
    expect(
      Array.from(new Seg(undefined, { granularity: "grapheme" }).segment(text)).length
    ).toBeLessThanOrEqual(300);
    expect(Buffer.byteLength(text, "utf8")).toBeLessThanOrEqual(3000);
  }

  it("keeps a short title, price and description and selects stable video metadata", () => {
    expect(
      share("Garden video", {
        priceLabel: "$25.00",
        description: "A saved public video."
      }).text
    ).toBe(`Garden video\n$25.00\nA saved public video.\n${stablePreview}`);
  });
  it("bounds the reproduced Facility Teams prefill without altering source fields", () => {
    const details = Object.freeze({
      description:
        "In this episode I discuss growpathai, the all in one gardening ap. In this episode I discuss Facility mode. Free and pro plans and try to give you a taste of all that is GPAI. A place designed with all types of gardeners, farmers, content creators, businesses, and facilities all come together."
    });
    const text = share("GrowPathai Facility Teams", details).text!;
    fits(text);
    expect(text).toMatch(/^GrowPathai Facility Teams\n/);
    expect(text.endsWith(`…\n${stablePreview}`)).toBe(true);
    expect(details.description.endsWith("all come together.")).toBe(true);
  });
  it.each([299, 300, 301])(
    "handles a complete %i-grapheme message boundary",
    (length) => {
      const title = "T".repeat(length - stablePreview.length - 1);
      const text = share(title).text!;
      fits(text);
      expect(text.endsWith(stablePreview)).toBe(true);
      if (length <= 300) expect(text).toBe(`${title}\n${stablePreview}`);
      else expect(text).toContain("…\n");
    }
  );
  it("preserves a fitting complete title when ellipsis would displace its last character", () => {
    const title = "T".repeat(300 - stablePreview.length - 1);
    expect(share(title, { description: "extra" }).text).toBe(
      `${title}\n${stablePreview}`
    );
  });
  it("preserves fitting title and price before dropping description", () => {
    const title = "T".repeat(300 - stablePreview.length - "$25.00".length - 2);
    expect(share(title, { priceLabel: "$25.00", description: "extra" }).text).toBe(
      `${title}\n$25.00\n${stablePreview}`
    );
  });
  it("never emits a misleading partial price when the title fits but price does not", () => {
    const title = "T".repeat(297 - stablePreview.length - 1);
    expect(share(title, { priceLabel: "$250.00", description: "extra" }).text).toBe(
      `${title}\n${stablePreview}`
    );
  });
  it.each(["👩🏽‍🌾", "👨‍👩‍👧‍👦", "e\u0301", "🇿🇦"])("preserves %s grapheme boundaries", (unit) => {
    const text = share("Garden", { description: unit.repeat(400) }).text!;
    fits(text);
    const excerpt = text.slice("Garden\n".length, text.indexOf(`…\n${stablePreview}`));
    expect(excerpt.length).toBeGreaterThan(0);
    expect(excerpt).toBe(unit.repeat(excerpt.length / unit.length));
  });
  it("also respects the UTF-8 byte limit for large combining clusters", () => {
    const unit = `a${"\u0301".repeat(300)}`;
    const text = share("Garden", { description: unit.repeat(20) }).text!;
    fits(text);
    expect(text).toContain(unit);
    expect(text).not.toContain(unit.repeat(5));
  });
  it("keeps a URL within description whole when truncating", () => {
    const extraUrl = "https://example.com/" + "path".repeat(100);
    const text = share("Garden", { description: `Notes ${extraUrl} trailing` }).text!;
    fits(text);
    expect(text).toBe(`Garden\nNotes…\n${stablePreview}`);
  });
  it("falls back to complete words/clusters without Intl.Segmenter", () => {
    const descriptor = Object.getOwnPropertyDescriptor(Intl, "Segmenter");
    let text: string;
    try {
      Object.defineProperty(Intl, "Segmenter", { configurable: true, value: undefined });
      text = share("Garden", { description: "👨‍👩‍👧‍👦 e\u0301 🌱 温室 ".repeat(80) }).text!;
    } finally {
      if (descriptor) Object.defineProperty(Intl, "Segmenter", descriptor);
      else Reflect.deleteProperty(Intl, "Segmenter");
    }
    fits(text!);
    const excerpt = text!.slice("Garden\n".length).split(`…\n${stablePreview}`)[0];
    expect(
      excerpt
        .split(/\s+/u)
        .every((word) => ["👨‍👩‍👧‍👦", "e\u0301", "🌱", "温室"].includes(word))
    ).toBe(true);
  });
  it("omits only an impossible Bluesky target rather than truncating its URL", () => {
    const longUrl = `https://example.com/${"x".repeat(310)}`;
    const result = share("Garden", { socialPreviewUrl: longUrl });
    expect(result.text).toBeNull();
    expect(result.targets.map((item) => item.key)).toEqual([
      "facebook",
      "x",
      "reddit",
      "linkedin",
      "email",
      "text"
    ]);
    expect(
      new URL(result.targets.find((item) => item.key === "email")!.href).searchParams.get(
        "body"
      )
    ).toContain(longUrl);
  });
  it("uses the intact URL alone when it consumes the entire budget", () => {
    const exactUrl = `https://example.com/${"x".repeat(280)}`;
    expect(exactUrl.length).toBe(300);
    expect(share("Garden", { socialPreviewUrl: exactUrl }).text).toBe(exactUrl);
  });
  it.each([
    "https://outside.example/api/videos/64b7f0a1c2d3e4f567890123/share?v=abc123",
    "https://api.growpathai.com/api/forum/64b7f0a1c2d3e4f567890123/share?v=abc123",
    "https://api.growpathai.com/api/creators/64b7f0a1c2d3e4f567890123/share?v=abc123",
    "https://api.growpathai.com/api/videos/not-an-id/share?v=abc123",
    `${preview}#fragment`,
    `${preview}&preview=other`,
    stablePreview
  ])("does not rewrite unrelated, ineligible or already selected URLs: %s", (url) => {
    expect(share("Garden", { socialPreviewUrl: url }).text).toBe(`Garden\n${url}`);
  });
  it("supports the configured staging API without sending a production URL", () => {
    process.env.EXPO_PUBLIC_API_URL = "https://growpath-api-staging.onrender.com";
    const url = preview.replace(
      "https://api.growpathai.com",
      process.env.EXPO_PUBLIC_API_URL
    );
    expect(share("Garden", { socialPreviewUrl: url }).text).toBe(
      `Garden\n${url}&preview=bluesky`
    );
  });
  it("keeps a bare query separator usable for the stable preview selector", () => {
    const url = preview.split("?")[0] + "?";
    const text = share("Garden", { socialPreviewUrl: url }).text!;
    expect(new URL(text.split("\n").at(-1)!).searchParams.get("preview")).toBe("bluesky");
  });
  it("preserves punctuation/Unicode through intent encoding", () => {
    const title = "A & B? #plants + 50% / 🌱";
    expect(share(title, { description: "Notes & questions = yes?" }).text).toBe(
      `${title}\nNotes & questions = yes?\n${stablePreview}`
    );
  });
  it("leaves Copy Post, other providers and source details unchanged", () => {
    const title = "Garden";
    const description = "A saved public video.";
    const details = Object.freeze({ description, socialPreviewUrl: preview });
    const targets = buildPublicShareTargets(title, path, details);
    const full = `${title}\n${description}\n${preview}`;
    expect(publicShareMessage(title, preview, details)).toBe(full);
    const other = Object.fromEntries(
      targets
        .filter((item) => item.key !== "bluesky")
        .map((item) => [item.key, item.href])
    );
    expect(other).toEqual({
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(preview)}`,
      x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${title} — ${description}`)}&url=${encodeURIComponent(preview)}`,
      reddit: `https://www.reddit.com/submit?url=${encodeURIComponent(preview)}&title=Garden`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(preview)}`,
      email: `mailto:?subject=Garden&body=${encodeURIComponent(full)}`,
      text: `sms:?body=${encodeURIComponent(full)}`
    });
    expect(details).toEqual({ description, socialPreviewUrl: preview });
  });
});
