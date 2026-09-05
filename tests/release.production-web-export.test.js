const { spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const root = path.resolve(__dirname, "..");

function writeFile(tempRoot, relPath, contents) {
  const absolute = path.join(tempRoot, relPath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, contents);
}

function createExportRoot() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "growpath-export-"));
  fs.mkdirSync(path.join(tempRoot, "scripts"), { recursive: true });
  fs.mkdirSync(path.join(tempRoot, "node_modules", "expo", "bin"), {
    recursive: true
  });
  fs.mkdirSync(path.join(tempRoot, "node_modules", "maplibre-gl", "dist"), {
    recursive: true
  });

  fs.copyFileSync(
    path.join(root, "scripts", "export-production-web.cjs"),
    path.join(tempRoot, "scripts", "export-production-web.cjs")
  );
  writeFile(
    tempRoot,
    "src/seo/publicRouteMetadata.json",
    fs.readFileSync(path.join(root, "src", "seo", "publicRouteMetadata.json"), "utf8")
  );

  writeFile(
    tempRoot,
    "node_modules/expo/bin/cli",
    `
const fs = require("fs");
const path = require("path");

const outIndex = process.argv.indexOf("--output-dir");
const outputDir = outIndex >= 0 ? process.argv[outIndex + 1] : "dist";
const absoluteOutputDir = path.resolve(process.cwd(), outputDir);
fs.mkdirSync(absoluteOutputDir, { recursive: true });
fs.mkdirSync(path.join(absoluteOutputDir, "_expo", "static", "js", "web"), {
  recursive: true
});
const apiUrl = process.env.EXPO_PUBLIC_API_URL || "";
const siteUrl = process.env.EXPO_PUBLIC_SITE_URL || "";
const exportTarget = process.env.EXPO_PUBLIC_WEB_EXPORT_TARGET || "";
fs.writeFileSync(
  path.join(absoluteOutputDir, "index.html"),
  \`<!doctype html><html><head><title>GrowPath</title></head><body><div id="root"></div><noscript></noscript><script src="/_expo/static/js/web/index-stable.js"></script><script>window.__apiBase = "\${apiUrl}"; window.__siteBase = "\${siteUrl}"; window.__exportTarget = "\${exportTarget}";</script></body></html>\`
);
fs.writeFileSync(
  path.join(absoluteOutputDir, "_expo", "static", "js", "web", "index-stable.js"),
  \`window.__apiBase = "\${apiUrl}"; window.__siteBase = "\${siteUrl}"; window.__exportTarget = "\${exportTarget}";\`
);
console.log("fake expo export complete");
`
  );

  writeFile(tempRoot, "node_modules/maplibre-gl/dist/maplibre-gl.mjs", "export {};");
  writeFile(
    tempRoot,
    "node_modules/maplibre-gl/dist/maplibre-gl-shared.mjs",
    "export {};"
  );

  return tempRoot;
}

function runExport(tempRoot, env = {}, args = []) {
  return spawnSync(
    process.execPath,
    [path.join(tempRoot, "scripts", "export-production-web.cjs"), ...args],
    {
      cwd: tempRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        EXPO_PUBLIC_API_URL: "",
        GROWPATH_SITE_URL: "",
        GROWPATH_WEB_EXPORT_TARGET: "",
        ...env
      }
    }
  );
}

describe("production web export", () => {
  it("keeps the production fallback, canonical, and indexing behavior unchanged", () => {
    const tempRoot = createExportRoot();

    const result = runExport(tempRoot, {
      EXPO_PUBLIC_API_URL: "https://",
      GROWPATH_SITE_URL: "https://ignored-staging.example.com"
    });

    expect(result.status).toBe(0);
    expect(result.stderr).toMatch(/Using fallback EXPO_PUBLIC_API_URL/);

    const indexHtml = fs.readFileSync(path.join(tempRoot, "dist", "index.html"), "utf8");
    expect(indexHtml).toContain("https://api.growpathai.com");
    expect(indexHtml).toContain('window.__siteBase = "https://growpathai.com"');
    expect(indexHtml).toContain('<meta name="robots" content="index,follow" />');
    expect(indexHtml).toContain('<link rel="canonical" href="https://growpathai.com" />');
    expect(indexHtml).not.toContain('https://"');
    expect(indexHtml).toMatch(
      /\/_expo\/static\/js\/web\/index-stable\.js\?v=[a-f0-9]{12}/
    );

    const fallbackHtml = fs.readFileSync(
      path.join(tempRoot, "dist", "courses", "index.html"),
      "utf8"
    );
    expect(fallbackHtml).toMatch(
      /\/_expo\/static\/js\/web\/index-stable\.js\?v=[a-f0-9]{12}/
    );
    expect(fs.readFileSync(path.join(tempRoot, "dist", "robots.txt"), "utf8")).toContain(
      "Allow: /"
    );
    expect(fs.existsSync(path.join(tempRoot, "dist", "sitemap.xml"))).toBe(true);
    expect(
      fs.existsSync(
        path.join(tempRoot, "dist", "growpathai-2026-indexnow-7f4b2a91c6d8e305.txt")
      )
    ).toBe(true);
  });

  it("builds an exact isolated staging target without production request URLs", () => {
    const tempRoot = createExportRoot();
    const stagingApi = "https://growpath-api-staging.onrender.com";
    const stagingSite = "https://growpath-web-staging.onrender.com";

    const result = runExport(
      tempRoot,
      {
        EXPO_PUBLIC_API_URL: stagingApi,
        GROWPATH_SITE_URL: stagingSite
      },
      ["--target", "staging"]
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/Staging web export verified/);
    const indexHtml = fs.readFileSync(path.join(tempRoot, "dist", "index.html"), "utf8");
    const bundle = fs.readFileSync(
      path.join(tempRoot, "dist", "_expo", "static", "js", "web", "index-stable.js"),
      "utf8"
    );
    expect(indexHtml).toContain(stagingApi);
    expect(indexHtml).toContain(stagingSite);
    expect(indexHtml).toContain('<meta name="robots" content="noindex,nofollow" />');
    expect(indexHtml).toContain(`<link rel="canonical" href="${stagingSite}" />`);
    expect(bundle).toContain(stagingApi);
    expect(bundle).toContain(stagingSite);
    expect(bundle).not.toContain("https://api.growpathai.com/api/");
    expect(fs.readFileSync(path.join(tempRoot, "dist", "robots.txt"), "utf8")).toBe(
      "User-agent: *\nDisallow: /\n"
    );
    expect(fs.existsSync(path.join(tempRoot, "dist", "sitemap.xml"))).toBe(false);
    expect(
      fs.existsSync(
        path.join(tempRoot, "dist", "growpathai-2026-indexnow-7f4b2a91c6d8e305.txt")
      )
    ).toBe(false);
  });

  it.each([
    ["blank API", "", "https://growpath-web-staging.onrender.com"],
    ["malformed API", "not-a-url", "https://growpath-web-staging.onrender.com"],
    [
      "insecure API",
      "http://growpath-api-staging.example.com",
      "https://growpath-web-staging.onrender.com"
    ],
    ["local API", "https://localhost", "https://growpath-web-staging.onrender.com"],
    ["private API", "https://192.168.1.20", "https://growpath-web-staging.onrender.com"],
    [
      "production API",
      "https://api.growpathai.com",
      "https://growpath-web-staging.onrender.com"
    ],
    [
      "API path",
      "https://growpath-api-staging.onrender.com/v1",
      "https://growpath-web-staging.onrender.com"
    ],
    ["blank site", "https://growpath-api-staging.onrender.com", ""],
    ["malformed site", "https://growpath-api-staging.onrender.com", "not-a-url"],
    [
      "insecure site",
      "https://growpath-api-staging.onrender.com",
      "http://growpath-web-staging.example.com"
    ],
    ["local site", "https://growpath-api-staging.onrender.com", "https://127.0.0.1"],
    [
      "production site",
      "https://growpath-api-staging.onrender.com",
      "https://growpathai.com"
    ],
    [
      "same API and site",
      "https://growpath-staging.onrender.com",
      "https://growpath-staging.onrender.com"
    ]
  ])("rejects %s before Expo runs", (_label, apiUrl, siteUrl) => {
    const tempRoot = createExportRoot();
    const result = runExport(tempRoot, {
      GROWPATH_WEB_EXPORT_TARGET: "staging",
      EXPO_PUBLIC_API_URL: apiUrl,
      GROWPATH_SITE_URL: siteUrl
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/Staging web export configuration rejected/);
    expect(fs.existsSync(path.join(tempRoot, "dist"))).toBe(false);
  });

  it("rejects an unknown export target instead of silently producing production", () => {
    const tempRoot = createExportRoot();
    const result = runExport(tempRoot, {
      GROWPATH_WEB_EXPORT_TARGET: "preview"
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/must be either production or staging/);
    expect(fs.existsSync(path.join(tempRoot, "dist"))).toBe(false);
  });

  it("pins the production package command against an ambient staging target", () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(root, "package.json"), "utf8")
    );
    expect(packageJson.scripts["export:web:production"]).toBe(
      "node scripts/export-production-web.cjs --target production"
    );

    const tempRoot = createExportRoot();
    const result = runExport(
      tempRoot,
      {
        GROWPATH_WEB_EXPORT_TARGET: "staging",
        EXPO_PUBLIC_API_URL: "https://api.growpathai.com",
        GROWPATH_SITE_URL: "https://wrong-staging-origin.example.com"
      },
      ["--target", "production"]
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/Production web export verified/);
    const indexHtml = fs.readFileSync(path.join(tempRoot, "dist", "index.html"), "utf8");
    expect(indexHtml).toContain('window.__siteBase = "https://growpathai.com"');
    expect(indexHtml).not.toContain("wrong-staging-origin.example.com");
  });

  it("keeps runtime social previews, shares, overlays, and feeds on their configured origins", () => {
    const productSource = fs.readFileSync(
      path.join(root, "src", "app", "store", "[slug]", "products", "[productId].tsx"),
      "utf8"
    );
    const fieldStudySource = fs.readFileSync(
      path.join(
        root,
        "src",
        "app",
        "home",
        "personal",
        "(tabs)",
        "field-studies",
        "[studyId].tsx"
      ),
      "utf8"
    );
    const liveSource = fs.readFileSync(
      path.join(root, "src", "screens", "LiveSessionScreen.js"),
      "utf8"
    );

    expect(productSource).toContain("`${API_URL}/api/commercial/storefront/public/");
    expect(fieldStudySource).toContain(
      "`${API_URL}/api/personal/field-studies/public/studies/"
    );
    expect(productSource).not.toContain("https://api.growpathai.com");
    expect(fieldStudySource).not.toContain("https://api.growpathai.com");
    expect(liveSource).not.toMatch(
      /https:\/\/growpathai\.com\/(?:live-overlay|api\/lives\/giveaway-feed)/
    );
    expect(liveSource).toContain("currentPublicUrl(");
    expect(liveSource).toMatch(
      /import\s*\{[^}]*API_URL[^}]*\}\s*from\s*["']\.\.\/api\/apiRequest["']/
    );
    expect(liveSource).toContain("`${API_URL}/api/lives/giveaway-feed/");
    expect(liveSource).not.toMatch(/currentPublicUrl\(\s*`\/api\/lives\/giveaway-feed\//);
  });
});
