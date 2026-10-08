import fs from "node:fs";
import path from "node:path";
const { webRoutes } = require("../../scripts/web-route-inventory.cjs");
const yaml = require("js-yaml");

describe("Render static route rewrites", () => {
  it.each(["render.yaml", "render.staging.yaml"])(
    "adds bounded security headers without disabling media, analytics or device inputs in %s",
    (file) => {
      const headers = yaml.load(fs.readFileSync(file, "utf8")).services[0].headers;
      const values = Object.fromEntries(
        headers
          .filter((header: { path: string }) => header.path === "/*")
          .map((header: { name: string; value: string }) => [header.name, header.value])
      );
      expect(values["Strict-Transport-Security"]).toBe("max-age=31536000");
      expect(values["X-Content-Type-Options"]).toBe("nosniff");
      expect(values["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
      expect(values["X-Frame-Options"]).toBe("SAMEORIGIN");
      expect(values["Content-Security-Policy"]).toBe(
        "base-uri 'self'; object-src 'none'; frame-ancestors 'self'"
      );
      expect(values["Permissions-Policy"]).toBeUndefined();
      expect(JSON.stringify(values)).not.toMatch(
        /includeSubDomains|preload|default-src|frame-src|connect-src/
      );
    }
  );
  it.each(["render.yaml", "render.staging.yaml"])(
    "serves audit pages without rewriting unknown roots to the homepage in %s",
    (file) => {
      // Git may check YAML out with CRLF on Windows; route semantics are unchanged.
      const config = fs
        .readFileSync(path.resolve(process.cwd(), file), "utf8")
        .replace(/\r\n/g, "\n");
      for (const route of ["/vs/growtrackr", "/grow-journal-app"]) {
        expect(config).toContain(
          `source: ${route}\n        destination: ${route}/index.html`
        );
        expect(config).not.toContain("source: /*");
      }
    }
  );
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
      "/logs/*",
      "/creators/*",
      "/grow-timeline/*"
    ];

    for (const prefix of requiredPrefixes) {
      expect(config).toContain(`source: ${prefix}`);
    }

    const catchAllIndex = config.indexOf("source: /*");
    expect(catchAllIndex).toBe(-1);
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
      "/logs/*",
      "/creators/*",
      "/grow-timeline/*"
    ];
    const catchAllIndex = config.indexOf("source: /*");
    expect(catchAllIndex).toBe(-1);
    for (const prefix of requiredPrefixes) {
      expect(config.indexOf(`source: ${prefix}`)).toBeGreaterThan(-1);
    }
  });

  it.each(["render.yaml", "render.staging.yaml"])(
    "covers every existing dynamic route in %s, including public share links",
    (file) => {
      const rules = yaml.load(fs.readFileSync(file, "utf8")).services[0].routes;
      for (const route of webRoutes(path.resolve("src/app")).filter((route: string) =>
        route.includes("[")
      )) {
        const match = rules.find(
          (rule: { source: string; destination: string }) =>
            rule.source.endsWith("/*") &&
            ("/" + route).startsWith(rule.source.slice(0, -1))
        );
        expect({ route, destination: match?.destination }).toEqual({
          route,
          destination: "/index.html"
        });
      }
      expect(rules.some((rule: { source: string }) => rule.source === "/*")).toBe(false);
    }
  );

  it("discovers literal claim, live and workspace shells from the existing router", () => {
    const routes: string[] = webRoutes(path.resolve("src/app"));
    for (const route of [
      "claim-complimentary-access",
      "live-studio",
      "live-session",
      "live-overlay",
      "account/workspace",
      "home/facility/reports"
    ])
      expect(routes).toContain(route);
    expect(
      routes.some(
        (route) =>
          route.includes("(tabs)") || route.includes("_layout") || route.includes(".web")
      )
    ).toBe(false);
  });
});
