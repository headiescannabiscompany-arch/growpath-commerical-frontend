import {
  buildPublicShareTargets,
  currentPublicUrl,
  publicShareMessage
} from "@/utils/publicLinks";

const { parseTweet } = require("twitter-text") as {
  parseTweet(text: string): { valid: boolean; weightedLength: number };
};

describe("buildPublicShareTargets", () => {
  it("keeps every destination anchored to the canonical GrowPath URL", () => {
    const targets = buildPublicShareTargets(
      "A useful grow update",
      "/forum/post/example"
    );
    const decoded = targets.map((target) => decodeURIComponent(target.href)).join("\n");

    expect(targets.map((target) => target.key)).toEqual([
      "facebook",
      "x",
      "bluesky",
      "reddit",
      "linkedin",
      "email",
      "text"
    ]);
    expect(decoded).toContain("https://growpathai.com/forum/post/example");
    expect(decoded).toContain("A useful grow update");
  });

  it("uses the server-rendered product preview for social crawlers", () => {
    const previewUrl =
      "https://api.growpathai.com/api/commercial/storefront/public/growpathai/products/abc/share";
    const path = "/store/growpathai/products/abc";
    const details = {
      priceLabel: "$49.00",
      description: "Navy corduroy hat with red script embroidery.",
      socialPreviewUrl: previewUrl
    };
    const targets = buildPublicShareTargets("Night Script Cord", path, details);
    const facebook = targets.find((target) => target.key === "facebook");
    const x = targets.find((target) => target.key === "x");

    expect(decodeURIComponent(facebook?.href || "")).toContain(previewUrl);
    expect(decodeURIComponent(x?.href || "")).toContain(previewUrl);
    expect(publicShareMessage("Night Script Cord", path, details)).toBe(
      "Night Script Cord\n$49.00\nNavy corduroy hat with red script embroidery.\nhttps://growpathai.com/store/growpathai/products/abc"
    );
  });

  it("uses the configured staging origin for non-browser share links", () => {
    const previousSiteUrl = process.env.EXPO_PUBLIC_SITE_URL;
    process.env.EXPO_PUBLIC_SITE_URL = "https://growpath-web-staging.onrender.com/";
    try {
      expect(currentPublicUrl("/live-session?sessionId=stage-1")).toBe(
        "https://growpath-web-staging.onrender.com/live-session?sessionId=stage-1"
      );
    } finally {
      if (previousSiteUrl === undefined) delete process.env.EXPO_PUBLIC_SITE_URL;
      else process.env.EXPO_PUBLIC_SITE_URL = previousSiteUrl;
    }
  });

  it("keeps all video share destinations on the versioned preview, not the media file", () => {
    const preview =
      "https://api.growpathai.com/api/videos/64b7f0a1c2d3e4f567890123/share?v=abc123";
    const targets = buildPublicShareTargets(
      "Garden video & questions",
      "/videos/64b7f0a1c2d3e4f567890123",
      { socialPreviewUrl: preview, description: "A saved public video." }
    );
    expect(targets).toHaveLength(7);
    for (const target of targets) {
      expect(decodeURIComponent(target.href)).toContain(preview);
      expect(target.href).not.toMatch(/\.mp4|playback|uploads/);
    }
    expect(currentPublicUrl(preview)).toBe(preview);
    expect(
      publicShareMessage("Garden video & questions", preview, {
        description: "A saved public video."
      })
    ).toBe(`Garden video & questions\nA saved public video.\n${preview}`);
  });
});

describe("X share prefill weighted limit", () => {
  const title = "QA synthetic course discussion — October 5, 2026";
  const path = "/forum/post/6ac40517ce9a9b61ea348fef";
  const preview =
    "https://growpath-api-staging.onrender.com/api/forum/6ac40517ce9a9b61ea348fef/share?v=912606a3029aa815";

  function xShare(
    shareTitle: string,
    details: Parameters<typeof buildPublicShareTargets>[2] = {}
  ) {
    const targets = buildPublicShareTargets(shareTitle, path, {
      ...details,
      socialPreviewUrl: preview
    });
    const target = targets.find((item) => item.key === "x")!;
    const intent = new URL(target.href);
    expect(intent.origin).toBe("https://twitter.com");
    expect(intent.pathname).toBe("/intent/tweet");
    expect(intent.searchParams.get("url")).toBe(preview);
    expect(intent.searchParams.getAll("url")).toHaveLength(1);
    expect(intent.searchParams.has("hashtags")).toBe(false);
    const text = intent.searchParams.get("text")!;
    // Validate the actual composed tweet, including the separately supplied URL
    // and separator, with X's official weighting rather than JS string length.
    const parsed = parseTweet(`${text} ${intent.searchParams.get("url")}`);
    expect(parsed.valid).toBe(true);
    expect(parsed.weightedLength).toBeLessThanOrEqual(280);
    return { text, parsed, targets };
  }

  it("bounds a long discussion excerpt while preserving its full title and versioned URL", () => {
    const description =
      "Synthetic staging-only discussion for navigation review. ".repeat(12);
    const result = xShare(title, { description });
    expect(result.text.startsWith(title)).toBe(true);
    expect(result.text.length).toBeLessThan(`${title} — ${description}`.length);
    expect(result.text).not.toContain(preview);
  });

  it("retains a complete prefill at exactly 280 weighted characters", () => {
    const description = "a".repeat(248);
    const result = xShare("Title", { description });
    expect(result.text).toBe(`Title — ${description}`);
    expect(result.parsed.weightedLength).toBe(280);
  });

  it("truncates a prefill one weighted character over the boundary", () => {
    const description = "a".repeat(249);
    expect(parseTweet(`Title — ${description} ${preview}`).weightedLength).toBe(281);
    const result = xShare("Title", { description });
    expect(result.text.startsWith("Title")).toBe(true);
    expect(result.text).not.toBe(`Title — ${description}`);
  });

  it("keeps title, price and description in order when the entire summary fits", () => {
    const result = xShare("Night Script Cord", {
      priceLabel: "$49.00",
      description: "Navy corduroy with red script."
    });
    expect(result.text).toBe(
      "Night Script Cord — $49.00 — Navy corduroy with red script."
    );
  });

  it("preserves a fitting full title and price before spending remaining space on description", () => {
    const fittingTitle = "A".repeat(240);
    const result = xShare(fittingTitle, {
      priceLabel: "$49.00",
      description: "Description must yield before the saved title and price. ".repeat(12)
    });
    expect(result.text.startsWith(`${fittingTitle} — $49.00`)).toBe(true);
  });

  it("omits an unfitting price rather than sharing a misleading partial amount", () => {
    const fittingTitle = "A".repeat(250);
    const result = xShare(fittingTitle, {
      priceLabel: "$49.00",
      description: "Description cannot justify a partial price."
    });
    expect(result.text).toBe(fittingTitle);
    expect(result.text).not.toContain("$");
  });

  it("counts repeated ZWJ emoji by official tweet weight, not UTF-16 length", () => {
    const description = "👩‍👩‍👧‍👦".repeat(120);
    const result = xShare("Title", { description });
    expect(result.text).toBe(`Title — ${description}`);
    expect(result.text.length).toBeGreaterThan(280);
    expect(result.parsed.weightedLength).toBe(272);
  });

  it("truncates an over-limit ZWJ sequence only between complete emoji", () => {
    const description = "👩‍👩‍👧‍👦".repeat(200);
    const result = xShare("Title", { description });
    expect(result.text.startsWith("Title — ")).toBe(true);
    const excerpt = result.text.slice("Title — ".length).replace(/…$/u, "");
    expect(excerpt).toMatch(/^(?:👩‍👩‍👧‍👦)+$/u);
    expect(excerpt.length).toBeLessThan(description.length);
  });

  it("keeps fitting combining sequences intact at the weighted boundary", () => {
    const description = "e\u0301".repeat(248);
    const result = xShare("Title", { description });
    expect(result.text.normalize("NFC")).toBe(`Title — ${description}`.normalize("NFC"));
    expect(result.parsed.weightedLength).toBe(280);
  });

  it("bounds mixed CJK, emoji and combining text without changing a fitting title", () => {
    const unicodeTitle = "植物 🌱 Cafe\u0301";
    const result = xShare(unicodeTitle, {
      description: "温室 🌱 👩‍👩‍👧‍👦 e\u0301 観察 ".repeat(80)
    });
    expect(result.text.startsWith(unicodeTitle)).toBe(true);
  });

  it("budgets embedded short URLs using their transformed weight", () => {
    const description = "https://x.co ".repeat(30).trim();
    const result = xShare("Links", { description });
    expect(result.text.startsWith("Links — https://x.co")).toBe(true);
    expect(result.text).not.toBe(`Links — ${description}`);
  });

  it.each([
    { padding: 210, keepsUrl: true },
    { padding: 225, keepsUrl: false }
  ])(
    "keeps or omits a whole embedded URL at padding $padding",
    ({ padding, keepsUrl }) => {
      const embedded =
        "https://example.com/synthetic/reference/with/a/long/path?source=garden&view=notes#details";
      const result = xShare("Title", {
        description: `${"a".repeat(padding)} ${embedded} ${"trailing notes ".repeat(30)}`
      });
      if (keepsUrl) {
        expect(result.text).toContain(embedded);
      } else {
        expect(result.text).not.toContain("https:");
        expect(result.text).not.toContain("example.com");
      }
    }
  );

  it("counts hashtag text normally and retains it unchanged when exactly fitting", () => {
    const description = `#${"a".repeat(247)}`;
    const result = xShare("Title", { description });
    expect(result.text).toBe(`Title — ${description}`);
    expect(result.parsed.weightedLength).toBe(280);
  });

  it("bounds an overlong title without sacrificing the complete preview URL", () => {
    const overlongTitle = "🌱".repeat(200);
    const result = xShare(overlongTitle);
    expect(result.text.startsWith("🌱")).toBe(true);
    expect(result.text).not.toBe(overlongTitle);
    expect(result.text.length).toBeLessThan(overlongTitle.length);
  });

  it.each([
    { heading: "A".repeat(256), priceLabel: undefined },
    { heading: "A".repeat(247), priceLabel: "$49.00" }
  ])(
    "preserves an exactly fitting title/price before description (price $priceLabel)",
    ({ heading, priceLabel }) => {
      const result = xShare(heading, {
        priceLabel,
        description: "Description cannot displace an exactly fitting heading."
      });
      expect(result.text).toBe(priceLabel ? `${heading} — ${priceLabel}` : heading);
      expect(result.parsed.weightedLength).toBe(280);
    }
  );

  it("keeps Unicode chunks whole when Intl.Segmenter is unavailable", () => {
    const descriptor = Object.getOwnPropertyDescriptor(Intl, "Segmenter");
    Object.defineProperty(Intl, "Segmenter", { configurable: true, value: undefined });
    try {
      const words = ["👩‍👩‍👧‍👦", "e\u0301", "🌱", "温室"];
      const result = xShare("Title", { description: `${words.join(" ")} `.repeat(80) });
      expect(result.text.startsWith("Title — ")).toBe(true);
      const excerpt = result.text.slice("Title — ".length).replace(/…$/u, "").trim();
      expect(excerpt.length).toBeGreaterThan(0);
      expect(excerpt.split(/\s+/u).every((word) => words.includes(word))).toBe(true);
    } finally {
      if (descriptor) Object.defineProperty(Intl, "Segmenter", descriptor);
      else Reflect.deleteProperty(Intl, "Segmenter");
    }
  });

  it("preserves reserved punctuation and Unicode in decoded parameters", () => {
    const punctuationTitle = "A & B? #plants + 50% / 🌱";
    const description = "Notes & questions = yes?";
    const result = xShare(punctuationTitle, { description });
    expect(result.text).toBe(`${punctuationTitle} — ${description}`);
  });

  it("does not shorten Copy Post, email or text-message content, or mutate source details", () => {
    const details = {
      priceLabel: "$49.00",
      description: "The complete saved description stays available outside X. "
        .repeat(12)
        .trim(),
      socialPreviewUrl: preview
    };
    const original = { ...details };
    const fullPost = `${title}\n${details.priceLabel}\n${details.description}\n${preview}`;
    const result = xShare(title, details);
    expect(publicShareMessage(title, preview, details)).toBe(fullPost);
    expect(result.text.length).toBeLessThan(fullPost.length);
    for (const key of ["email", "text"]) {
      const target = result.targets.find((item) => item.key === key)!;
      expect(new URL(target.href).searchParams.get("body")).toBe(fullPost);
    }
    const email = result.targets.find((item) => item.key === "email")!;
    expect(new URL(email.href).searchParams.get("subject")).toBe(title);
    expect(details).toEqual(original);
  });
});
