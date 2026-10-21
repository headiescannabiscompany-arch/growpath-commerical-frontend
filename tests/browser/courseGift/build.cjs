"use strict";
// Opt-in isolated fixture build, never an Expo app/export or release command.
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const inherited = process.env;
const support = process.argv.includes("--support");
const fixtureDir = support
  ? path.resolve(__dirname, "../courseCheckoutSupport")
  : __dirname;
process.env = Object.fromEntries(
  ["SystemRoot", "WINDIR", "PATH", "TEMP", "TMP"]
    .filter((key) => inherited[key] !== undefined)
    .map((key) => [key, inherited[key]])
);
process.env.NODE_ENV = "test";
const root = path.resolve(__dirname, "../../..");
const { getDefaultConfig } = require("expo/metro-config");
const Metro = require("metro");
async function main() {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "growpath-gift-browser-bundle-"));
  const config = getDefaultConfig(root);
  // runBuild consumes a normalized config; unlike the Expo CLI it does not add
  // projectRoot to watchFolders for us.
  config.watchFolders = [
    root,
    fs.realpathSync(path.join(root, "node_modules")),
    ...config.watchFolders
  ];
  config.maxWorkers = 1;
  // Keep the fixture's file map/transform cache separate from existing app builds.
  // A cached app graph does not necessarily include this new test-only entry.
  config.fileMapCacheDirectory = path.join(folder, "file-map");
  fs.mkdirSync(config.fileMapCacheDirectory);
  const { FileStore } = require("metro-cache");
  config.cacheStores = [new FileStore({ root: path.join(folder, "transforms") })];
  config.resolver.useWatchman = false;
  config.resetCache = false;
  config.resolver.resolveRequest = (context, name, platform) => {
    if (name === "expo-router") name = path.join(__dirname, "router.ts");
    if (name.startsWith("@/")) name = path.join(root, "src", name.slice(2));
    // Gift HTTP supplies an explicit synthetic Bearer token. Fail if a future
    // change accidentally reaches the app's real credential store.
    if (/(?:^|\/)auth\/tokenStore$/.test(name.replaceAll("\\", "/")))
      name = path.join(fixtureDir, "tokenStore.ts");
    // Explicit test-only software authenticator; never opens an OS/device prompt.
    if (support && name === "@simplewebauthn/browser")
      name = path.join(fixtureDir, "softwarePasskeys.ts");
    if (name === "react-native") name = "react-native-web";
    return context.resolveRequest(
      {
        ...context,
        preferNativePlatform: false,
        mainFields: ["browser", "module", "main"],
        unstable_conditionNames: ["browser", "require"]
      },
      name,
      platform
    );
  };
  try {
    await Metro.runBuild(config, {
      entry: path.join(fixtureDir, "entry.tsx"),
      out: path.join(folder, "fixture.js"),
      platform: "web",
      dev: false,
      minify: false,
      sourceMap: false
    });
    console.log(JSON.stringify({ bundle: path.join(folder, "fixture.js") }));
  } catch (error) {
    // Exact mkdtemp child only; never a computed repository or broad temp root.
    fs.rmSync(folder, { recursive: true, force: true });
    throw error;
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
