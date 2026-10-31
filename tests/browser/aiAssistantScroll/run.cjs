// One bounded local browser fixture; no app export or live connection.
"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  http = require("node:http");
const net = require("node:net"),
  tls = require("node:tls"),
  dgram = require("node:dgram");
const assert = require("node:assert/strict"),
  crypto = require("node:crypto");
const root = path.resolve(__dirname, "../../..");
const workRoot = path.resolve(root, "..");
process.env.EXPO_OFFLINE = "1";
process.env.EXPO_NO_TELEMETRY = "1";
process.env.CI = "1";
const deny = () => {
  throw new Error("Outbound network excluded from AI scroll fixture");
};
net.connect =
  net.createConnection =
  net.Socket.prototype.connect =
  tls.connect =
  global.fetch =
    deny;
dgram.Socket.prototype.connect = dgram.Socket.prototype.send = deny;
const sourceFiles = [
  "src/app/home/personal/(tabs)/ai/index.tsx",
  "src/components/media/MediaEvidencePicker.tsx"
];
const hashes = Object.fromEntries(
  sourceFiles.map((file) => [
    file,
    crypto
      .createHash("sha256")
      .update(fs.readFileSync(path.join(root, file)))
      .digest("hex")
  ])
);
let folder,
  server,
  deadline,
  stopping = false;
function cleanup(code = 0) {
  if (stopping) return;
  stopping = true;
  clearTimeout(deadline);
  const finish = () => {
    if (folder) {
      const actual = fs.realpathSync(folder);
      assert.equal(
        path.dirname(actual).toLowerCase(),
        fs.realpathSync(workRoot).toLowerCase()
      );
      assert.ok(path.basename(actual).startsWith("ai-scroll-browser-"));
      assert.equal(fs.lstatSync(actual).isSymbolicLink(), false);
      fs.rmSync(actual, { recursive: true, force: true });
    }
    console.log(
      JSON.stringify({
        stopped: true,
        temporaryOutputRemoved: !folder || !fs.existsSync(folder)
      })
    );
    process.exit(code);
  };
  if (server?.listening) {
    server.close(finish);
    server.closeAllConnections();
  } else finish();
}
process.once("SIGINT", () => cleanup());
process.once("SIGTERM", () => cleanup());
process.stdin.setEncoding("utf8");
process.stdin.on("data", (value) => {
  if (value.trim() === "stop") cleanup();
});
(async () => {
  let script;
  if (process.argv[2] === "--serve-bundle") {
    const bundle = fs.realpathSync(process.argv[3]);
    const parent = path.dirname(bundle);
    assert.equal(
      path.dirname(parent).toLowerCase(),
      fs.realpathSync(workRoot).toLowerCase()
    );
    assert.ok(path.basename(parent).startsWith("ai-scroll-browser-"));
    assert.equal(path.basename(bundle), "fixture.js");
    assert.equal(fs.lstatSync(parent).isSymbolicLink(), false);
    script = fs.readFileSync(bundle);
    assert.equal(
      crypto.createHash("sha256").update(script).digest("hex"),
      process.argv[4]
    );
    deadline = setTimeout(() => cleanup(), 20 * 60 * 1000);
  } else {
    folder = fs.mkdtempSync(path.join(workRoot, "ai-scroll-browser-"));
    deadline = setTimeout(() => cleanup(), 20 * 60 * 1000);
    const { getDefaultConfig } = require("expo/metro-config");
    const { FileStore } = require("metro-cache");
    const Metro = require("metro");
    const config = getDefaultConfig(root);
    config.maxWorkers = 1;
    config.cacheStores = [new FileStore({ root: path.join(folder, "cache") })];
    config.watchFolders = [root, fs.realpathSync(path.join(root, "node_modules"))];
    config.fileMapCacheDirectory = path.join(folder, "file-map");
    fs.mkdirSync(config.fileMapCacheDirectory);
    config.resolver.useWatchman = false;
    config.watcher = { ...config.watcher, healthCheck: { enabled: false } };
    const seam = path.join(__dirname, "services.tsx");
    config.resolver.resolveRequest = (ctx, name, platform) => {
      if (name === "react-native") name = "react-native-web";
      if (name === "@react-native-async-storage/async-storage")
        return { type: "sourceFile", filePath: path.join(__dirname, "storage.ts") };
      if (
        name.startsWith("@/api/") ||
        name === "@/ai/toolRegistry" ||
        name === "@/components/feed/PersonalFeedPlacement" ||
        name === "@/utils/locationSearch" ||
        name === "expo-router" ||
        name === "expo-image-picker"
      )
        return { type: "sourceFile", filePath: seam };
      if (name.startsWith("@/")) name = path.join(root, "src", name.slice(2));
      return ctx.resolveRequest(ctx, name, platform);
    };
    assert.equal(
      config.resolver.resolveRequest({}, "@/api/personalAssistant", "web").filePath,
      seam
    );
    assert.equal(
      config.resolver.resolveRequest({}, "@/api/uploads", "web").filePath,
      seam
    );
    const bundle = path.join(folder, "fixture.js");
    await Metro.runBuild(config, {
      entry: path.join(__dirname, "entry.tsx"),
      out: bundle,
      platform: "web",
      dev: false,
      minify: false,
      sourceMap: false
    });
    script = fs.readFileSync(bundle);
  }
  const html =
    '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Local AI Assistant mobile scroll</title><style>html,body,#root{height:100%;margin:0;overflow:hidden}*{box-sizing:border-box}body{font:14px system-ui;color:#122012;background:#f1f7f2}#root{display:flex;flex-direction:column}header{flex:none;height:64px;padding:14px;background:white;font-weight:700}main{display:flex;flex:1;min-height:0}footer{flex:none;height:72px;padding:8px;background:white;border-top:1px solid #ccc}output{display:block;font-size:11px}</style></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>';
  server = http.createServer((req, res) => {
    if (
      req.method !== "GET" ||
      req.headers.host !== "127.0.0.1:" + server.address().port
    ) {
      res.writeHead(403).end();
      return;
    }
    res.setHeader("Cache-Control", "no-store");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'none'; img-src data:; frame-ancestors 'none'; form-action 'none'"
    );
    if (req.url === "/") {
      res.setHeader("Content-Type", "text/html");
      res.end(html);
    } else if (req.url === "/fixture.js") {
      res.setHeader("Content-Type", "application/javascript");
      res.end(script);
    } else res.writeHead(404).end();
  });
  server.listen(0, "127.0.0.1", () =>
    console.log(
      JSON.stringify({
        url: "http://127.0.0.1:" + server.address().port,
        sourceHashes: hashes,
        temporaryDirectory: folder,
        externalAccess: "blocked",
        deadlineMinutes: 20
      })
    )
  );
})().catch((error) => {
  console.error(error);
  cleanup(1);
});
