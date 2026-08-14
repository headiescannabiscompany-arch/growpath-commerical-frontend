import { buildPublicShareTargets } from "@/utils/publicLinks";

describe("buildPublicShareTargets", () => {
  it("keeps every destination anchored to the canonical GrowPath URL", () => {
    const targets = buildPublicShareTargets("A useful grow update", "/forum/post/example");
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
});
