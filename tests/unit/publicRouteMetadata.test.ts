/** @jest-environment jsdom */

import {
  applyPublicRouteMetadata,
  metadataForPathname,
  normalizePublicRoute
} from "@/seo/publicRouteMetadata";

describe("public route metadata", () => {
  it.each(["vs/growtrackr", "grow-journal-app"])(
    "gives the new audit page %s its own share/search metadata",
    (route) => {
      document.head.innerHTML = "";
      applyPublicRouteMetadata(`/${route}`);
      expect(metadataForPathname(`/${route}`).index).toBe(true);
      expect(document.title).not.toBe("GrowPathAI App");
      expect(document.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe(
        `https://growpathai.com/${route}`
      );
      expect(
        document.querySelector('meta[property="og:url"]')?.getAttribute("content")
      ).toBe(`https://growpathai.com/${route}`);
      expect(document.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    }
  );
  it("replaces price and FAQ schema when navigating without a reload", () => {
    document.head.innerHTML = "";
    applyPublicRouteMetadata("/pricing");
    const script = () =>
      document.querySelector('script[type="application/ld+json"]')?.textContent || "";
    expect(script()).toContain('"@type":"FAQPage"');
    expect(script()).toContain('"price":"100"');
    applyPublicRouteMetadata("/about");
    expect(script()).not.toContain("FAQPage");
    expect(document.querySelectorAll('script[type="application/ld+json"]')).toHaveLength(
      1
    );
    applyPublicRouteMetadata("/home/personal");
    expect(script()).toBe("");
  });
  it("normalizes paths and returns the shared route-specific metadata", () => {
    expect(normalizePublicRoute("/facility-management/?source=test#top")).toBe(
      "facility-management"
    );
    expect(metadataForPathname("/pricing")).toMatchObject({
      title: "GrowPathAI Pricing and Plans",
      index: true
    });
    expect(metadataForPathname("/account/delete")).toMatchObject({
      title: "Delete Account | GrowPathAI",
      index: false
    });
  });

  it("fails closed for private or unknown application routes", () => {
    expect(metadataForPathname("/home/facility/dashboard")).toEqual(
      expect.objectContaining({ title: "GrowPathAI App", index: false })
    );
  });

  it("updates title, canonical, description, robots, and social metadata", () => {
    document.head.innerHTML = "";

    applyPublicRouteMetadata("/features");

    expect(document.title).toBe("GrowPathAI Features | Connected cultivation workflows");
    expect(
      document.querySelector('meta[name="description"]')?.getAttribute("content")
    ).toContain("connected planning");
    expect(document.querySelector('meta[name="robots"]')?.getAttribute("content")).toBe(
      "index,follow"
    );
    expect(
      document.querySelector('meta[property="og:title"]')?.getAttribute("content")
    ).toBe(document.title);
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe(
      "https://growpathai.com/features"
    );

    applyPublicRouteMetadata("/home/personal");
    expect(document.title).toBe("GrowPathAI App");
    expect(document.querySelector('meta[name="robots"]')?.getAttribute("content")).toBe(
      "noindex,nofollow"
    );
  });

  it("uses the staging canonical origin and forces every route to noindex,nofollow", () => {
    const previousSiteUrl = process.env.EXPO_PUBLIC_SITE_URL;
    const previousTarget = process.env.EXPO_PUBLIC_WEB_EXPORT_TARGET;
    process.env.EXPO_PUBLIC_SITE_URL = "https://growpath-web-staging.onrender.com/";
    process.env.EXPO_PUBLIC_WEB_EXPORT_TARGET = "staging";
    document.head.innerHTML = "";

    try {
      applyPublicRouteMetadata("/features");
      expect(document.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe(
        "https://growpath-web-staging.onrender.com/features"
      );
      expect(
        document.querySelector('meta[property="og:url"]')?.getAttribute("content")
      ).toBe("https://growpath-web-staging.onrender.com/features");
      expect(document.querySelector('meta[name="robots"]')?.getAttribute("content")).toBe(
        "noindex,nofollow"
      );
    } finally {
      if (previousSiteUrl === undefined) delete process.env.EXPO_PUBLIC_SITE_URL;
      else process.env.EXPO_PUBLIC_SITE_URL = previousSiteUrl;
      if (previousTarget === undefined) delete process.env.EXPO_PUBLIC_WEB_EXPORT_TARGET;
      else process.env.EXPO_PUBLIC_WEB_EXPORT_TARGET = previousTarget;
    }
  });
});
