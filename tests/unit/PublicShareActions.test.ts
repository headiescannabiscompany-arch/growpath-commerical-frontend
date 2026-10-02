import {
  buildPublicShareTargets,
  currentPublicUrl,
  publicShareMessage
} from "@/utils/publicLinks";

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
