import fs from "node:fs";
import path from "node:path";

describe("Render static route rewrites", () => {
  it("serves every root-level dynamic Expo route through the application shell", () => {
    const config = fs.readFileSync(path.resolve(process.cwd(), "render.yaml"), "utf8");
    const requiredPrefixes = [
      "/home/*",
      "/videos/*",
      "/store/*",
      "/storefront/*",
      "/brands/*",
      "/forum/*",
      "/field-observations/*",
      "/facilities/*",
      "/alerts/*",
      "/tasks/*",
      "/logs/*"
    ];

    for (const prefix of requiredPrefixes) {
      expect(config).toContain(`source: ${prefix}`);
    }

    const catchAllIndex = config.indexOf("source: /*");
    expect(catchAllIndex).toBeGreaterThan(-1);
    for (const prefix of requiredPrefixes) {
      expect(config.indexOf(`source: ${prefix}`)).toBeLessThan(catchAllIndex);
    }
  });

  it("keeps the staging static site isolated and manually deployed", () => {
    const config = fs.readFileSync(
      path.resolve(process.cwd(), "render.staging.yaml"),
      "utf8"
    );

    expect(config).toContain("branch: staging");
    expect(config).toContain("autoDeployTrigger: off");
    expect(config).toContain("buildCommand: npm run export:web:staging");
    expect(config).toContain("staticPublishPath: dist");
    expect(config).toMatch(/key: EXPO_PUBLIC_API_URL\s+sync: false/);
    expect(config).toMatch(/key: GROWPATH_SITE_URL\s+sync: false/);
    expect(config).toContain("value: noindex, nofollow");

    const requiredPrefixes = [
      "/home/*",
      "/videos/*",
      "/store/*",
      "/storefront/*",
      "/brands/*",
      "/forum/*",
      "/field-observations/*",
      "/facilities/*",
      "/alerts/*",
      "/tasks/*",
      "/logs/*"
    ];
    const catchAllIndex = config.indexOf("source: /*");
    expect(catchAllIndex).toBeGreaterThan(-1);
    for (const prefix of requiredPrefixes) {
      expect(config.indexOf(`source: ${prefix}`)).toBeGreaterThan(-1);
      expect(config.indexOf(`source: ${prefix}`)).toBeLessThan(catchAllIndex);
    }
  });
});
