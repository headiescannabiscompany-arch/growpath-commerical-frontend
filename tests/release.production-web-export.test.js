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
fs.writeFileSync(
  path.join(absoluteOutputDir, "index.html"),
  \`<!doctype html><html><head><title>GrowPath</title></head><body><div id="root"></div><noscript></noscript><script src="/_expo/static/js/web/index-stable.js"></script><script>window.__apiBase = "\${apiUrl}";</script></body></html>\`
);
fs.writeFileSync(
  path.join(absoluteOutputDir, "_expo", "static", "js", "web", "index-stable.js"),
  \`window.__apiBase = "\${apiUrl}";\`
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

function runExport(tempRoot, env = {}) {
  return spawnSync(
    process.execPath,
    [path.join(tempRoot, "scripts", "export-production-web.cjs")],
    {
      cwd: tempRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        EXPO_PUBLIC_API_URL: "",
        ...env
      }
    }
  );
}

describe("production web export", () => {
  it("falls back to the production API host when the env is malformed", () => {
    const tempRoot = createExportRoot();

    const result = runExport(tempRoot, {
      EXPO_PUBLIC_API_URL: "https://"
    });

    expect(result.status).toBe(0);
    expect(result.stderr).toMatch(/Using fallback EXPO_PUBLIC_API_URL/);

    const indexHtml = fs.readFileSync(path.join(tempRoot, "dist", "index.html"), "utf8");
    expect(indexHtml).toContain("https://api.growpathai.com");
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
  });
});
