// Builds the existing component with installed Metro; loopback-only, no API access.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const Metro = require("metro");
const root = path.resolve(__dirname, "../..");
const output = path.join(root, "dist-r08-long-story-local-20261009");

async function main() {
  process.env.EXPO_NO_TELEMETRY = "1";
  process.env.EXPO_PUBLIC_API_URL = "http://127.0.0.1:1";
  process.env.NODE_ENV = "production";
  const config = require(path.join(root, "metro.config.cjs"));
  config.maxWorkers = 1;
  config.watchFolders = [root, ...config.watchFolders];
  config.resetCache = true;
  config.resolver.useWatchman = false;
  config.resolver.resolverMainFields = ["browser", "module", "main"];
  config.resolver.unstable_conditionNames = ["browser", "require"];
  config.resolver.resolveRequest = (context, name, platform) =>
    context.resolveRequest(
      { ...context, preferNativePlatform: false },
      name.startsWith("@/")
        ? path.join(root, "src", name.slice(2))
        : name === "react-native"
          ? "react-native-web"
          : name,
      platform
    );
  fs.mkdirSync(output, { recursive: true });
  await Metro.runBuild(config, {
    entry: "scripts/qa/timeline-long-story.tsx",
    platform: "web",
    dev: false,
    minify: false,
    out: path.join(output, "fixture.js")
  });
  const html =
    '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Local synthetic timeline QA</title><style>html,body,#root{margin:0;min-height:100%;width:100%}body{background:#f2f7f3}#root{display:flex;flex-direction:column}</style></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>';
  const server = http.createServer((req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; base-uri 'none'; form-action 'none'"
    );
    if (req.url === "/") {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(html);
    } else if (req.url === "/fixture.js") {
      res.setHeader("Content-Type", "text/javascript; charset=utf-8");
      fs.createReadStream(path.join(output, "fixture.js")).pipe(res);
    } else {
      res.writeHead(404).end();
    }
  });
  server.listen(4179, "127.0.0.1", () =>
    console.log("LOCAL_TIMELINE_QA http://127.0.0.1:4179")
  );
  process.on("SIGINT", () => server.close(() => process.exit(0)));
  process.on("SIGTERM", () => server.close(() => process.exit(0)));
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
