/** @jest-environment jsdom */

import {
  applyPublicRouteMetadata,
  metadataForPathname,
  normalizePublicRoute
} from "@/seo/publicRouteMetadata";

describe("public route metadata", () => {
  it("normalizes paths and returns the shared route-specific metadata", () => {
    expect(normalizePublicRoute("/facility-management/?source=test#top")).toBe(
      "facility-management"
    );
    expect(metadataForPathname("/pricing")).toMatchObject({
      title: "GrowPathAI Pricing and Plans",
      index: true
    });
    expect(metadataForPathname("/account/delete")).toMatchObject({
      title: "Delete Account | GrowPath",
      index: false
    });
  });

  it("fails closed for private or unknown application routes", () => {
    expect(metadataForPathname("/home/facility/dashboard")).toEqual(
      expect.objectContaining({ title: "GrowPath App", index: false })
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
    expect(document.title).toBe("GrowPath App");
    expect(document.querySelector('meta[name="robots"]')?.getAttribute("content")).toBe(
      "noindex,nofollow"
    );
  });
});
