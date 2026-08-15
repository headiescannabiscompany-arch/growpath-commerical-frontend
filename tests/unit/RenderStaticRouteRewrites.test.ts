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
});
