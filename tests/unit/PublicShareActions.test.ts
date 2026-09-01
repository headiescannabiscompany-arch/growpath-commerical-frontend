import { buildPublicShareTargets, publicShareMessage } from "@/utils/publicLinks";

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
});
